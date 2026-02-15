-- STEP 15: Revision loop & feedback (send back for revision)
-- Run in Supabase SQL Editor.

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS revision_notes TEXT;

COMMENT ON COLUMN public.tasks.revision_notes IS 'Appended feedback when task is sent back for revision (e.g. [DD/MM/YYYY Admin]: Note).';
