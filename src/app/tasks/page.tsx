import { TaskTrackerView } from "@/components/tasks/task-tracker-view";

export const dynamic = "force-dynamic";

export default function TasksPage() {
  return (
    <div className="min-h-screen">
      <TaskTrackerView />
    </div>
  );
}
