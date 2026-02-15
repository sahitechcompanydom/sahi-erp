-- STEP 12: Wiki (Know-How) module
-- 1. Run this entire file in Supabase SQL Editor.
-- 2. Create the storage bucket: Dashboard → Storage → New bucket → name: wiki-content, Public: ON.
--    (Or via API: supabase.storage.createBucket('wiki-content', { public: true }) with service role.)

CREATE TABLE IF NOT EXISTS public.wiki_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('Network', 'Server', 'Software', 'Electrical')),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  media_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for list/filter
CREATE INDEX IF NOT EXISTS idx_wiki_articles_category ON public.wiki_articles(category);
CREATE INDEX IF NOT EXISTS idx_wiki_articles_updated_at ON public.wiki_articles(updated_at DESC);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_wiki_articles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wiki_articles_updated_at ON public.wiki_articles;
CREATE TRIGGER wiki_articles_updated_at
  BEFORE UPDATE ON public.wiki_articles
  FOR EACH ROW EXECUTE FUNCTION public.set_wiki_articles_updated_at();

ALTER TABLE public.wiki_articles ENABLE ROW LEVEL SECURITY;

-- SELECT: public read for everyone (authenticated and anon for public knowledge base)
DROP POLICY IF EXISTS "Wiki articles readable by all" ON public.wiki_articles;
CREATE POLICY "Wiki articles readable by all"
  ON public.wiki_articles FOR SELECT
  USING (true);

-- INSERT/UPDATE: authenticated users only
DROP POLICY IF EXISTS "Authenticated can insert wiki" ON public.wiki_articles;
CREATE POLICY "Authenticated can insert wiki"
  ON public.wiki_articles FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update wiki" ON public.wiki_articles;
CREATE POLICY "Authenticated can update wiki"
  ON public.wiki_articles FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE: admin only
DROP POLICY IF EXISTS "Only admins can delete wiki" ON public.wiki_articles;
CREATE POLICY "Only admins can delete wiki"
  ON public.wiki_articles FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- =============================================================================
-- Storage: RLS for bucket "wiki-content"
-- Create the bucket first: Dashboard → Storage → New bucket → name: wiki-content, Public: ON
-- =============================================================================

-- Public read (everyone can view files in wiki-content)
DROP POLICY IF EXISTS "wiki-content public read" ON storage.objects;
CREATE POLICY "wiki-content public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'wiki-content');

-- Authenticated upload
DROP POLICY IF EXISTS "wiki-content authenticated insert" ON storage.objects;
CREATE POLICY "wiki-content authenticated insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'wiki-content');

-- Authenticated update (overwrite)
DROP POLICY IF EXISTS "wiki-content authenticated update" ON storage.objects;
CREATE POLICY "wiki-content authenticated update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'wiki-content')
  WITH CHECK (bucket_id = 'wiki-content');

-- Delete: admin only
DROP POLICY IF EXISTS "wiki-content admin delete" ON storage.objects;
CREATE POLICY "wiki-content admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'wiki-content'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
