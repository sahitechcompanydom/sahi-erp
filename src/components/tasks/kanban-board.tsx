"use client";

import { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  pointerWithin,
} from "@dnd-kit/core";
import { toast } from "sonner";
import type { Task } from "@/types/database";
import type { Profile } from "@/types/database";
import { TASK_STATUSES, type TaskAssignmentsMap } from "@/hooks/use-tasks";
import { useUpdateTaskStatus } from "@/hooks/use-tasks";
import { TaskCard } from "@/components/tasks/task-card";

function getAssigneeIds(task: Task, assignmentsMap: TaskAssignmentsMap): string[] {
  const fromMap = assignmentsMap.get(task.id);
  if (fromMap?.length) return fromMap;
  return task.assignee_id ? [task.assignee_id] : [];
}

type KanbanBoardProps = {
  tasks: Task[];
  profilesMap: Map<string, Profile>;
  assignmentsMap: TaskAssignmentsMap;
  canComplete: boolean;
  onTaskClick?: (task: Task) => void;
};

function DroppableColumn({
  id,
  title,
  count,
  children,
}: {
  id: string;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[280px] flex-1 flex-col rounded-xl border bg-muted/20 transition-colors ${
        isOver ? "border-primary/50 bg-primary/5" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-medium text-foreground">{title}</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {count}
        </span>
      </div>
      <div className="flex-1 space-y-3 p-3">{children}</div>
    </div>
  );
}

function DraggableTaskCard({
  task,
  assigneeIds,
  profilesMap,
  onCardClick,
}: {
  task: Task;
  assigneeIds: string[];
  profilesMap: Map<string, Profile>;
  onCardClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: task.id,
    data: { taskId: task.id, currentStatus: task.status },
  });

  return (
    <div ref={setNodeRef} {...attributes}>
      <TaskCard
        task={task}
        assigneeIds={assigneeIds}
        profilesMap={profilesMap}
        isDragging={isDragging}
        onClick={onCardClick}
        dragHandleProps={listeners}
      />
    </div>
  );
}

export function KanbanBoard({ tasks, profilesMap, assignmentsMap, canComplete, onTaskClick }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const updateStatus = useUpdateTaskStatus();

  const tasksByStatus = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const status of TASK_STATUSES) {
      map.set(status, tasks.filter((t) => t.status === status));
    }
    return map;
  }, [tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over?.id || active.id === over.id) return;

    const currentStatus = (active.data.current as { currentStatus?: string } | undefined)?.currentStatus;
    const newStatus = over.id as string;
    if (!TASK_STATUSES.includes(newStatus as Task["status"])) return;
    if (currentStatus === newStatus) return;

    try {
      await updateStatus.mutateAsync({
        taskId: active.id as string,
        newStatus: newStatus as Task["status"],
      });
      toast.success("Task moved");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to move task");
    }
  };

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  return (
    <>
      <DndContext
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        collisionDetection={pointerWithin}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {TASK_STATUSES.map((status) => (
            <DroppableColumn
              key={status}
              id={status}
              title={status}
              count={tasksByStatus.get(status)?.length ?? 0}
            >
              {(tasksByStatus.get(status) ?? []).map((task) => (
                <DraggableTaskCard
                  key={task.id}
                  task={task}
                  assigneeIds={getAssigneeIds(task, assignmentsMap)}
                  profilesMap={profilesMap}
                  onCardClick={() => onTaskClick?.(task)}
                />
              ))}
            </DroppableColumn>
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCard
              task={activeTask}
              assigneeIds={getAssigneeIds(activeTask, assignmentsMap)}
              profilesMap={profilesMap}
              isDragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}
