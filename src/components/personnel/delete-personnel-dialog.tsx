"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

type DeletePersonnelDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
  onSuccess: () => void;
};

export function DeletePersonnelDialog({
  open,
  onOpenChange,
  profile,
  onSuccess,
}: DeletePersonnelDialogProps) {
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirm() {
    if (!profile) return;
    if (!isSupabaseConfigured()) {
      toast.error(
        "Supabase not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart the dev server."
      );
      return;
    }
    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("profiles").delete().eq("id", profile.id);
      if (error) throw error;
      toast.success("Personnel removed");
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      onOpenChange(false);
      onSuccess();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to delete";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove personnel?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove {profile?.full_name ?? "this person"} from the directory. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Removing…" : "Remove"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
