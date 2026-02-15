import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MASK = "••••••••";

/**
 * GET: List api_configurations. Secret values are masked. Admin only.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user: caller },
    } = await supabase.auth.getUser();
    if (!caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();
    if ((profile as { role?: string } | null)?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("api_configurations")
      .select("key_name, key_value, is_secret, updated_at")
      .order("key_name");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const list = (data ?? []).map((row: { key_name: string; key_value: string; is_secret: boolean; updated_at: string }) => ({
      key_name: row.key_name,
      key_value: row.is_secret ? MASK : row.key_value,
      is_secret: row.is_secret,
      updated_at: row.updated_at,
    }));
    return NextResponse.json(list);
  } catch (e) {
    console.error("[api-configurations GET]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}

/**
 * POST: Upsert one key. Body: { key_name, key_value, is_secret }.
 * Admin only.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: caller },
    } = await supabase.auth.getUser();
    if (!caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();
    if ((profile as { role?: string } | null)?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const key_name = typeof body?.key_name === "string" ? body.key_name.trim() : "";
    let key_value = typeof body?.key_value === "string" ? body.key_value : "";
    const is_secret = Boolean(body?.is_secret);
    if (!key_name) {
      return NextResponse.json({ error: "key_name required" }, { status: 400 });
    }
    if (key_value === MASK && is_secret) {
      const { data: existing } = await supabase
        .from("api_configurations")
        .select("key_value")
        .eq("key_name", key_name)
        .maybeSingle();
      const existingValue = (existing as { key_value?: string } | null)?.key_value;
      if (existingValue) key_value = existingValue;
    }

    const { error } = await supabase.from("api_configurations").upsert(
      { key_name, key_value, is_secret },
      { onConflict: "key_name" }
    );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api-configurations POST]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
