-- =============================================================================
-- Step 20: System Connectivity — add Supabase columns to system_settings
-- All connectivity keys stored in single system_settings row.
-- Run in Supabase Dashboard → SQL Editor
-- =============================================================================

ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS next_public_supabase_url TEXT,
  ADD COLUMN IF NOT EXISTS next_public_supabase_anon_key TEXT,
  ADD COLUMN IF NOT EXISTS supabase_service_role_key TEXT;

COMMENT ON COLUMN public.system_settings.next_public_supabase_url IS 'Supabase project URL (public).';
COMMENT ON COLUMN public.system_settings.next_public_supabase_anon_key IS 'Supabase anon key (public).';
COMMENT ON COLUMN public.system_settings.supabase_service_role_key IS 'Supabase service_role secret (admin only).';
