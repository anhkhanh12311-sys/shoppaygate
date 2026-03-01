
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS webhook_api_key text;

-- Create index for fast API key lookups
CREATE INDEX IF NOT EXISTS idx_merchants_webhook_api_key ON public.merchants(webhook_api_key) WHERE webhook_api_key IS NOT NULL;
