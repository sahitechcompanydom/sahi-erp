import type { Task } from "@/types/database";
import type { Profile } from "@/types/database";
import type { WikiCategory } from "@/types/database";

const WIKI_CATEGORIES: WikiCategory[] = ["Network", "Server", "Software", "Electrical"];

/** Map profile department (or similar) to a wiki category. Default: Software. */
function departmentToCategory(department: string | null | undefined): WikiCategory {
  if (!department || typeof department !== "string") return "Software";
  const d = department.trim().toLowerCase();
  if (d.includes("network")) return "Network";
  if (d.includes("server") || d.includes("infra")) return "Server";
  if (d.includes("electr")) return "Electrical";
  return "Software";
}

export type ConvertTaskToWikiResult = {
  title: string;
  content: string;
  category: WikiCategory;
  media_urls: string[];
};

/**
 * Build pre-filled wiki article data from a task (and optional assignee for category).
 * Does not save anything; use result to pre-fill the Wiki Editor.
 */
export function convertTaskToWiki(
  task: Task,
  assignee?: Profile | null
): ConvertTaskToWikiResult {
  const taskDescription = task.description?.trim() ?? "";
  const content = [
    "### Original Task Description",
    taskDescription,
    "",
    "### Solution Details",
    "(Admin can edit this before saving)",
  ].join("\n");

  const category = assignee ? departmentToCategory(assignee.department) : "Software";

  return {
    title: task.title,
    content,
    category,
    media_urls: [],
  };
}
