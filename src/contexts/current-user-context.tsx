"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

type CurrentUserContextValue = {
  profile: Profile | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
};

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setProfile(null);
      setIsLoading(false);
      return;
    }
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProfile(null);
        return;
      }
      let { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!data) {
        await supabase.from("profiles").upsert(
          {
            id: user.id,
            full_name: user.email ?? null,
            email: user.email ?? null,
            role: "staff",
            is_password_forced_change: false,
          },
          { onConflict: "id" }
        );
        const res = await supabase.from("profiles").select("*").eq("id", user.id).single();
        data = res.data;
      }
      setProfile(data as Profile | null);
    } catch {
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refetch();
    });
    return () => subscription.unsubscribe();
  }, [refetch]);

  return (
    <CurrentUserContext.Provider value={{ profile, isLoading, refetch }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext);
  return ctx ?? { profile: null, isLoading: false, refetch: async () => {} };
}
