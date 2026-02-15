"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export type ConnectionStatus = "connected" | "disconnected" | "checking" | "not-configured";

export function useSupabaseHealth() {
  const configured = isSupabaseConfigured();

  const { data: status, isLoading } = useQuery({
    queryKey: ["supabase-health", configured],
    queryFn: async (): Promise<ConnectionStatus> => {
      if (!configured) return "not-configured";
      try {
        const supabase = createClient();
        const { error } = await supabase.from("profiles").select("id").limit(1).maybeSingle();
        if (error) return "disconnected";
        return "connected";
      } catch {
        return "disconnected";
      }
    },
    enabled: configured,
    staleTime: 30_000,
    retry: false,
  });

  const connectionStatus: ConnectionStatus =
    !configured ? "not-configured" : isLoading ? "checking" : status ?? "disconnected";

  return { connectionStatus, isConfigured: configured };
}
