"use client";

import Link from "next/link";
import type { Task } from "@/types/database";
import type { Profile } from "@/types/database";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, User, FileText, Pencil, BookOpen, ExternalLink, MessageSquare } from "lucide-react";
import { getTaskDisplayId } from "@/lib/task-utils";
import { cn } from "@/lib/utils";

const priorityVariant: Record<Task["priority"], "secondary" | "outline" | "warning" | "destructive"> = {
  Low: "secondary",
  Medium: "outline",
  High: "warning",
  Urgent: "destructive",
};

function getInitials(name: string | null, email: string | null) {
  if (name?.trim()) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  if (email) return email[0].toUpperCase();
  return "?";
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type TaskDetailSheetProps = {
  task: Task | null;
  assignee: Profile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  isAdmin?: boolean;
  onNeedsRevision?: (task: Task) => void;
};

export function TaskDetailSheet({ task, assignee, open, onOpenChange, onEdit, isAdmin, onNeedsRevision }: TaskDetailSheetProps) {
  if (!task) return null;

  const isUrgent = task.priority === "Urgent";
  const isCompleted = task.status === "Completed";
  const isReviewPending = task.status === "Review Pending";
  const wikiArticleId = task.wiki_article_id ?? null;
  const showNeedsRevision = isAdmin && isReviewPending && onNeedsRevision;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle className="pr-8">{task.title}</SheetTitle>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-mono text-muted-foreground">
              {getTaskDisplayId(task.id)}
            </span>
            <Badge
              variant={priorityVariant[task.priority]}
              className={cn("text-xs", isUrgent && "animate-pulse-urgent")}
            >
              {task.priority}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {task.status}
            </Badge>
          </div>
        </SheetHeader>
        <SheetBody className="space-y-6">
          {task.description && (
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <FileText className="h-4 w-4" />
                Description
              </h4>
              <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                {task.description}
              </p>
            </div>
          )}
          {task.revision_notes && (
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <MessageSquare className="h-4 w-4" />
                Revision notes
              </h4>
              <p className="whitespace-pre-wrap rounded-md border border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30 p-3 text-sm text-muted-foreground">
                {task.revision_notes}
              </p>
            </div>
          )}
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <User className="h-4 w-4" />
              Assignee
            </h4>
            {assignee ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarImage src={assignee.avatar_url ?? undefined} alt={assignee.full_name ?? ""} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                    {getInitials(assignee.full_name, assignee.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{assignee.full_name ?? assignee.email ?? "—"}</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Unassigned</p>
            )}
          </div>
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <Calendar className="h-4 w-4" />
              Due date
            </h4>
            <p className="text-sm text-muted-foreground">{formatDate(task.due_date)}</p>
          </div>

          {wikiArticleId && (
            <div>
              <Link href={`/wiki/${wikiArticleId}`} onClick={() => onOpenChange(false)}>
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <ExternalLink className="h-4 w-4" />
                  View related Wiki Article
                </Button>
              </Link>
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            {showNeedsRevision && (
              <Button variant="outline" size="sm" className="w-full gap-2 border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-950/50" onClick={() => onNeedsRevision(task)}>
                <MessageSquare className="h-4 w-4" />
                Needs Revision
              </Button>
            )}
            {onEdit && (
              <Button variant="default" size="sm" className="w-full gap-2" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
                Edit task
              </Button>
            )}
            {isCompleted && (
              <Link href={`/wiki/new?fromTask=${task.id}`} className="block" onClick={() => onOpenChange(false)}>
                <Button type="button" variant="outline" size="sm" className="w-full gap-2">
                  <BookOpen className="h-4 w-4" />
                  Convert to Wiki Article
                </Button>
              </Link>
            )}
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
