
-- 1. New columns for merchant_banks
ALTER TABLE public.merchant_banks
  ADD COLUMN IF NOT EXISTS fee_weight numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_settlement_seconds integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS health_status text NOT NULL DEFAULT 'healthy'
    CHECK (health_status IN ('healthy','degraded','down')),
  ADD COLUMN IF NOT EXISTS last_health_check_at timestamptz;

-- 2. pick_best_bank_v2 — scoring-based selection
CREATE OR REPLACE FUNCTION public.pick_best_bank_v2(p_merchant_id uuid, p_amount numeric DEFAULT 0)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Choose the bank with the LOWEST score (lower = better).
  -- score = priority*10 + fee_weight + (avg_settlement_seconds/10) - headroom_ratio*5
  -- headroom_ratio = (daily_limit - used) / daily_limit  (0 when unlimited => 0.5 neutral)
  SELECT id INTO v_id
  FROM (
    SELECT
      b.id,
      (b.priority * 10)
      + b.fee_weight
      + (b.avg_settlement_seconds::numeric / 10)
      - (CASE
          WHEN b.daily_limit IS NULL OR b.daily_limit = 0 THEN 0.5
          ELSE GREATEST(
            0,
            (b.daily_limit - (CASE WHEN b.last_reset_date < CURRENT_DATE
                                    THEN 0 ELSE b.current_daily_received END))
            / b.daily_limit::numeric
          )
        END) * 5 AS score
    FROM public.merchant_banks b
    WHERE b.merchant_id = p_merchant_id
      AND b.auto_route_enabled = true
      AND b.health_status <> 'down'
      AND (
        b.daily_limit IS NULL
        OR (CASE WHEN b.last_reset_date < CURRENT_DATE THEN 0
                 ELSE b.current_daily_received END) + p_amount <= b.daily_limit
      )
  ) s
  ORDER BY score ASC
  LIMIT 1;

  -- Fallback: any bank (legacy behavior)
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.merchant_banks
    WHERE merchant_id = p_merchant_id
    ORDER BY is_default DESC, created_at ASC
    LIMIT 1;
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.pick_best_bank_v2(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pick_best_bank_v2(uuid, numeric) TO authenticated, service_role;

-- 3. simulate_bank_routing — Routing Playground: return per-bank scores + winner
CREATE OR REPLACE FUNCTION public.simulate_bank_routing(p_amount numeric DEFAULT 0)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mid UUID;
  v_rows JSON;
  v_winner UUID;
BEGIN
  SELECT id INTO v_mid FROM public.merchants WHERE auth_user_id = auth.uid() LIMIT 1;
  IF v_mid IS NULL THEN
    RETURN json_build_object('error','no_merchant');
  END IF;

  v_winner := public.pick_best_bank_v2(v_mid, p_amount);

  SELECT json_agg(row_to_json(x) ORDER BY x.score ASC NULLS LAST)
  INTO v_rows
  FROM (
    SELECT
      b.id,
      b.bank_name,
      b.bank_account_number,
      b.bank_account_name,
      b.priority,
      b.fee_weight,
      b.avg_settlement_seconds,
      b.health_status,
      b.auto_route_enabled,
      b.daily_limit,
      (CASE WHEN b.last_reset_date < CURRENT_DATE THEN 0
            ELSE b.current_daily_received END) AS today_received,
      -- Same formula as pick_best_bank_v2
      CASE
        WHEN b.auto_route_enabled = false OR b.health_status = 'down' THEN NULL
        WHEN b.daily_limit IS NOT NULL
             AND (CASE WHEN b.last_reset_date < CURRENT_DATE THEN 0
                       ELSE b.current_daily_received END) + p_amount > b.daily_limit THEN NULL
        ELSE
          (b.priority * 10)
          + b.fee_weight
          + (b.avg_settlement_seconds::numeric / 10)
          - (CASE
              WHEN b.daily_limit IS NULL OR b.daily_limit = 0 THEN 0.5
              ELSE GREATEST(
                0,
                (b.daily_limit - (CASE WHEN b.last_reset_date < CURRENT_DATE
                                        THEN 0 ELSE b.current_daily_received END))
                / b.daily_limit::numeric
              )
            END) * 5
      END AS score,
      CASE
        WHEN b.auto_route_enabled = false THEN 'auto_route_off'
        WHEN b.health_status = 'down' THEN 'health_down'
        WHEN b.daily_limit IS NOT NULL
             AND (CASE WHEN b.last_reset_date < CURRENT_DATE THEN 0
                       ELSE b.current_daily_received END) + p_amount > b.daily_limit
          THEN 'daily_limit_exceeded'
        ELSE 'eligible'
      END AS eligibility,
      (b.id = v_winner) AS is_winner
    FROM public.merchant_banks b
    WHERE b.merchant_id = v_mid
  ) x;

  RETURN json_build_object(
    'amount', p_amount,
    'winner_id', v_winner,
    'banks', COALESCE(v_rows, '[]'::json)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.simulate_bank_routing(numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.simulate_bank_routing(numeric) TO authenticated, service_role;

-- 4. mark_bank_health — for cron/webhook to flag degraded/down banks
CREATE OR REPLACE FUNCTION public.mark_bank_health(p_bank_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_status NOT IN ('healthy','degraded','down') THEN
    RAISE EXCEPTION 'Invalid health status';
  END IF;
  UPDATE public.merchant_banks
    SET health_status = p_status,
        last_health_check_at = now(),
        updated_at = now()
    WHERE id = p_bank_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_bank_health(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_bank_health(uuid, text) TO authenticated, service_role;

-- 5. update_bank_routing_v2 — merchant tuning of fee_weight and avg_settlement_seconds
CREATE OR REPLACE FUNCTION public.update_bank_routing_v2(
  p_bank_id uuid,
  p_priority integer DEFAULT NULL,
  p_daily_limit numeric DEFAULT NULL,
  p_auto_route boolean DEFAULT NULL,
  p_fee_weight numeric DEFAULT NULL,
  p_avg_settlement_seconds integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_mid UUID;
BEGIN
  SELECT id INTO v_mid FROM public.merchants WHERE auth_user_id = auth.uid() LIMIT 1;
  IF v_mid IS NULL THEN RAISE EXCEPTION 'No merchant'; END IF;
  UPDATE public.merchant_banks SET
    priority = COALESCE(p_priority, priority),
    daily_limit = COALESCE(p_daily_limit, daily_limit),
    auto_route_enabled = COALESCE(p_auto_route, auto_route_enabled),
    fee_weight = COALESCE(p_fee_weight, fee_weight),
    avg_settlement_seconds = COALESCE(p_avg_settlement_seconds, avg_settlement_seconds),
    updated_at = now()
  WHERE id = p_bank_id AND merchant_id = v_mid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bank not found or access denied'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_bank_routing_v2(uuid, integer, numeric, boolean, numeric, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_bank_routing_v2(uuid, integer, numeric, boolean, numeric, integer) TO authenticated, service_role;
