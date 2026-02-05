-- Add webhook_url column to merchants table
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS webhook_url text;

-- Add webhook_enabled column to control webhook notifications
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS webhook_enabled boolean DEFAULT false;