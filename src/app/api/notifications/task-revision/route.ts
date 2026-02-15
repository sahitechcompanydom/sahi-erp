import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWhatsAppCredentials } from "@/lib/api-config";
import { formatPhoneForWhatsApp, sendViaUltraMsg } from "@/lib/whatsapp";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const taskId = body?.taskId as string | undefined;
    const feedback = (body?.feedback ?? "") as string;

    if (!taskId) {
      return NextResponse.json({ error: "taskId required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("title")
      .eq("id", taskId)
      .single();
    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const { data: assignments } = await supabase
      .from("task_assignments")
      .select("profile_id")
      .eq("task_id", taskId);
    const assigneeIds = (assignments ?? []).map((r: { profile_id: string }) => r.profile_id);
    const { data: taskRow } = await supabase.from("tasks").select("assignee_id").eq("id", taskId).single();
    const legacyAssignee = (taskRow as { assignee_id: string | null } | null)?.assignee_id;
    const allAssigneeIds = assigneeIds.length ? assigneeIds : legacyAssignee ? [legacyAssignee] : [];

    if (allAssigneeIds.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    const credentials = await getWhatsAppCredentials(supabase);
    if (!credentials) {
      return NextResponse.json({ ok: true, sent: 0, skipped: "whatsapp_not_configured" });
    }

    const taskTitle = task.title;
    const message = `Your task "${taskTitle}" requires revision. Admin Note: ${feedback}`;

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, phone")
      .in("id", allAssigneeIds);

    let sent = 0;
    for (const p of profiles ?? []) {
      const phone = (p as { id: string; phone: string | null }).phone
        ? formatPhoneForWhatsApp((p as { phone: string }).phone)
        : null;
      if (!phone) continue;
      try {
        await sendViaUltraMsg(
          credentials.instanceId,
          credentials.token,
          phone,
          message
        );
        sent++;
      } catch (err) {
        console.error("[WhatsApp task-revision]", (p as { id: string }).id, err);
      }
    }

    return NextResponse.json({ ok: true, sent });
  } catch (e) {
    console.error("[WhatsApp task-revision]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to send WhatsApp" },
      { status: 500 }
    );
  }
}
