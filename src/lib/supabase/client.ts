import { createBrowserClient } from "@supabase/ssr";

const PLACEHOLDER_URL = "https://placeholder.supabase.co";

/** True when real Supabase URL and key are set. When false, we skip requests to avoid errors. */
export function isSupabaseConfigured(): boolean {
  if (typeof window === "undefined") return true;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasRealUrl = typeof url === "string" && url.length > 0 && url !== PLACEHOLDER_URL;
  const hasRealKey = typeof key === "string" && key.length > 20 && key !== "placeholder-anon-key";
  return hasRealUrl && hasRealKey;
}

/**
 * Creates the Supabase browser client.
 * Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from the environment
 * (set in .env.local and inlined at build/start time by Next.js).
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? PLACEHOLDER_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key";
  return createBrowserClient(url, key);
}
