"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Task, TaskStatus } from "@/types/database";
import type { Profile } from "@/types/database";
import { useCurrentUser } from "@/contexts/current-user-context";

export const TASK_STATUSES: TaskStatus[] = [
  "Pending",
  "In Progress",
  "Review Pending",
  "Completed",
];

const STATUS_ORDER: TaskStatus[] = ["Pending", "In Progress", "Review Pending", "Completed"];

/** Sort: Urgent first, then by status (Pending → … → Completed). */
export function sortTasksForDisplay(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.priority === "Urgent" && b.priority !== "Urgent") return -1;
    if (a.priority !== "Urgent" && b.priority === "Urgent") return 1;
    const ai = STATUS_ORDER.indexOf(a.status);
    const bi = STATUS_ORDER.indexOf(b.status);
    return ai - bi;
  });
}

/** taskId -> assignee profile_id[] (from task_assignments, fallback to assignee_id) */
export type TaskAssignmentsMap = Map<string, string[]>;
/** taskId -> watcher profile_id[] */
export type TaskWatchersMap = Map<string, string[]>;

export function useTasksWithProfiles() {
  const { profile: currentProfile } = useCurrentUser();

  return useQuery({
    queryKey: ["tasks-with-profiles", currentProfile?.id ?? "anon", currentProfile?.role, isSupabaseConfigured()],
    queryFn: async () => {
      if (!isSupabaseConfigured()) {
        return {
          tasks: [],
          profilesMap: new Map<string, Profile>(),
          assignmentsMap: new Map<string, string[]>(),
          watchersMap: new Map<string, string[]>(),
        };
      }
      const supabase = createClient();
      const [tasksRes, assignmentsRes, watchersRes] = await Promise.all([
        supabase.from("tasks").select("*").order("due_date", { ascending: true, nullsFirst: false }),
        supabase.from("task_assignments").select("task_id, profile_id"),
        supabase.from("task_watchers").select("task_id, profile_id"),
      ]);
      if (tasksRes.error) throw tasksRes.error;
      const tasks = (tasksRes.data ?? []) as Task[];

      const assignmentsMap = new Map<string, string[]>();
      (assignmentsRes.data ?? []).forEach((r: { task_id: string; profile_id: string }) => {
        const arr = assignmentsMap.get(r.task_id) ?? [];
        arr.push(r.profile_id);
        assignmentsMap.set(r.task_id, arr);
      });
      const watchersMap = new Map<string, string[]>();
      (watchersRes.data ?? []).forEach((r: { task_id: string; profile_id: string }) => {
        const arr = watchersMap.get(r.task_id) ?? [];
        arr.push(r.profile_id);
        watchersMap.set(r.task_id, arr);
      });

      function getAssigneeIds(t: Task): string[] {
        const fromTable = assignmentsMap.get(t.id);
        if (fromTable && fromTable.length > 0) return fromTable;
        if (t.assignee_id) return [t.assignee_id];
        return [];
      }

      let filtered = tasks;
      const myId = currentProfile?.id;
      if (currentProfile?.role === "admin") {
        filtered = tasks;
      } else if (myId) {
        filtered = tasks.filter((t) => {
          const assigneeIds = getAssigneeIds(t);
          const watcherIds = watchersMap.get(t.id) ?? [];
          return assigneeIds.includes(myId) || watcherIds.includes(myId);
        });
      } else {
        filtered = [];
      }

      const allProfileIds = new Set<string>();
      filtered.forEach((t) => {
        getAssigneeIds(t).forEach((id) => allProfileIds.add(id));
        (watchersMap.get(t.id) ?? []).forEach((id) => allProfileIds.add(id));
      });
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("*")
        .in("id", allProfileIds.size ? [...allProfileIds] : ["__none__"]);
      const profilesMap = new Map<string, Profile>();
      (profilesData ?? []).forEach((p) => profilesMap.set(p.id, p as Profile));

      return {
        tasks: filtered,
        profilesMap,
        assignmentsMap,
        watchersMap,
      };
    },
  });
}

function applyCompletionGate(role: string | undefined, newStatus: TaskStatus): TaskStatus {
  if (newStatus !== "Completed") return newStatus;
  if (role === "admin" || role === "chef") return "Completed";
  return "Review Pending";
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  const { profile: currentProfile } = useCurrentUser();

  return useMutation({
    mutationFn: async ({ taskId, newStatus }: { taskId: string; newStatus: TaskStatus }) => {
      if (!isSupabaseConfigured()) throw new Error("Supabase is not configured. Add .env.local with your project URL and anon key.");
      const supabase = createClient();
      const statusToSet = applyCompletionGate(currentProfile?.role, newStatus);
      const { error } = await supabase.from("tasks").update({ status: statusToSet }).eq("id", taskId);
      if (error) throw error;
      return { taskId, status: statusToSet };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-with-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  const { profile: currentProfile } = useCurrentUser();

  return useMutation({
    mutationFn: async ({
      taskId,
      title,
      description,
      assignee_ids,
      watcher_ids,
      priority,
      status,
      due_date,
    }: {
      taskId: string;
      title: string;
      description?: string | null;
      assignee_ids?: string[];
      watcher_ids?: string[];
      priority: Task["priority"];
      status: TaskStatus;
      due_date?: string | null;
    }) => {
      if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");
      const supabase = createClient();
      const statusToSet = applyCompletionGate(currentProfile?.role, status);
      const firstAssignee = assignee_ids?.length ? assignee_ids[0] : null;
      const { error } = await supabase
        .from("tasks")
        .update({
          title,
          description: description ?? null,
          assignee_id: firstAssignee,
          priority,
          status: statusToSet,
          due_date: due_date || null,
        })
        .eq("id", taskId);
      if (error) throw error;

      await supabase.from("task_assignments").delete().eq("task_id", taskId);
      if (assignee_ids?.length) {
        await supabase.from("task_assignments").insert(
          assignee_ids.map((profile_id) => ({ task_id: taskId, profile_id }))
        );
      }
      await supabase.from("task_watchers").delete().eq("task_id", taskId);
      if (watcher_ids?.length) {
        await supabase.from("task_watchers").insert(
          watcher_ids.map((profile_id) => ({ task_id: taskId, profile_id }))
        );
      }
      return { taskId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-with-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useCreateTask(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { profile } = useCurrentUser();

  return useMutation({
    mutationFn: async (payload: {
      title: string;
      description?: string | null;
      assignee_ids?: string[];
      watcher_ids?: string[];
      priority: Task["priority"];
      due_date?: string | null;
    }) => {
      if (!isSupabaseConfigured()) throw new Error("Supabase is not configured. Add .env.local with your project URL and anon key.");
      const supabase = createClient();
      const firstAssignee = payload.assignee_ids?.length ? payload.assignee_ids[0] : null;
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          title: payload.title,
          description: payload.description ?? null,
          assigner_id: profile?.id ?? null,
          assignee_id: firstAssignee,
          due_date: payload.due_date ?? null,
          priority: payload.priority,
          status: "Pending",
        })
        .select("id")
        .single();
      if (error) throw error;
      const taskId = (data as { id: string }).id;
      if (payload.assignee_ids?.length) {
        await supabase.from("task_assignments").insert(
          payload.assignee_ids.map((profile_id) => ({ task_id: taskId, profile_id }))
        );
      }
      if (payload.watcher_ids?.length) {
        await supabase.from("task_watchers").insert(
          payload.watcher_ids.map((profile_id) => ({ task_id: taskId, profile_id }))
        );
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-with-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      onSuccess?.();
    },
  });
}
