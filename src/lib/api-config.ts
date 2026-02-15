/**
 * Server-only: fetch API keys from system_settings table (single row).
 * Use only in Server Components, Server Actions, or API routes.
 * Caller must pass an authenticated Supabase client (e.g. from createClient() after admin check).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { API_CONFIG_KEYS } from "./api-config-keys";

const KEY_TO_COLUMN: Record<string, string> = {
  [API_CONFIG_KEYS.NEXT_PUBLIC_SUPABASE_URL]: "next_public_supabase_url",
  [API_CONFIG_KEYS.NEXT_PUBLIC_SUPABASE_ANON_KEY]: "next_public_supabase_anon_key",
  [API_CONFIG_KEYS.SUPABASE_SERVICE_ROLE_KEY]: "supabase_service_role_key",
  [API_CONFIG_KEYS.WHATSAPP_INSTANCE_ID]: "whatsapp_instance_id",
  [API_CONFIG_KEYS.WHATSAPP_TOKEN]: "whatsapp_token",
  [API_CONFIG_KEYS.ULTRAMSG_TOKEN]: "whatsapp_token",
};

/**
 * Returns the value for the given key from system_settings (single row).
 * Only call from server. RLS restricts to authenticated; admin operations should verify admin role.
 */
export async function getSystemKey(
  supabase: SupabaseClient,
  keyName: string
): Promise<string | null> {
  const column = KEY_TO_COLUMN[keyName];
  if (!column) {
    console.error("[api-config] getSystemKey unknown key", keyName);
    return null;
  }
  const { data, error } = await supabase
    .from("system_settings")
    .select(column)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[api-config] getSystemKey", keyName, error.message);
    return null;
  }
  const value = (data as Record<string, unknown> | null)?.[column];
  return typeof value === "string" ? value.trim() || null : null;
}

export { API_CONFIG_KEYS } from "./api-config-keys";

export type WhatsAppCredentials = { instanceId: string; token: string };

/**
 * Fetches UltraMsg instance ID and token from system_settings.
 * Returns null if either is missing. Server-only.
 */
export async function getWhatsAppCredentials(
  supabase: SupabaseClient
): Promise<WhatsAppCredentials | null> {
  const [instanceId, token] = await Promise.all([
    getSystemKey(supabase, API_CONFIG_KEYS.WHATSAPP_INSTANCE_ID),
    getSystemKey(supabase, API_CONFIG_KEYS.ULTRAMSG_TOKEN),
  ]);
  if (!instanceId || !token) return null;
  return { instanceId, token };
}
