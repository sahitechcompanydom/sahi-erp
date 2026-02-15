import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const ULTRAMSG_BASE = "https://api.ultramsg.com";

/**
 * POST: Test connectivity. Body: { type: 'supabase-public' | 'supabase-admin' | 'whatsapp', ...credentials }.
 * Admin only. Credentials are not logged.
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
    const type = body?.type as string;

    if (type === "supabase-public") {
      const url = typeof body?.next_public_supabase_url === "string" ? body.next_public_supabase_url.trim() : "";
      const anonKey = typeof body?.next_public_supabase_anon_key === "string" ? body.next_public_supabase_anon_key.trim() : "";
      if (!url || !anonKey) {
        return NextResponse.json({ ok: false, error: "URL and anon key required" }, { status: 400 });
      }
      const client = createSupabaseClient(url, anonKey);
      const { error } = await client.from("profiles").select("id").limit(1).maybeSingle();
      if (error) {
        return NextResponse.json({ ok: false, error: error.message });
      }
      return NextResponse.json({ ok: true });
    }

    if (type === "supabase-admin") {
      const url = typeof body?.next_public_supabase_url === "string" ? body.next_public_supabase_url.trim() : "";
      const serviceKey = typeof body?.supabase_service_role_key === "string" ? body.supabase_service_role_key.trim() : "";
      if (!url || !serviceKey) {
        return NextResponse.json({ ok: false, error: "URL and service role key required" }, { status: 400 });
      }
      const client = createSupabaseClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { error } = await client.auth.admin.listUsers({ perPage: 1 });
      if (error) {
        return NextResponse.json({ ok: false, error: error.message });
      }
      return NextResponse.json({ ok: true });
    }

    if (type === "whatsapp") {
      const instanceId = typeof body?.whatsapp_instance_id === "string" ? body.whatsapp_instance_id.trim() : "";
      const token = typeof body?.whatsapp_token === "string" ? body.whatsapp_token.trim() : "";
      if (!instanceId || !token) {
        return NextResponse.json({ ok: false, error: "Instance ID and token required" }, { status: 400 });
      }
      const url = `${ULTRAMSG_BASE}/${instanceId}/instance/status?token=${encodeURIComponent(token)}`;
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({ ok: false, error: text.slice(0, 200) || `HTTP ${res.status}` });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "Unknown type" }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Connection failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
