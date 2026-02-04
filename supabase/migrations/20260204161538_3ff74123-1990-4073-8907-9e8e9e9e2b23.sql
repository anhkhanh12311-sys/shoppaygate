-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can insert transactions via webhook" ON public.transactions;

-- Create a secure service role function for webhook to insert transactions
CREATE OR REPLACE FUNCTION public.insert_transaction_from_webhook(
  p_payment_link_id UUID,
  p_merchant_id UUID,
  p_amount NUMERIC,
  p_transfer_content TEXT,
  p_bank_reference TEXT,
  p_status TEXT,
  p_paid_at TIMESTAMP WITH TIME ZONE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  INSERT INTO public.transactions (
    payment_link_id,
    merchant_id,
    amount,
    transfer_content,
    bank_reference,
    status,
    paid_at
  ) VALUES (
    p_payment_link_id,
    p_merchant_id,
    p_amount,
    p_transfer_content,
    p_bank_reference,
    p_status,
    p_paid_at
  )
  RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$;