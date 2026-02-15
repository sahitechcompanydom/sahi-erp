-- STEP 16: Temporary password & forced change
-- Run in Supabase SQL Editor.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS temporary_password TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS temp_password_expires_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_password_forced_change BOOLEAN DEFAULT true;

-- Existing users: do not force password change (only new personnel get forced change)
UPDATE public.profiles SET is_password_forced_change = false;

COMMENT ON COLUMN public.profiles.temporary_password IS 'Temporary password sent to user; cleared after they set a new password.';
COMMENT ON COLUMN public.profiles.temp_password_expires_at IS 'When the temporary password expires (e.g. 12 hours from creation).';
COMMENT ON COLUMN public.profiles.is_password_forced_change IS 'If true, user is redirected to /auth/update-password until they change password.';
