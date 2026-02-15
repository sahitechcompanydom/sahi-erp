import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceRoleClient, ADMIN_CONFIG_MESSAGE } from "@/lib/supabase/server-admin";

/**
 * Resend credentials for a user: new temp password, 12h expiry, WhatsApp onboarding.
 * Admin only. Body: { profileId }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user: caller } } = await supabase.auth.getUser();
    if (!caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", caller.id).single();
    if ((profile as { role?: string } | null)?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const profileId = body?.profileId as string | undefined;
    if (!profileId) {
      return NextResponse.json({ error: "profileId required" }, { status: 400 });
    }

    const { data: target } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", profileId)
      .single();
    if (!target?.email) {
      return NextResponse.json({ error: "Profile not found or has no email" }, { status: 404 });
    }

    const newPassword = generateTempPassword();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 12);

    const admin = await getServiceRoleClient(supabase);
    if (!admin) {
      return NextResponse.json({ error: ADMIN_CONFIG_MESSAGE }, { status: 503 });
    }
    const { error: authError } = await admin.auth.admin.updateUserById(profileId, {
      password: newPassword,
    });
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        temporary_password: newPassword,
        temp_password_expires_at: expiresAt.toISOString(),
        is_password_forced_change: true,
      })
      .eq("id", profileId);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await supabase
      .from("notification_log")
      .delete()
      .eq("kind", "onboarding")
      .eq("profile_id", profileId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[resend-credentials]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}

function generateTempPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
