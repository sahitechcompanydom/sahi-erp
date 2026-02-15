"use client";

import type { Task } from "@/types/database";
import type { Profile } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, GripVertical } from "lucide-react";
import { AssigneeAvatars } from "@/components/tasks/assignee-avatars";
import { cn } from "@/lib/utils";
import { getTaskDisplayId } from "@/lib/task-utils";

const priorityVariant: Record<Task["priority"], "secondary" | "outline" | "warning" | "destructive"> = {
  Low: "secondary",
  Medium: "outline",
  High: "warning",
  Urgent: "destructive",
};

function formatDueDate(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export type TaskCardProps = {
  task: Task;
  assigneeIds: string[];
  profilesMap: Map<string, Profile>;
  isDragging?: boolean;
  onClick?: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement> | null;
};

export function TaskCard({
  task,
  assigneeIds,
  profilesMap,
  isDragging,
  onClick,
  dragHandleProps,
}: TaskCardProps) {
  const dueStr = formatDueDate(task.due_date);
  const isUrgent = task.priority === "Urgent";
  const isCompleted = task.status === "Completed";
  const taskId = getTaskDisplayId(task.id);

  return (
    <Card
      className={cn(
        "border-border bg-card shadow-sm transition-shadow",
        isDragging && "opacity-60 shadow-lg",
        isUrgent && "border-l-4 border-l-destructive",
        isUrgent && "signature-urgent-card",
        isCompleted && "opacity-60",
        "hover:border-primary/20 cursor-pointer"
      )}
      onClick={(e) => {
        if (!isDragging && onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <div
            className="shrink-0 touch-none"
            {...(dragHandleProps ?? {})}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="font-mono text-xs text-muted-foreground">{taskId}</p>
            <p className="font-medium leading-tight text-foreground line-clamp-2">
              {task.title}
            </p>
            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {task.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={priorityVariant[task.priority]}
                className={cn("text-xs", isUrgent && "animate-pulse-urgent")}
              >
                {task.priority}
              </Badge>
              {dueStr && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {dueStr}
                </span>
              )}
            </div>
            {(assigneeIds.length > 0) && (
              <div className="pt-1">
                <AssigneeAvatars
                  profileIds={assigneeIds}
                  profilesMap={profilesMap}
                  max={3}
                  size="sm"
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
