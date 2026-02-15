import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MASK = "••••••••";

type ConnectivityRow = {
  id: string;
  next_public_supabase_url: string | null;
  next_public_supabase_anon_key: string | null;
  supabase_service_role_key: string | null;
  whatsapp_instance_id: string | null;
  whatsapp_token: string | null;
};

/**
 * GET: Load system connectivity config. Secret values masked. Admin only.
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
      .from("system_settings")
      .select("id, next_public_supabase_url, next_public_supabase_anon_key, supabase_service_role_key, whatsapp_instance_id, whatsapp_token")
      .limit(1)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const row = data as ConnectivityRow | null;
    if (!row) {
      return NextResponse.json({
        id: null,
        next_public_supabase_url: "",
        next_public_supabase_anon_key: "",
        supabase_service_role_key: "",
        whatsapp_instance_id: "",
        whatsapp_token: "",
      });
    }
    return NextResponse.json({
      id: row.id,
      next_public_supabase_url: row.next_public_supabase_url ?? "",
      next_public_supabase_anon_key: row.next_public_supabase_anon_key ?? "",
      supabase_service_role_key: row.supabase_service_role_key ? MASK : "",
      whatsapp_instance_id: row.whatsapp_instance_id ?? "",
      whatsapp_token: row.whatsapp_token ? MASK : "",
    });
  } catch (e) {
    console.error("[system-connectivity GET]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}

/**
 * POST: Save all connectivity config. Body: all 5 fields (send MASK to keep existing secret).
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
    const id = body?.id as string | null | undefined;
    let next_public_supabase_url = typeof body?.next_public_supabase_url === "string" ? body.next_public_supabase_url.trim() : "";
    let next_public_supabase_anon_key = typeof body?.next_public_supabase_anon_key === "string" ? body.next_public_supabase_anon_key.trim() : "";
    let supabase_service_role_key = typeof body?.supabase_service_role_key === "string" ? body.supabase_service_role_key : "";
    let whatsapp_instance_id = typeof body?.whatsapp_instance_id === "string" ? body.whatsapp_instance_id.trim() : "";
    let whatsapp_token = typeof body?.whatsapp_token === "string" ? body.whatsapp_token : "";

    if (supabase_service_role_key === MASK && id) {
      const { data: existing } = await supabase
        .from("system_settings")
        .select("supabase_service_role_key")
        .eq("id", id)
        .maybeSingle();
      const v = (existing as { supabase_service_role_key?: string } | null)?.supabase_service_role_key;
      if (v) supabase_service_role_key = v;
    }
    if (whatsapp_token === MASK && id) {
      const { data: existing } = await supabase
        .from("system_settings")
        .select("whatsapp_token")
        .eq("id", id)
        .maybeSingle();
      const v = (existing as { whatsapp_token?: string } | null)?.whatsapp_token;
      if (v) whatsapp_token = v;
    }

    const payload = {
      next_public_supabase_url: next_public_supabase_url || null,
      next_public_supabase_anon_key: next_public_supabase_anon_key || null,
      supabase_service_role_key: supabase_service_role_key || null,
      whatsapp_instance_id: whatsapp_instance_id || null,
      whatsapp_token: whatsapp_token || null,
    };

    if (id) {
      const { error } = await supabase
        .from("system_settings")
        .update(payload)
        .eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await supabase.from("system_settings").insert(payload);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[system-connectivity POST]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
