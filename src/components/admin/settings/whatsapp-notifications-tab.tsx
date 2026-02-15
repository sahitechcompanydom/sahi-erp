"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_ONBOARDING =
  "Hello {{name}}, welcome to Sahi! Your login: {{email}} / Pass: {{password}}";
const DEFAULT_TASK_ASSIGNED =
  "Hi {{name}}, new task: {{task_title}}. Priority: {{priority}}.";
const DEFAULT_WATCHER =
  "Note: Task {{task_title}} is updated. Assigned to: {{assignee}}.";
const DEFAULT_TASK_UPDATED =
  "Update: The task {{task_title}} has been modified. New Status: {{status}}.";

type SystemSettingsRow = {
  id: string;
  template_onboarding: string | null;
  template_task_assigned: string | null;
  template_watcher: string | null;
  template_task_updated: string | null;
};

export function WhatsAppNotificationsTab() {
  const queryClient = useQueryClient();
  const [templateOnboarding, setTemplateOnboarding] = useState(DEFAULT_ONBOARDING);
  const [templateTaskAssigned, setTemplateTaskAssigned] = useState(DEFAULT_TASK_ASSIGNED);
  const [templateWatcher, setTemplateWatcher] = useState(DEFAULT_WATCHER);
  const [templateTaskUpdated, setTemplateTaskUpdated] = useState(DEFAULT_TASK_UPDATED);

  const { data: row, isLoading } = useQuery({
    queryKey: ["system_settings", isSupabaseConfigured()],
    queryFn: async (): Promise<SystemSettingsRow | null> => {
      if (!isSupabaseConfigured()) return null;
      const supabase = createClient();
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as SystemSettingsRow | null;
    },
  });

  useEffect(() => {
    if (row) {
      setTemplateOnboarding(row.template_onboarding ?? DEFAULT_ONBOARDING);
      setTemplateTaskAssigned(row.template_task_assigned ?? DEFAULT_TASK_ASSIGNED);
      setTemplateWatcher(row.template_watcher ?? DEFAULT_WATCHER);
      setTemplateTaskUpdated(row.template_task_updated ?? DEFAULT_TASK_UPDATED);
    }
  }, [row]);

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      id?: string;
      template_onboarding: string | null;
      template_task_assigned: string | null;
      template_watcher: string | null;
      template_task_updated: string | null;
    }) => {
      const supabase = createClient();
      if (payload.id) {
        const { error } = await supabase
          .from("system_settings")
          .update({
            template_onboarding: payload.template_onboarding || null,
            template_task_assigned: payload.template_task_assigned || null,
            template_watcher: payload.template_watcher || null,
            template_task_updated: payload.template_task_updated || null,
          })
          .eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("system_settings").insert({
          template_onboarding: payload.template_onboarding || null,
          template_task_assigned: payload.template_task_assigned || null,
          template_watcher: payload.template_watcher || null,
          template_task_updated: payload.template_task_updated || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system_settings"] });
      toast.success("Settings saved");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to save");
    },
  });

  function handleSave() {
    updateMutation.mutate({
      id: row?.id,
      template_onboarding: templateOnboarding.trim() || null,
      template_task_assigned: templateTaskAssigned.trim() || null,
      template_watcher: templateWatcher.trim() || null,
      template_task_updated: templateTaskUpdated.trim() || null,
    });
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          WhatsApp & Notifications
        </CardTitle>
        <CardDescription>
          Message templates for WhatsApp (UltraMsg). Configure UltraMsg Instance ID and Token in the{" "}
          <strong>API & System Secrets</strong> tab. Placeholders: {"{{name}}"}, {"{{email}}"}, {"{{task_title}}"}, {"{{task_description}}"}, {"{{priority}}"}, {"{{status}}"}, {"{{assignee}}"}, {"{{password}}"}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Templates</h4>
          <div className="grid gap-2">
            <Label htmlFor="tpl-onboarding">Onboarding template</Label>
            <Textarea
              id="tpl-onboarding"
              value={templateOnboarding}
              onChange={(e) => setTemplateOnboarding(e.target.value)}
              rows={3}
              className="font-mono text-sm"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tpl-task">Task assigned template</Label>
            <Textarea
              id="tpl-task"
              value={templateTaskAssigned}
              onChange={(e) => setTemplateTaskAssigned(e.target.value)}
              rows={2}
              className="font-mono text-sm"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tpl-watcher">Watcher notification template</Label>
            <Textarea
              id="tpl-watcher"
              value={templateWatcher}
              onChange={(e) => setTemplateWatcher(e.target.value)}
              rows={2}
              className="font-mono text-sm"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tpl-task-updated">Task updated template</Label>
            <Textarea
              id="tpl-task-updated"
              value={templateTaskUpdated}
              onChange={(e) => setTemplateTaskUpdated(e.target.value)}
              rows={2}
              className="font-mono text-sm"
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving…" : "Save settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
