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
      .select("title, description, priority, due_date")
      .eq("id", taskId)
      .single();
    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const taskTitle = task.title;
    const priority = task.priority || "Medium";
    const taskDescription = sanitizeTaskDescription(task.description);

    const credentials = await getWhatsAppCredentials(supabase);
    const { data: settingsRow } = await supabase
      .from("system_settings")
      .select("template_onboarding, template_task_assigned, template_watcher, template_task_updated")
      .limit(1)
      .maybeSingle();
    const settings = settingsRow as SystemSettingsWhatsApp | null;
    if (!credentials || !settings) {
      return NextResponse.json({ ok: true, sent: 0, skipped: "whatsapp_not_configured" });
    }

    const allProfileIds = [...new Set([...assigneeIds, ...watcherIds])];
    if (allProfileIds.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone")
      .in("id", allProfileIds);
    const profilesMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const assigneeNames = assigneeIds
      .map((id) => profilesMap.get(id))
      .map((p) => p?.full_name || p?.email || "—")
      .filter(Boolean);
    const assigneeNameList = assigneeNames.length > 0 ? assigneeNames.join(", ") : "Unassigned";

    const taskAssignedTemplate =
      getTemplateByName(settings, "task_assigned") ??
      "Hi {{name}}, new task: {{task_title}}. Priority: {{priority}}.";
    const watcherTemplate =
      getTemplateByName(settings, "task_watcher") ??
      "Note: Task {{task_title}} is updated. Assigned to: {{assignee}}.";

    let sent = 0;

    for (const profileId of assigneeIds) {
      const already = await supabase
        .from("notification_log")
        .select("id")
        .eq("task_id", taskId)
        .eq("profile_id", profileId)
        .eq("kind", "task_assignee")
        .maybeSingle();
      if (already.data) continue;

      const p = profilesMap.get(profileId);
      const phone = p?.phone ? formatPhoneForWhatsApp(p.phone) : null;
      if (!phone) continue;

      try {
        const message = replacePlaceholders(taskAssignedTemplate, {
          name: p?.full_name || p?.email || "there",
          task_title: taskTitle,
          task_description: taskDescription,
          priority,
        });
        await sendViaUltraMsg(
          credentials.instanceId,
          credentials.token,
          phone,
          message
        );
        await supabase.from("notification_log").insert({
          kind: "task_assignee",
          profile_id: profileId,
          task_id: taskId,
        });
        sent++;
      } catch (err) {
        console.error("[WhatsApp task assignee]", profileId, err);
      }
    }

    for (const profileId of watcherIds) {
      const already = await supabase
        .from("notification_log")
        .select("id")
        .eq("task_id", taskId)
        .eq("profile_id", profileId)
        .eq("kind", "task_watcher")
        .maybeSingle();
      if (already.data) continue;

      const p = profilesMap.get(profileId);
      const phone = p?.phone ? formatPhoneForWhatsApp(p.phone) : null;
      if (!phone) continue;

      try {
        const message = replacePlaceholders(watcherTemplate, {
          task_title: taskTitle,
          task_description: taskDescription,
          assignee: assigneeNameList,
        });
        await sendViaUltraMsg(
          credentials.instanceId,
          credentials.token,
          phone,
          message
        );
        await supabase.from("notification_log").insert({
          kind: "task_watcher",
          profile_id: profileId,
          task_id: taskId,
        });
        sent++;
      } catch (err) {
        console.error("[WhatsApp task watcher]", profileId, err);
      }
    }

    return NextResponse.json({ ok: true, sent });
  } catch (e) {
    console.error("[WhatsApp task notifications]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to send WhatsApp" },
      { status: 500 }
    );
  }
}
