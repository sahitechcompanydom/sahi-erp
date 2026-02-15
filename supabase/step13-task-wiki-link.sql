-- STEP 13: Link tasks to wiki articles (for "Convert to Wiki" flow)
-- Run in Supabase SQL Editor after step12-wiki-articles.

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS wiki_article_id UUID REFERENCES public.wiki_articles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_wiki_article_id ON public.tasks(wiki_article_id);
