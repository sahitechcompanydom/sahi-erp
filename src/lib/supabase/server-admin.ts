import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSystemKey, API_CONFIG_KEYS } from "@/lib/api-config";

const ADMIN_CONFIG_MESSAGE =
  "Configure Supabase Admin (service role key) in Administration → Settings → System Connectivity.";

/**
 * Returns a service-role Supabase client, or null if the key is not set in api_configurations.
 * Use for admin-only operations (create/update Auth users). Call only from server with authenticated admin supabase client.
 */
export async function getServiceRoleClient(
  supabase: SupabaseClient
): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) return null;
  const key = await getSystemKey(supabase, API_CONFIG_KEYS.SUPABASE_SERVICE_ROLE_KEY);
  if (!key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Use when you need to throw; APIs should prefer getServiceRoleClient() and return 503 with ADMIN_CONFIG_MESSAGE. */
export async function createServiceRoleClient(
  supabase: SupabaseClient
): Promise<SupabaseClient> {
  const client = await getServiceRoleClient(supabase);
  if (!client) throw new Error(ADMIN_CONFIG_MESSAGE);
  return client;
}

export { ADMIN_CONFIG_MESSAGE };
