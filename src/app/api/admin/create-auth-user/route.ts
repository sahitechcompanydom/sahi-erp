import { NextResponse } from "next/server";
import { getServiceRoleClient, ADMIN_CONFIG_MESSAGE } from "@/lib/supabase/server-admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Create an Auth user (for new personnel). Requires admin auth.
 * Body: { email, password }
 * Returns: { userId }
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
    const email = body?.email as string | undefined;
    const password = body?.password as string | undefined;
    if (!email?.trim() || !password) {
      return NextResponse.json({ error: "email and password required" }, { status: 400 });
    }

    const admin = await getServiceRoleClient(supabase);
    if (!admin) {
      return NextResponse.json({ error: ADMIN_CONFIG_MESSAGE }, { status: 503 });
    }
    const { data, error } = await admin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!data.user?.id) {
      return NextResponse.json({ error: "User creation failed" }, { status: 500 });
    }

    return NextResponse.json({ userId: data.user.id });
  } catch (e) {
    console.error("[create-auth-user]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create user" },
      { status: 500 }
    );
  }
}
