"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import type { TaskPriority } from "@/types/database";
import { useCreateTask } from "@/hooks/use-tasks";
import { useQuery } from "@tanstack/react-query";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";
import { useTeams, useAllTeamMembersMap } from "@/hooks/use-teams";

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  assignee_ids: z.array(z.string()).optional(),
  watcher_ids: z.array(z.string()).optional(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]),
  due_date: z.string().optional(),
});

type CreateTaskFormValues = z.infer<typeof createTaskSchema>;

type CreateTaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateTaskDialog({ open, onOpenChange }: CreateTaskDialogProps) {
  const createTask = useCreateTask(() => onOpenChange(false));
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
  } = useForm<CreateTaskFormValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      assignee_ids: [],
      watcher_ids: [],
      priority: "Medium",
      due_date: "",
    },
  });

  const priority = watch("priority");
  const assigneeIds = watch("assignee_ids") ?? [];
  const watcherIds = watch("watcher_ids") ?? [];

  useEffect(() => {
    if (open) {
      reset({
        title: "",
        description: "",
        assignee_ids: [],
        watcher_ids: [],
        priority: "Medium",
        due_date: "",
      });
    }
  }, [open, reset]);

  async function onSubmit(values: CreateTaskFormValues) {
    try {
      const result = await createTask.mutateAsync({
        title: values.title,
        description: values.description || null,
        assignee_ids: values.assignee_ids?.length ? values.assignee_ids : undefined,
        watcher_ids: values.watcher_ids?.length ? values.watcher_ids : undefined,
        priority: values.priority as TaskPriority,
        due_date: values.due_date || null,
      });
      const taskId = (result as { id?: string })?.id;
      toast.success("Task created");
      onOpenChange(false);
      if (taskId) {
        try {
          const res = await fetch("/api/notifications/task", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              taskId,
              assigneeIds: values.assignee_ids ?? [],
              watcherIds: values.watcher_ids ?? [],
            }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            toast.error(data?.error || "WhatsApp task notification failed");
          }
        } catch {
          toast.error("WhatsApp task notification failed");
        }
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to create task";
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription className="sr-only">Create a new task with title, assignees, and optional due date.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" {...register("title")} placeholder="Task title" />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Details (plain text or markdown)"
              rows={3}
            />
          </div>
          <div className="grid gap-2">
            <MultiSelectProfile
              label="Assignees"
              placeholder="Select team or people"
              value={assigneeIds}
              onChange={(ids) => setValue("assignee_ids", ids)}
              profiles={profileOptions}
              teams={teamOptions}
            />
          </div>
          <div className="grid gap-2">
            <MultiSelectProfile
              label="CC / Inform (Watchers)"
              placeholder="Select people to notify"
              value={watcherIds}
              onChange={(ids) => setValue("watcher_ids", ids)}
              profiles={profileOptions}
            />
          </div>
          <div className="grid gap-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setValue("priority", v as TaskPriority)}>
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
            <Label htmlFor="due_date">Due date</Label>
            <Input id="due_date" type="date" {...register("due_date")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || createTask.isPending}>
              {createTask.isPending || isSubmitting ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
