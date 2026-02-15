"use client";

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
import { useDeleteTeam } from "@/hooks/use-teams";
import type { Team } from "@/types/database";
import { toast } from "sonner";

type DeleteTeamDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team | null;
  onSuccess: () => void;
};

export function DeleteTeamDialog({ open, onOpenChange, team, onSuccess }: DeleteTeamDialogProps) {
  const deleteTeam = useDeleteTeam();

  async function handleConfirm() {
    if (!team) return;
    try {
      await deleteTeam.mutateAsync(team.id);
      toast.success("Team deleted");
      onOpenChange(false);
      onSuccess();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete team</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{team?.name}&quot;? This will not delete personnel, only the team and its assignments.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
