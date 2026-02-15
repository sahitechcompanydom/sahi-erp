"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Circle, Clock, CheckCircle, CheckCheck, BookOpen, MessageSquare } from "lucide-react";
import type { Task } from "@/types/database";
import type { Profile } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getTaskDisplayId } from "@/lib/task-utils";
import { AssigneeAvatars } from "@/components/tasks/assignee-avatars";
import type { TaskAssignmentsMap } from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";

const priorityVariant: Record<Task["priority"], "secondary" | "outline" | "warning" | "destructive"> = {
  Low: "secondary",
  Medium: "outline",
  High: "warning",
  Urgent: "destructive",
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusIcon({ status }: { status: Task["status"] }) {
  const base = "h-5 w-5 shrink-0";
  switch (status) {
    case "Completed":
      return <CheckCircle className={cn(base, "text-emerald-600")} aria-hidden />;
    case "Review Pending":
      return <CheckCheck className={cn(base, "text-amber-600")} aria-hidden />;
    case "In Progress":
      return <Clock className={cn(base, "text-amber-500")} aria-hidden />;
    default:
      return <Circle className={cn(base, "text-muted-foreground")} aria-hidden />;
  }
}

function getAssigneeIds(task: Task, assignmentsMap: TaskAssignmentsMap): string[] {
  const fromMap = assignmentsMap.get(task.id);
  if (fromMap?.length) return fromMap;
  return task.assignee_id ? [task.assignee_id] : [];
}

const SECTIONS: { status: Task["status"]; title: string; subtitle: string; highContrast?: boolean; muted?: boolean }[] = [
  { status: "Review Pending", title: "Action Required", subtitle: "Review Pending", highContrast: true },
  { status: "In Progress", title: "Active Tasks", subtitle: "In Progress" },
  { status: "Pending", title: "Upcoming", subtitle: "Pending" },
  { status: "Completed", title: "Resolved & Documented", subtitle: "Completed", muted: true },
];

type TaskManagementViewProps = {
  tasks: Task[];
  profilesMap: Map<string, Profile>;
  assignmentsMap: TaskAssignmentsMap;
  canQuickApprove: boolean;
  canNeedsRevision?: boolean;
  onTaskClick: (task: Task) => void;
  onQuickApprove: (task: Task) => void;
  onNeedsRevision?: (task: Task) => void;
};

export function TaskManagementView({
  tasks,
  profilesMap,
  assignmentsMap,
  canQuickApprove,
  canNeedsRevision,
  onTaskClick,
  onQuickApprove,
  onNeedsRevision,
}: TaskManagementViewProps) {
  const router = useRouter();
  const byStatus = (status: Task["status"]) => tasks.filter((t) => t.status === status);

  if (tasks.length === 0) return null;

  return (
    <div className="space-y-0 overflow-hidden rounded-xl border border-border">
      {SECTIONS.map(({ status, title, subtitle, highContrast, muted }) => {
        const sectionTasks = byStatus(status);
        const count = sectionTasks.length;
        const isResolved = status === "Completed";

        return (
          <div key={status} className={cn("border-b border-border last:border-b-0", muted && "opacity-60")}>
            <div
              className={cn(
                "sticky top-0 z-10 flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-medium backdrop-blur-sm",
                highContrast
                  ? "bg-amber-500/15 text-amber-900 dark:bg-amber-400/20 dark:text-amber-100 border-amber-300/50 dark:border-amber-600/50"
                  : "bg-muted/50 text-foreground"
              )}
            >
              <span>
                {title} ({subtitle}) ({count})
              </span>
            </div>
            {sectionTasks.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No tasks in this section
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="w-12 px-4 py-2 font-medium text-muted-foreground" aria-label="Status" />
                      <th className="px-4 py-2 font-medium text-muted-foreground">Task</th>
                      <th className="px-4 py-2 font-medium text-muted-foreground">Assignee</th>
                      <th className="px-4 py-2 font-medium text-muted-foreground">Priority</th>
                      <th className="px-4 py-2 font-medium text-muted-foreground">Due date</th>
                      {isResolved && (
                        <th className="w-14 px-4 py-2 font-medium text-muted-foreground" aria-label="Wiki" />
                      )}
                      {!isResolved && (
                        <th className="w-14 px-4 py-2" aria-label="Quick approve" />
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {sectionTasks.map((task) => {
                      const assigneeIds = getAssigneeIds(task, assignmentsMap);
                      const showQuickApprove = canQuickApprove && task.status === "Review Pending";
                      const showNeedsRevision = canNeedsRevision && task.status === "Review Pending" && onNeedsRevision;
                      const hasWiki = !!task.wiki_article_id;
                      const hasRevisionNotes = !!(task.revision_notes && task.revision_notes.trim());

                      return (
                        <tr
                          key={task.id}
                          className={cn(
                            "cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/30",
                            hasRevisionNotes && "border-l-2 border-l-amber-400 dark:border-l-amber-600"
                          )}
                          onClick={() => onTaskClick(task)}
                        >
                          <td className="w-12 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <span className="inline-flex h-5 w-5 items-center justify-center">
                              <StatusIcon status={task.status} />
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-mono text-xs text-muted-foreground">
                                {getTaskDisplayId(task.id)}
                              </p>
                              <p className="font-medium text-foreground">{task.title}</p>
                              {hasRevisionNotes && (
                                <Badge variant="outline" className="mt-1 text-[10px] border-amber-300 text-amber-800 dark:border-amber-600 dark:text-amber-200">
                                  Revised
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <AssigneeAvatars
                              profileIds={assigneeIds}
                              profilesMap={profilesMap}
                              max={3}
                              size="sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={priorityVariant[task.priority]} className="text-xs">
                              {task.priority}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(task.due_date)}</td>
                          {isResolved ? (
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              {hasWiki ? (
                                <Link
                                  href={`/wiki/${task.wiki_article_id}`}
                                  className="inline-flex items-center justify-center rounded-md hover:bg-muted"
                                  title="View Wiki article"
                                >
                                  <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="currentColor" />
                                </Link>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground"
                                  title="Convert to Wiki"
                                  onClick={() => router.push(`/wiki/new?fromTask=${task.id}`)}
                                >
                                  <BookOpen className="h-5 w-5" />
                                </Button>
                              )}
                            </td>
                          ) : (
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1">
                                {showQuickApprove && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50"
                                    onClick={() => onQuickApprove(task)}
                                    title="Approve (mark Completed)"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                )}
                                {showNeedsRevision && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/50 dark:hover:text-amber-200"
                                    onClick={() => onNeedsRevision(task)}
                                    title="Needs Revision"
                                  >
                                    <MessageSquare className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
