-- Allow profiles to be created without auth (e.g. CRM personnel added by admin).
-- Run this if you want "Add Personnel" to work without Supabase Auth.
-- If you use Supabase Auth only, skip this and create users via Auth then sync to profiles.

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Allow any authenticated user to insert/update/delete for CRM usage (tighten RLS as needed)
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Authenticated can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Authenticated can update profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (true);
