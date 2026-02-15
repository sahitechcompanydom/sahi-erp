"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { Task, TaskStatus, TaskPriority } from "@/types/database";
import type { Profile } from "@/types/database";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelectProfile } from "@/components/ui/multi-select-profile";
import { getTaskDisplayId } from "@/lib/task-utils";
import { useUpdateTask, TASK_STATUSES } from "@/hooks/use-tasks";
import { useQuery } from "@tanstack/react-query";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useTeams, useAllTeamMembersMap } from "@/hooks/use-teams";

const editTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  assignee_ids: z.array(z.string()).optional(),
  watcher_ids: z.array(z.string()).optional(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]),
  status: z.enum(["Pending", "In Progress", "Review Pending", "Completed"]),
  due_date: z.string().optional(),
});

type EditTaskFormValues = z.infer<typeof editTaskSchema>;

type TaskEditSheetProps = {
  task: Task | null;
  assignee: Profile | null;
  assigneeIds?: string[];
  watcherIds?: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TaskEditSheet({
  task,
  assignee,
  assigneeIds = [],
  watcherIds = [],
  open,
  onOpenChange,
}: TaskEditSheetProps) {
  const updateTask = useUpdateTask();
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles", isSupabaseConfigured()],
    queryFn: async () => {
      if (!isSupabaseConfigured()) return [];
      const supabase = createClient();
      const { data, error } = await supabase.from("profiles").select("*").order("full_name");
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });
  const { data: teams = [] } = useTeams();
  const { data: teamMembersMap = new Map<string, string[]>() } = useAllTeamMembersMap();

  const profileOptions = profiles.map((p) => ({
    id: p.id,
    label: p.full_name ?? p.email ?? p.id.slice(0, 8),
  }));
  const teamOptions = teams.map((t) => ({
    id: t.id,
    label: t.name,
    memberIds: teamMembersMap.get(t.id) ?? [],
  })).filter((t) => t.memberIds.length > 0);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EditTaskFormValues>({
    resolver: zodResolver(editTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      assignee_ids: [],
      watcher_ids: [],
      priority: "Medium",
      status: "Pending",
      due_date: "",
    },
  });

  const initialAssigneeIds = assigneeIds.length ? assigneeIds : (task?.assignee_id ? [task.assignee_id] : []);
  const initialWatcherIds = watcherIds;

  useEffect(() => {
    if (open && task) {
      reset({
        title: task.title,
        description: task.description ?? "",
        assignee_ids: initialAssigneeIds,
        watcher_ids: initialWatcherIds,
        priority: task.priority,
        status: task.status,
        due_date: task.due_date ? task.due_date.slice(0, 10) : "",
      });
    }
  }, [open, task?.id, initialAssigneeIds.join(","), initialWatcherIds.join(","), reset]);

  async function onSubmit(values: EditTaskFormValues) {
    if (!task) return;
    try {
      await updateTask.mutateAsync({
        taskId: task.id,
        title: values.title,
        description: values.description || null,
        assignee_ids: values.assignee_ids,
        watcher_ids: values.watcher_ids,
        priority: values.priority as TaskPriority,
        status: values.status as TaskStatus,
        due_date: values.due_date || null,
      });
      toast.success("Task updated");
      onOpenChange(false);
      try {
        const res = await fetch("/api/notifications/task-updated", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: task.id,
            assigneeIds: values.assignee_ids ?? [],
            watcherIds: values.watcher_ids ?? [],
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast.error(data?.error || "WhatsApp update notification failed");
        }
      } catch {
        toast.error("WhatsApp update notification failed");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update task");
    }
  }

  if (!task) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex max-w-md flex-col">
        <SheetHeader>
          <SheetTitle className="pr-8">Edit task</SheetTitle>
          <p className="text-xs font-mono text-muted-foreground">{getTaskDisplayId(task.id)}</p>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col">
          <SheetBody className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input id="edit-title" {...register("title")} placeholder="Task title" />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                {...register("description")}
                placeholder="Details"
                rows={4}
              />
            </div>
            <div className="grid gap-2">
              <MultiSelectProfile
                label="Assignees"
                placeholder="Select team or people"
                value={watch("assignee_ids") ?? []}
                onChange={(ids) => setValue("assignee_ids", ids)}
                profiles={profileOptions}
                teams={teamOptions}
              />
            </div>
            <div className="grid gap-2">
              <MultiSelectProfile
                label="CC / Inform (Watchers)"
                placeholder="Select people to notify"
                value={watch("watcher_ids") ?? []}
                onChange={(ids) => setValue("watcher_ids", ids)}
                profiles={profileOptions}
              />
            </div>
            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select
                value={watch("priority")}
                onValueChange={(v) => setValue("priority", v as TaskPriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={watch("status")}
                onValueChange={(v) => setValue("status", v as TaskStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-due_date">Due date</Label>
              <Input id="edit-due_date" type="date" {...register("due_date")} />
            </div>
          </SheetBody>
          <div className="border-t border-border p-6 pt-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || updateTask.isPending}
            >
              {updateTask.isPending || isSubmitting ? "Updating…" : "Update Task"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
