import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWhatsAppCredentials } from "@/lib/api-config";
import {
  formatPhoneForWhatsApp,
  replacePlaceholders,
  sendViaUltraMsg,
  getTemplateByName,
  sanitizeTaskDescription,
  type SystemSettingsWhatsApp,
} from "@/lib/whatsapp";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const taskId = body?.taskId as string | undefined;
    const assigneeIds = (body?.assigneeIds ?? []) as string[];
    const watcherIds = (body?.watcherIds ?? []) as string[];

    if (!taskId) {
      return NextResponse.json({ error: "taskId required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("title, description, status")
      .eq("id", taskId)
      .single();
    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const taskTitle = task.title;
    const status = task.status || "—";
    const taskDescription = sanitizeTaskDescription(task.description);

    const credentials = await getWhatsAppCredentials(supabase);
    const { data: settingsRow } = await supabase
      .from("system_settings")
      .select("template_task_updated")
      .limit(1)
      .maybeSingle();
    const settings = settingsRow as SystemSettingsWhatsApp | null;
    if (!credentials || !settings) {
      return NextResponse.json({ ok: true, sent: 0, skipped: "whatsapp_not_configured" });
    }

    const template =
      getTemplateByName(settings, "task_updated") ??
      "Update: The task {{task_title}} has been modified. New Status: {{status}}.";

    const allIds = [...new Set([...assigneeIds, ...watcherIds])];
    if (allIds.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone")
      .in("id", allIds);
    const profilesMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    let sent = 0;
    const variables: Record<string, string> = {
      task_title: taskTitle,
      status,
      task_description: taskDescription,
    };

    for (const profileId of allIds) {
      const p = profilesMap.get(profileId);
      const phone = p?.phone ? formatPhoneForWhatsApp(p.phone) : null;
      if (!phone) continue;

      try {
        const message = replacePlaceholders(template, {
          ...variables,
          name: p?.full_name || p?.email || "there",
        });
        await sendViaUltraMsg(
          credentials.instanceId,
          credentials.token,
          phone,
          message
        );
        sent++;
      } catch (err) {
        console.error("[WhatsApp task updated]", profileId, err);
      }
    }

    return NextResponse.json({ ok: true, sent });
  } catch (e) {
    console.error("[WhatsApp task-updated]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to send WhatsApp" },
      { status: 500 }
    );
  }
}
