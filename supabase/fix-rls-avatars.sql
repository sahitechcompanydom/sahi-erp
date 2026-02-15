-- "new row violates row-level security policy" düzeltmesi
-- Supabase SQL Editor'da bu dosyanın TÜM İÇERİĞİNİ yapıştırıp çalıştırın.

-- ========== 1. PROFILES: Giriş yapan herkes her profil satırını güncelleyebilsin (admin başkasının avatar'ını kaydedebilsin)
-- ==========
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can update profiles" ON public.profiles;
CREATE POLICY "Authenticated can update profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ========== 2. STORAGE (avatars): Giriş yapan herkes yükleyebilsin
-- ========== Önce Storage → New bucket → avatars (Public) oluşturduğunuzdan emin olun.
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Admins can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated can upload avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Admins can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update avatars" ON storage.objects;
CREATE POLICY "Authenticated can update avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars')
  WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Admins can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete avatars" ON storage.objects;
CREATE POLICY "Authenticated can delete avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars');
