-- =============================================================================
-- Step 19: API configurations table (database-driven secrets)
-- Run in Supabase Dashboard → SQL Editor
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.api_configurations (
  key_name TEXT PRIMARY KEY,
  key_value TEXT NOT NULL DEFAULT '',
  is_secret BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.api_configurations IS 'API keys and system secrets (e.g. SUPABASE_SERVICE_ROLE, ULTRAMSG_TOKEN, WHATSAPP_INSTANCE_ID). Managed in Administration → Settings → API & System Secrets.';

ALTER TABLE public.api_configurations ENABLE ROW LEVEL SECURITY;

-- Only admins can read (needed for server-side getSystemKey after auth check)
DROP POLICY IF EXISTS "Admins read api_configurations" ON public.api_configurations;
CREATE POLICY "Admins read api_configurations"
  ON public.api_configurations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Only admins can insert/update
DROP POLICY IF EXISTS "Admins insert api_configurations" ON public.api_configurations;
CREATE POLICY "Admins insert api_configurations"
  ON public.api_configurations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins update api_configurations" ON public.api_configurations;
CREATE POLICY "Admins update api_configurations"
  ON public.api_configurations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (true);

-- Keep updated_at in sync
CREATE OR REPLACE FUNCTION public.set_api_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS api_configurations_updated_at ON public.api_configurations;
CREATE TRIGGER api_configurations_updated_at
  BEFORE UPDATE ON public.api_configurations
  FOR EACH ROW EXECUTE FUNCTION public.set_api_configurations_updated_at();

-- Optional: migrate existing WhatsApp credentials from system_settings (run once if you had them there)
-- INSERT INTO public.api_configurations (key_name, key_value, is_secret)
-- SELECT 'WHATSAPP_INSTANCE_ID', whatsapp_instance_id, false
--   FROM public.system_settings LIMIT 1
--   WHERE whatsapp_instance_id IS NOT NULL AND whatsapp_instance_id <> ''
-- ON CONFLICT (key_name) DO NOTHING;
-- INSERT INTO public.api_configurations (key_name, key_value, is_secret)
-- SELECT 'ULTRAMSG_TOKEN', whatsapp_token, true
--   FROM public.system_settings LIMIT 1
--   WHERE whatsapp_token IS NOT NULL AND whatsapp_token <> ''
-- ON CONFLICT (key_name) DO NOTHING;
