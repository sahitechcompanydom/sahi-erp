"use client";

import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTasksWithProfiles, sortTasksForDisplay, useUpdateTaskStatus } from "@/hooks/use-tasks";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { TaskListView } from "@/components/tasks/task-list-view";
import { TaskManagementView } from "@/components/tasks/task-management-view";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import { TaskEditSheet } from "@/components/tasks/task-edit-sheet";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { NeedsRevisionModal } from "@/components/tasks/needs-revision-modal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListTodo, Loader2, PlusCircle, LayoutList, LayoutGrid, Briefcase } from "lucide-react";
import { useCurrentUser } from "@/contexts/current-user-context";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { toast } from "sonner";

export function TaskTrackerView() {
  const [createOpen, setCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "kanban" | "management">("list");
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [revisionTask, setRevisionTask] = useState<import("@/types/database").Task | null>(null);
  const hasSetAdminDefault = useRef(false);
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useTasksWithProfiles();
  const { profile: currentProfile } = useCurrentUser();
  const updateStatus = useUpdateTaskStatus();

  useEffect(() => {
    if (currentProfile?.role === "admin" && !hasSetAdminDefault.current) {
      hasSetAdminDefault.current = true;
      setViewMode((m) => (m === "list" ? "management" : m));
    }
  }, [currentProfile?.role]);

  const canComplete = currentProfile?.role === "admin" || currentProfile?.role === "chef";
  const sortedTasks = data?.tasks ? sortTasksForDisplay(data.tasks) : [];
  const profilesMap = data?.profilesMap ?? new Map();
  const assignmentsMap = data?.assignmentsMap ?? new Map();
  const watchersMap = data?.watchersMap ?? new Map();

  const detailTask = detailTaskId ? sortedTasks.find((t) => t.id === detailTaskId) ?? null : null;
  const detailAssignee = detailTask ? (assignmentsMap.get(detailTask.id)?.[0] ? profilesMap.get(assignmentsMap.get(detailTask.id)![0]) ?? null : (detailTask.assignee_id ? profilesMap.get(detailTask.assignee_id) ?? null : null)) : null;

  const editTask = editTaskId ? sortedTasks.find((t) => t.id === editTaskId) ?? null : null;
  const editAssignee = editTask ? (assignmentsMap.get(editTask.id)?.[0] ? profilesMap.get(assignmentsMap.get(editTask.id)![0]) ?? null : (editTask.assignee_id ? profilesMap.get(editTask.assignee_id) ?? null : null)) : null;
  const editAssigneeIds = editTask ? (assignmentsMap.get(editTask.id) ?? (editTask.assignee_id ? [editTask.assignee_id] : [])) : [];
  const editWatcherIds = editTask ? (watchersMap.get(editTask.id) ?? []) : [];
  const myId = currentProfile?.id ?? null;
  const watchingTasks = myId ? sortedTasks.filter((t) => {
    const watchers = watchersMap.get(t.id) ?? [];
    const assignees = assignmentsMap.get(t.id) ?? (t.assignee_id ? [t.assignee_id] : []);
    return watchers.includes(myId) && !assignees.includes(myId);
  }) : [];

  function handleQuickApprove(task: { id: string }) {
    updateStatus.mutate(
      { taskId: task.id, newStatus: "Completed" },
      {
        onSuccess: () => toast.success("Task approved"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to approve"),
      }
    );
  }

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["tasks-with-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    };
    const channel = supabase
      .channel("tasks-and-assignments-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_assignments" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_watchers" }, invalidate)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 pl-[calc(16rem+2rem)]">
        <div className="mx-auto max-w-6xl rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
          Failed to load tasks. Ensure Supabase is configured.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 pl-[calc(16rem+2rem)]">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Task Tracker
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {viewMode === "management"
                ? "Grouped by status. Resolved section shows Wiki conversion; green icon = documented."
                : viewMode === "list"
                  ? "Click a row to view details. Edit or convert completed tasks to Wiki."
                  : "Drag cards between columns to update status. Staff cannot set Completed — use Review Pending."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "kanban" | "management")}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="list" className="gap-2">
                  <LayoutList className="h-4 w-4" />
                  List
                </TabsTrigger>
                <TabsTrigger value="kanban" className="gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  Kanban
                </TabsTrigger>
                <TabsTrigger value="management" className="gap-2">
                  <Briefcase className="h-4 w-4" />
                  Management
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={() => setCreateOpen(true)} className="gap-2 shrink-0">
              <PlusCircle className="h-4 w-4" />
              Create Task
            </Button>
          </div>
        </header>

        {watchingTasks.length > 0 && (
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">Watching / Informed tasks</h2>
            <div className="flex flex-wrap gap-2">
              {watchingTasks.slice(0, 8).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setDetailTaskId(t.id); setEditTaskId(null); }}
                  className="rounded-md border border-border bg-background px-3 py-2 text-left text-sm hover:bg-muted/50"
                >
                  <span className="font-medium">{t.title}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{t.status}</span>
                </button>
              ))}
              {watchingTasks.length > 8 && (
                <span className="py-2 text-xs text-muted-foreground">+{watchingTasks.length - 8} more</span>
              )}
            </div>
          </div>
        )}

        {viewMode === "management" ? (
          <TaskManagementView
            tasks={sortedTasks}
            profilesMap={profilesMap}
            assignmentsMap={assignmentsMap}
            canQuickApprove={canComplete}
            canNeedsRevision={currentProfile?.role === "admin"}
            onTaskClick={(task) => { setDetailTaskId(task.id); setEditTaskId(null); }}
            onQuickApprove={handleQuickApprove}
            onNeedsRevision={(task) => setRevisionTask(task)}
          />
        ) : viewMode === "list" ? (
          <TaskListView
            tasks={sortedTasks}
            profilesMap={profilesMap}
            assignmentsMap={assignmentsMap}
            canQuickApprove={canComplete}
            canNeedsRevision={currentProfile?.role === "admin"}
            onTaskClick={(task) => { setDetailTaskId(task.id); setEditTaskId(null); }}
            onQuickApprove={handleQuickApprove}
            onNeedsRevision={(task) => setRevisionTask(task)}
          />
        ) : (
          <KanbanBoard
            tasks={sortedTasks}
            profilesMap={profilesMap}
            assignmentsMap={assignmentsMap}
            canComplete={canComplete}
            onTaskClick={(task) => { setDetailTaskId(task.id); setEditTaskId(null); }}
          />
        )}

        {sortedTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-16 text-center">
            <ListTodo className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No tasks yet. Create one to get started.</p>
            <Button onClick={() => setCreateOpen(true)} variant="outline" className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Create Task
            </Button>
          </div>
        )}
      </div>

      <TaskDetailSheet
        task={detailTask}
        assignee={detailAssignee ?? null}
        open={!!detailTaskId}
        onOpenChange={(open) => !open && setDetailTaskId(null)}
        isAdmin={currentProfile?.role === "admin"}
        onEdit={() => {
          if (detailTaskId) {
            setEditTaskId(detailTaskId);
            setDetailTaskId(null);
          }
        }}
        onNeedsRevision={(task) => setRevisionTask(task)}
      />
      <NeedsRevisionModal
        task={revisionTask}
        open={!!revisionTask}
        onOpenChange={(open) => !open && setRevisionTask(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["tasks-with-profiles"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
        }}
      />
      <TaskEditSheet
        task={editTask}
        assignee={editAssignee ?? null}
        assigneeIds={editAssigneeIds}
        watcherIds={editWatcherIds}
        open={!!editTaskId}
        onOpenChange={(open) => !open && setEditTaskId(null)}
      />
      <CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
