-- Add Task Updated template column to existing system_settings (run once if table already exists)
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS template_task_updated TEXT;
UPDATE public.system_settings SET template_task_updated = 'Update: The task {{task_title}} has been modified. New Status: {{status}}.' WHERE template_task_updated IS NULL;
