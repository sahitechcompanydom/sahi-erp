"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useCurrentUser } from "@/contexts/current-user-context";

export function useDashboardStats() {
  const { profile } = useCurrentUser();

  const profilesCount = useQuery({
    queryKey: ["dashboard-stats", "profiles-count", isSupabaseConfigured()],
    queryFn: async () => {
      if (!isSupabaseConfigured()) return 0;
      const supabase = createClient();
      const { count, error } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const tasksCounts = useQuery({
    queryKey: ["dashboard-stats", "tasks-counts", isSupabaseConfigured()],
    queryFn: async () => {
      if (!isSupabaseConfigured()) return { total: 0, active: 0, reviewPending: 0 };
      const supabase = createClient();
      const { data, error } = await supabase.from("tasks").select("status");
      if (error) throw error;
      const list = (data ?? []) as { status: string }[];
      const active = list.filter((t) => t.status === "Pending" || t.status === "In Progress").length;
      const reviewPending = list.filter((t) => t.status === "Review Pending").length;
      return { total: list.length, active, reviewPending };
    },
  });

  const myTaskStats = useQuery({
    queryKey: ["dashboard-stats", "my-tasks", profile?.id, isSupabaseConfigured()],
    queryFn: async () => {
      if (!isSupabaseConfigured() || !profile?.id) return { myTasks: 0, myPendingApprovals: 0 };
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tasks")
        .select("status")
        .eq("assignee_id", profile.id);
      if (error) throw error;
      const list = (data ?? []) as { status: string }[];
      const myTasks = list.filter((t) => t.status === "Pending" || t.status === "In Progress").length;
      const myPendingApprovals = list.filter((t) => t.status === "Review Pending").length;
      return { myTasks, myPendingApprovals };
    },
    enabled: !!profile?.id,
  });

  return {
    teamMembers: profilesCount.data ?? 0,
    teamMembersLoading: profilesCount.isLoading,
    activeTasks: tasksCounts.data?.active ?? 0,
    reviewPending: tasksCounts.data?.reviewPending ?? 0,
    tasksLoading: tasksCounts.isLoading,
    myTasks: myTaskStats.data?.myTasks ?? 0,
    myPendingApprovals: myTaskStats.data?.myPendingApprovals ?? 0,
    myTasksLoading: myTaskStats.isLoading,
  };
}
