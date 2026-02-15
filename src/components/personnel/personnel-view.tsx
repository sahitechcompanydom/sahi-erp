"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, MoreHorizontal, Mail, Phone, Calendar, Loader2, UserPlus, Pencil, Trash2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PersonnelFormDialog } from "@/components/personnel/personnel-form-dialog";
import { DeletePersonnelDialog } from "@/components/personnel/delete-personnel-dialog";

const roleVariant: Record<Profile["role"], "default" | "secondary" | "success" | "warning" | "outline"> = {
  admin: "default",
  chef: "secondary",
  staff: "outline",
};

function getInitials(name: string | null, email: string | null) {
  if (name?.trim()) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) return email[0].toUpperCase();
  return "?";
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isTempPasswordExpired(p: Profile): boolean {
  if (!p.temp_password_expires_at) return false;
  return new Date(p.temp_password_expires_at) < new Date();
}

function needsPasswordChange(p: Profile): boolean {
  return !!(p.is_password_forced_change || p.temporary_password);
}

function isExpiredStatus(p: Profile): boolean {
  return needsPasswordChange(p) && isTempPasswordExpired(p);
}

export function PersonnelView() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [deletingProfile, setDeletingProfile] = useState<Profile | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const { data: profiles = [], isLoading, error } = useQuery({
    queryKey: ["profiles", isSupabaseConfigured()],
    queryFn: async () => {
      if (!isSupabaseConfigured()) return [];
      const supabase = createClient();
      const { data, error: e } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });
      if (e) throw e;
      return (data ?? []) as Profile[];
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["profiles"] });

  const handleEdit = (profile: Profile) => {
    setEditingProfile(profile);
    setFormOpen(true);
  };

  const handleDelete = (profile: Profile) => {
    setDeletingProfile(profile);
    setDeleteOpen(true);
  };

  const handleAdd = () => {
    setEditingProfile(null);
    setFormOpen(true);
  };

  const handleFormSuccess = () => {
    setEditingProfile(null);
    refresh();
  };

  const handleDeleteSuccess = () => {
    setDeletingProfile(null);
    refresh();
  };

  async function handleResendCredentials(profileId: string) {
    setResendingId(profileId);
    try {
      const res = await fetch("/api/admin/resend-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to resend credentials");
      }
      const onboardingRes = await fetch("/api/notifications/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId }),
      });
      if (!onboardingRes.ok) {
        const data = await onboardingRes.json().catch(() => ({}));
        toast.error("Credentials reset but WhatsApp failed: " + (data?.error || "unknown"));
      } else {
        toast.success("New credentials sent via WhatsApp.");
      }
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to resend credentials");
    } finally {
      setResendingId(null);
    }
  }

  return (
    <div className="p-8 pl-[calc(16rem+2rem)]">
      <div className="mx-auto max-w-6xl space-y-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Personnel Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Directory of all team members with roles and contact information.
          </p>
        </header>

        <Card className="overflow-hidden border-border shadow-sm">
          <CardHeader className="border-b border-border bg-muted/30 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Personnel Directory</CardTitle>
                  <CardDescription>
                    {profiles.length} team member{profiles.length !== 1 ? "s" : ""}
                  </CardDescription>
                </div>
              </div>
              <Button onClick={handleAdd} className="gap-2">
                <UserPlus className="h-4 w-4" />
                Add Personnel
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                Unable to load personnel. Ensure Supabase is configured.
              </div>
            ) : profiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-16 text-center text-sm text-muted-foreground">
                <p>No personnel records yet. Add your first team member.</p>
                <Button onClick={handleAdd} variant="outline" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add Personnel
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="px-6 py-4 font-medium text-muted-foreground">Member</th>
                      <th className="px-6 py-4 font-medium text-muted-foreground">Role</th>
                      <th className="px-6 py-4 font-medium text-muted-foreground">Department</th>
                      <th className="px-6 py-4 font-medium text-muted-foreground">Contact</th>
                      <th className="px-6 py-4 font-medium text-muted-foreground">Hire date</th>
                      <th className="px-6 py-4 font-medium text-muted-foreground">Status</th>
                      <th className="w-12 px-6 py-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-border transition-colors hover:bg-muted/20"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-border">
                              <AvatarImage src={p.avatar_url ?? undefined} alt={p.full_name ?? ""} />
                              <AvatarFallback className="bg-muted text-muted-foreground">
                                {getInitials(p.full_name, p.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground">{p.full_name ?? "—"}</p>
                              <p className="text-xs text-muted-foreground">{p.email ?? "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={roleVariant[p.role]}
                            className={cn(
                              "capitalize",
                              p.role === "admin" && "bg-primary/90 text-primary-foreground"
                            )}
                          >
                            {p.role}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{p.department ?? "—"}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-0.5 text-muted-foreground">
                            {p.email && (
                              <span className="flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5" />
                                {p.email}
                              </span>
                            )}
                            {p.phone && (
                              <span className="flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5" />
                                {p.phone}
                              </span>
                            )}
                            {!p.email && !p.phone && "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(p.hire_date)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            {isExpiredStatus(p) && (
                              <Badge variant="destructive" className="w-fit text-xs">
                                Expired
                              </Badge>
                            )}
                            {isExpiredStatus(p) && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1 text-xs"
                                disabled={resendingId === p.id}
                                onClick={() => handleResendCredentials(p.id)}
                              >
                                {resendingId === p.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3 w-3" />
                                )}
                                Resend credentials
                              </Button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleEdit(p)} className="gap-2">
                                <Pencil className="h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(p)}
                                className="gap-2 text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PersonnelFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        profile={editingProfile}
        onSuccess={handleFormSuccess}
        submitLabel={editingProfile ? "Update" : "Add"}
        title={editingProfile ? "Edit personnel" : "Add personnel"}
      />

      <DeletePersonnelDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        profile={deletingProfile}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
