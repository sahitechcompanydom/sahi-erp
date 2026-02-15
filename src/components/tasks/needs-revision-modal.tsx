"use client";

import { useState } from "react";
import type { Task } from "@/types/database";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { toast } from "sonner";
import { MessageSquare, Loader2 } from "lucide-react";

function formatRevisionTimestamp() {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `[${day}/${month}/${year} Admin]`;
}

type NeedsRevisionModalProps = {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function NeedsRevisionModal({ task, open, onOpenChange, onSuccess }: NeedsRevisionModalProps) {
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const trimmed = feedback.trim();
    if (!trimmed) {
      toast.error("Please enter what needs to be fixed.");
      return;
    }
    if (!task || !isSupabaseConfigured()) {
      toast.error("Task not found or Supabase not configured.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const existingNotes = task.revision_notes?.trim() ?? "";
      const newLine = existingNotes ? "\n\n" : "";
      const line = `${newLine}${formatRevisionTimestamp()}: ${trimmed}`;
      const revision_notes = existingNotes + line;

      const { error } = await supabase
        .from("tasks")
        .update({ status: "In Progress", revision_notes })
        .eq("id", task.id);
      if (error) throw error;

      const res = await fetch("/api/notifications/task-revision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, feedback: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error || "Revision saved but WhatsApp notification failed.");
      }

      toast.success("Task sent back for revision. Assignee notified.");
      setFeedback("");
      onOpenChange(false);
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send back for revision.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) setFeedback("");
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Needs Revision
          </DialogTitle>
          <DialogDescription>
            Tell the assignee what to fix. They will be notified.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          What needs to be fixed? Your note will be saved and sent to the assignee.
        </p>
        <div className="space-y-2">
          <Label htmlFor="revision-feedback">What needs to be fixed?</Label>
          <Textarea
            id="revision-feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="e.g. Please also check the cable labeling."
            rows={4}
            className="resize-none"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Send back for revision
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
