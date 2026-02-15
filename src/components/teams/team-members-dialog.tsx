"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Team } from "@/types/database";
import type { Profile } from "@/types/database";
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
import { useSetTeamMembers } from "@/hooks/use-teams";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TeamMembersDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team | null;
  onSuccess: () => void;
};

export function TeamMembersDialog({ open, onOpenChange, team, onSuccess }: TeamMembersDialogProps) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const setMembers = useSetTeamMembers(team?.id ?? "");

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles", isSupabaseConfigured()],
    queryFn: async () => {
      if (!isSupabaseConfigured()) return [];
      const supabase = createClient();
      const { data, error } = await supabase.from("profiles").select("*").order("full_name");
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });

  const { data: memberIds = [] } = useQuery({
    queryKey: ["team-members", team?.id, isSupabaseConfigured()],
    queryFn: async () => {
      if (!team?.id || !isSupabaseConfigured()) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("team_members")
        .select("profile_id")
        .eq("team_id", team.id);
      if (error) throw error;
      return (data ?? []).map((r: { profile_id: string }) => r.profile_id);
    },
    enabled: !!team?.id && open,
  });

  useEffect(() => {
    if (open && team) {
      setSelectedIds(new Set(memberIds));
    }
  }, [open, team?.id, memberIds.join(",")]);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    if (!team) return;
    try {
      await setMembers.mutateAsync([...selectedIds]);
      toast.success("Members updated");
      onOpenChange(false);
      onSuccess();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    }
  }

  if (!team) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-hidden flex flex-col sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Manage members: {team.name}</DialogTitle>
          <DialogDescription className="sr-only">Select personnel to add or remove from this team.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-2">
          <Label className="text-muted-foreground">Select personnel to add to this team</Label>
          <ul className="space-y-1 rounded-md border border-border p-2">
            {profiles.map((p) => {
              const checked = selectedIds.has(p.id);
              return (
                <li key={p.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted/50",
                      checked && "bg-muted/50"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(p.id)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="font-medium">{p.full_name ?? p.email ?? "—"}</span>
                    <span className="text-xs text-muted-foreground">{p.role}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={setMembers.isPending}>
            {setMembers.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
