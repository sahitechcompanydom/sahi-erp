"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Team } from "@/types/database";
import type { Profile } from "@/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users2, Loader2, UserPlus, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTeams, useDeleteTeam, useAllTeamMembersMap } from "@/hooks/use-teams";
import { TeamFormDialog } from "@/components/teams/team-form-dialog";
import { TeamMembersDialog } from "@/components/teams/team-members-dialog";
import { DeleteTeamDialog } from "@/components/teams/delete-team-dialog";

export function TeamsView() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [managingMembersTeam, setManagingMembersTeam] = useState<Team | null>(null);
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);

  const { data: teams = [], isLoading, error } = useTeams();
  const { data: membersMap = new Map<string, string[]>() } = useAllTeamMembersMap();
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles", isSupabaseConfigured()],
    queryFn: async () => {
      if (!isSupabaseConfigured()) return [];
      const supabase = createClient();
      const { data, error: e } = await supabase.from("profiles").select("*").order("full_name");
      if (e) throw e;
      return (data ?? []) as Profile[];
    },
  });
  const profilesById = new Map(profiles.map((p) => [p.id, p]));
  const deleteTeam = useDeleteTeam();

  const handleAdd = () => {
    setEditingTeam(null);
    setFormOpen(true);
  };
  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setFormOpen(true);
  };
  const handleManageMembers = (team: Team) => {
    setManagingMembersTeam(team);
    setMembersOpen(true);
  };
  const handleDelete = (team: Team) => {
    setDeletingTeam(team);
    setDeleteOpen(true);
  };
  const handleFormSuccess = () => {
    setEditingTeam(null);
    setFormOpen(false);
    queryClient.invalidateQueries({ queryKey: ["teams"] });
    queryClient.invalidateQueries({ queryKey: ["team-members-map"] });
  };
  const handleMembersSuccess = () => {
    setManagingMembersTeam(null);
    setMembersOpen(false);
    queryClient.invalidateQueries({ queryKey: ["team-members-map"] });
  };
  const handleDeleteSuccess = () => {
    setDeletingTeam(null);
    setDeleteOpen(false);
    queryClient.invalidateQueries({ queryKey: ["teams"] });
    queryClient.invalidateQueries({ queryKey: ["team-members-map"] });
  };

  return (
    <div className="p-8 pl-[calc(16rem+2rem)]">
      <div className="mx-auto max-w-6xl space-y-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Team Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create teams, assign a lead, and add members. Teams can be assigned to tasks in the Task Tracker.
          </p>
        </header>

        <Card className="overflow-hidden border-border shadow-sm">
          <CardHeader className="border-b border-border bg-muted/30 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Users2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Teams</CardTitle>
                  <CardDescription>{teams.length} team{teams.length !== 1 ? "s" : ""}</CardDescription>
                </div>
              </div>
              <Button onClick={handleAdd} className="gap-2">
                <UserPlus className="h-4 w-4" />
                Add Team
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                Unable to load teams. Run the Step 10 SQL migration in Supabase.
              </div>
            ) : teams.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-16 text-center text-sm text-muted-foreground">
                <p>No teams yet. Create one to assign to tasks.</p>
                <Button onClick={handleAdd} variant="outline" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add Team
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="px-6 py-4 font-medium text-muted-foreground">Team</th>
                      <th className="px-6 py-4 font-medium text-muted-foreground">Department</th>
                      <th className="px-6 py-4 font-medium text-muted-foreground">Lead</th>
                      <th className="px-6 py-4 font-medium text-muted-foreground">Members</th>
                      <th className="w-12 px-6 py-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((team) => {
                      const memberIds = membersMap.get(team.id) ?? [];
                      const lead = team.lead_id ? profilesById.get(team.lead_id) : null;
                      return (
                        <tr key={team.id} className="border-b border-border hover:bg-muted/20">
                          <td className="px-6 py-4 font-medium">{team.name}</td>
                          <td className="px-6 py-4 text-muted-foreground">{team.department ?? "—"}</td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {lead ? lead.full_name ?? lead.email ?? "—" : "—"}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">{memberIds.length}</td>
                          <td className="px-6 py-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => handleEdit(team)} className="gap-2">
                                  <Pencil className="h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleManageMembers(team)} className="gap-2">
                                  <Users2 className="h-4 w-4" />
                                  Manage members
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDelete(team)}
                                  className="gap-2 text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <TeamFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        team={editingTeam}
        onSuccess={handleFormSuccess}
      />
      <TeamMembersDialog
        open={membersOpen}
        onOpenChange={setMembersOpen}
        team={managingMembersTeam}
        onSuccess={handleMembersSuccess}
      />
      <DeleteTeamDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        team={deletingTeam}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
