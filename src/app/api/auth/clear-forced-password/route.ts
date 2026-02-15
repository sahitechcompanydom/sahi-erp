import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * After user has changed password, clear forced-change and temp password fields.
 * Call from /auth/update-password after auth.updateUser({ password }).
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        is_password_forced_change: false,
        temporary_password: null,
        temp_password_expires_at: null,
      })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[clear-forced-password]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
