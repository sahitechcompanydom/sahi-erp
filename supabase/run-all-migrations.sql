-- =============================================================================
-- DO NOT type or paste the filename "supabase/run-all-migrations.sql" in the
-- Supabase SQL Editor. That is a path, not SQL — it causes: syntax error at
-- or near "supabase".
--
-- WHAT TO DO: Open THIS file in your editor, select ALL (Ctrl+A / Cmd+A),
-- copy, then paste INTO the Supabase SQL Editor and click Run.
-- =============================================================================
--
-- Step 1: Create tables and RLS (001)
-- ============================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'chef', 'staff')),
  hire_date DATE,
  birth_date DATE,
  emergency_contact TEXT,
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Review Pending', 'Completed')),
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Tasks viewable by authenticated" ON public.tasks;
CREATE POLICY "Tasks viewable by authenticated"
  ON public.tasks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert tasks" ON public.tasks;
CREATE POLICY "Authenticated can insert tasks"
  ON public.tasks FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update tasks" ON public.tasks;
CREATE POLICY "Authenticated can update tasks"
  ON public.tasks FOR UPDATE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tasks_updated_at ON public.tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Step 2: Allow profiles without auth FK + allow insert for first-time login (002)
-- ============================================

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Authenticated can insert profiles"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Authenticated can update profiles"
  ON public.profiles FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can delete profiles" ON public.profiles;
CREATE POLICY "Authenticated can delete profiles"
  ON public.profiles FOR DELETE TO authenticated USING (true);
