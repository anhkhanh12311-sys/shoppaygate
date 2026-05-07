ALTER TABLE public.payment_links REPLICA IDENTITY FULL;
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_links;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;