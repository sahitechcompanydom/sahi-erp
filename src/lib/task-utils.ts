/** Display task ID for UI (e.g. SAHI-A1B2C3) */
export function getTaskDisplayId(taskId: string): string {
  const hex = taskId.replace(/-/g, "").slice(0, 6).toUpperCase();
  return `SAHI-${hex}`;
}
