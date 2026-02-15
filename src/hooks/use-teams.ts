"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Team, TeamMember } from "@/types/database";
import type { Profile } from "@/types/database";

export function useTeams() {
  return useQuery({
    queryKey: ["teams", isSupabaseConfigured()],
    queryFn: async (): Promise<Team[]> => {
      if (!isSupabaseConfigured()) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Team[];
    },
  });
}

export function useTeamMembers(teamId: string | null) {
  return useQuery({
    queryKey: ["team-members", teamId, isSupabaseConfigured()],
    queryFn: async (): Promise<string[]> => {
      if (!teamId || !isSupabaseConfigured()) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("team_members")
        .select("profile_id")
        .eq("team_id", teamId);
      if (error) throw error;
      return (data ?? []).map((r) => r.profile_id);
    },
    enabled: !!teamId,
  });
}

export function useAllTeamMembersMap() {
  return useQuery({
    queryKey: ["team-members-map", isSupabaseConfigured()],
    queryFn: async (): Promise<Map<string, string[]>> => {
      if (!isSupabaseConfigured()) return new Map();
      const supabase = createClient();
      const { data, error } = await supabase.from("team_members").select("team_id, profile_id");
      if (error) throw error;
      const map = new Map<string, string[]>();
      (data ?? []).forEach((r: { team_id: string; profile_id: string }) => {
        const arr = map.get(r.team_id) ?? [];
        arr.push(r.profile_id);
        map.set(r.team_id, arr);
      });
      return map;
    },
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; department?: string | null; lead_id?: string | null }) => {
      if (!isSupabaseConfigured()) throw new Error("Supabase not configured.");
      const supabase = createClient();
      const { data, error } = await supabase.from("teams").insert(payload).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["team-members-map"] });
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      teamId,
      name,
      department,
      lead_id,
    }: {
      teamId: string;
      name: string;
      department?: string | null;
      lead_id?: string | null;
    }) => {
      if (!isSupabaseConfigured()) throw new Error("Supabase not configured.");
      const supabase = createClient();
      const { error } = await supabase
        .from("teams")
        .update({ name, department: department ?? null, lead_id: lead_id ?? null })
        .eq("id", teamId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["team-members-map"] });
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (teamId: string) => {
      if (!isSupabaseConfigured()) throw new Error("Supabase not configured.");
      const supabase = createClient();
      const { error } = await supabase.from("teams").delete().eq("id", teamId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["team-members-map"] });
    },
  });
}

export function useSetTeamMembers(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profileIds: string[]) => {
      if (!isSupabaseConfigured()) throw new Error("Supabase not configured.");
      const supabase = createClient();
      await supabase.from("team_members").delete().eq("team_id", teamId);
      if (profileIds.length > 0) {
        const { error } = await supabase.from("team_members").insert(
          profileIds.map((profile_id) => ({ team_id: teamId, profile_id }))
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-members-map"] });
    },
  });
}
