-- STEP 11: WhatsApp notification log (prevent duplicate sends)
-- Run in Supabase SQL Editor after base schema.

CREATE TABLE IF NOT EXISTS public.notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('onboarding', 'task_assignee', 'task_watcher')),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Onboarding: only one send per profile (task_id is NULL; NULLs are distinct in UNIQUE so we use partial index)
CREATE UNIQUE INDEX IF NOT EXISTS notification_log_onboarding_unique
  ON public.notification_log (profile_id) WHERE kind = 'onboarding';

-- Task notifications: one send per (task, profile, kind)
CREATE UNIQUE INDEX IF NOT EXISTS notification_log_task_unique
  ON public.notification_log (task_id, profile_id, kind) WHERE task_id IS NOT NULL;

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can manage notification_log" ON public.notification_log;
CREATE POLICY "Authenticated can manage notification_log"
  ON public.notification_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
