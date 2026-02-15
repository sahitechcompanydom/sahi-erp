-- Run this AFTER creating the "avatars" bucket in Supabase Dashboard:
-- Storage → New bucket → Name: avatars → Public: Yes → Create bucket
-- Then paste this file into SQL Editor and run.

-- Allow anyone to read (public bucket; optional, public URLs work without this)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Allow any authenticated user to upload to avatars (personnel form is admin-only in app).
-- Storage RLS subqueries to public.profiles can fail in some contexts, so we keep INSERT simple.
DROP POLICY IF EXISTS "Admins can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated can upload avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

-- Allow authenticated admins to update (replace) their uploaded avatars
DROP POLICY IF EXISTS "Admins can update avatars" ON storage.objects;
CREATE POLICY "Admins can update avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow authenticated admins to delete files in avatars bucket
DROP POLICY IF EXISTS "Admins can delete avatars" ON storage.objects;
CREATE POLICY "Admins can delete avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
