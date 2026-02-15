"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateTeam, useUpdateTeam } from "@/hooks/use-teams";
import { useQuery } from "@tanstack/react-query";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Team } from "@/types/database";
import type { Profile } from "@/types/database";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  department: z.string().optional(),
  lead_id: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type TeamFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team | null;
  onSuccess: () => void;
};

export function TeamFormDialog({ open, onOpenChange, team, onSuccess }: TeamFormDialogProps) {
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
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
  const chefs = profiles.filter((p) => p.role === "chef");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", department: "", lead_id: "" },
  });

  useEffect(() => {
    if (open) {
      if (team) {
        reset({
          name: team.name,
          department: team.department ?? "",
          lead_id: team.lead_id ?? "",
        });
      } else {
        reset({ name: "", department: "", lead_id: "" });
      }
    }
  }, [open, team, reset]);

  async function onSubmit(values: FormValues) {
    try {
      if (team) {
        await updateTeam.mutateAsync({
          teamId: team.id,
          name: values.name,
          department: values.department || null,
          lead_id: values.lead_id || null,
        });
        toast.success("Team updated");
      } else {
        await createTeam.mutateAsync({
          name: values.name,
          department: values.department || null,
          lead_id: values.lead_id || null,
        });
        toast.success("Team created");
      }
      onOpenChange(false);
      onSuccess();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{team ? "Edit team" : "Add team"}</DialogTitle>
          <DialogDescription className="sr-only">{team ? "Update team name, department, and lead." : "Create a new team with name and optional department."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="team-name">Name *</Label>
            <Input id="team-name" {...register("name")} placeholder="Team name" />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="team-department">Department</Label>
            <Input id="team-department" {...register("department")} placeholder="e.g. Kitchen" />
          </div>
          <div className="grid gap-2">
            <Label>Team Lead (Chef)</Label>
            <Select
              value={watch("lead_id") || "none"}
              onValueChange={(v) => setValue("lead_id", v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select lead" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No lead</SelectItem>
                {chefs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name ?? p.email ?? p.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {team ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
