import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWhatsAppCredentials } from "@/lib/api-config";
import {
  formatPhoneForWhatsApp,
  replacePlaceholders,
  sendViaUltraMsg,
  getTemplateByName,
  type SystemSettingsWhatsApp,
} from "@/lib/whatsapp";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const profileId = body?.profileId as string | undefined;
    if (!profileId) {
      return NextResponse.json({ error: "profileId required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("notification_log")
      .select("id")
      .eq("kind", "onboarding")
      .eq("profile_id", profileId)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ ok: true, skipped: "already_sent" });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, email, phone, temporary_password")
      .eq("id", profileId)
      .single();
    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const phone = formatPhoneForWhatsApp(profile.phone);
    if (!phone) {
      return NextResponse.json({ ok: true, skipped: "no_phone" });
    }

    const credentials = await getWhatsAppCredentials(supabase);
    const { data: settingsRow } = await supabase
      .from("system_settings")
      .select("template_onboarding, template_task_assigned, template_watcher, template_task_updated")
      .limit(1)
      .maybeSingle();
    const settings = settingsRow as SystemSettingsWhatsApp | null;
    if (!credentials || !settings) {
      return NextResponse.json({ ok: true, skipped: "whatsapp_not_configured" });
    }

    const passwordDisplay = (profile as { temporary_password?: string | null }).temporary_password
      ? (profile as { temporary_password: string }).temporary_password + ". Valid for 12 hours."
      : "Contact your administrator for initial login.";

    const template = getTemplateByName(settings, "onboarding");
    let message = replacePlaceholders(template ?? "Hello {{name}}, welcome! Login: {{email}} / Pass: {{password}}", {
      name: profile.full_name || "there",
      email: profile.email || "",
      password: passwordDisplay,
    });
    if ((profile as { temporary_password?: string | null }).temporary_password && !message.includes("12 hours")) {
      message += " Your temporary password is valid for 12 hours.";
    }

    await sendViaUltraMsg(
      credentials.instanceId,
      credentials.token,
      phone,
      message
    );

    await supabase.from("notification_log").insert({
      kind: "onboarding",
      profile_id: profileId,
      task_id: null,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[WhatsApp onboarding]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to send WhatsApp" },
      { status: 500 }
    );
  }
}
