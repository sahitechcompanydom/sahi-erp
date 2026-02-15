-- STEP 10: Teams, Multi-Assignee, Task Watchers
-- Run this AFTER your base schema (profiles, tasks) exists.
-- Paste into Supabase SQL Editor and run.

-- Teams
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  department TEXT,
  lead_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members (junction)
CREATE TABLE IF NOT EXISTS public.team_members (
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (team_id, profile_id)
);

-- Task assignees (multiple per task)
CREATE TABLE IF NOT EXISTS public.task_assignments (
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, profile_id)
);

-- Task watchers (CC / Inform)
CREATE TABLE IF NOT EXISTS public.task_watchers (
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, profile_id)
);

-- RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_watchers ENABLE ROW LEVEL SECURITY;

-- Teams: authenticated read; admin write
DROP POLICY IF EXISTS "Teams viewable by authenticated" ON public.teams;
CREATE POLICY "Teams viewable by authenticated" ON public.teams FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage teams" ON public.teams;
CREATE POLICY "Admins manage teams" ON public.teams FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Team members: authenticated read; admin write
DROP POLICY IF EXISTS "Team members viewable" ON public.team_members;
CREATE POLICY "Team members viewable" ON public.team_members FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage team members" ON public.team_members;
CREATE POLICY "Admins manage team members" ON public.team_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Task assignments: authenticated read/write (same as tasks)
DROP POLICY IF EXISTS "Task assignments viewable" ON public.task_assignments;
CREATE POLICY "Task assignments viewable" ON public.task_assignments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated manage task assignments" ON public.task_assignments;
CREATE POLICY "Authenticated manage task assignments" ON public.task_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Task watchers: same
DROP POLICY IF EXISTS "Task watchers viewable" ON public.task_watchers;
CREATE POLICY "Task watchers viewable" ON public.task_watchers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated manage task watchers" ON public.task_watchers;
CREATE POLICY "Authenticated manage task watchers" ON public.task_watchers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Backfill task_assignments from existing tasks.assignee_id
INSERT INTO public.task_assignments (task_id, profile_id)
  SELECT id, assignee_id FROM public.tasks WHERE assignee_id IS NOT NULL
  ON CONFLICT (task_id, profile_id) DO NOTHING;

-- Optional: updated_at trigger for teams
CREATE TRIGGER teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
