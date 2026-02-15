-- STEP 11: System settings for WhatsApp (UltraMsg) and message templates
-- Run in Supabase SQL Editor. Creates or replaces system_settings for one row.

CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_instance_id TEXT,
  whatsapp_token TEXT,
  template_onboarding TEXT,
  template_task_assigned TEXT,
  template_watcher TEXT,
  template_task_updated TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Single row ID for app (use this when reading/updating)
-- Insert default row if table is empty (run once)
INSERT INTO public.system_settings (
  whatsapp_instance_id,
  whatsapp_token,
  template_onboarding,
  template_task_assigned,
  template_watcher,
  template_task_updated
)
SELECT NULL, NULL,
  'Hello {{name}}, welcome to Sahi! Your login: {{email}} / Pass: {{password}}',
  'Hi {{name}}, new task: {{task_title}}. Priority: {{priority}}.',
  'Note: Task {{task_title}} is updated. Assigned to: {{assignee}}.',
  'Update: The task {{task_title}} has been modified. New Status: {{status}}.'
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings LIMIT 1);

-- If table already has no fixed id, use a trigger to enforce single row or just use first row
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read system_settings" ON public.system_settings;
CREATE POLICY "Authenticated read system_settings"
  ON public.system_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins update system_settings" ON public.system_settings;
CREATE POLICY "Admins update system_settings"
  ON public.system_settings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins insert system_settings" ON public.system_settings;
CREATE POLICY "Admins insert system_settings"
  ON public.system_settings FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Allow read for API (notification send needs to read instance_id, token, templates)
-- Already allowed by "Authenticated read"

CREATE OR REPLACE FUNCTION public.set_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS system_settings_updated_at ON public.system_settings;
CREATE TRIGGER system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_system_settings_updated_at();
