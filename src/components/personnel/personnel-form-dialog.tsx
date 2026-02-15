"use client";

import { useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  validateAvatarFile,
  uploadAvatar,
  deleteAvatarByUrl,
} from "@/lib/avatar-upload";
import { generateTemporaryPassword, getTempPasswordExpiresAt } from "@/lib/temp-password";
import type { Profile } from "@/types/database";

const profileSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().optional().refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Valid email required"),
  phone: z.string().optional(),
  role: z.enum(["admin", "chef", "staff"]),
  department: z.string().optional(),
  hire_date: z.string().optional(),
  birth_date: z.string().optional(),
  emergency_contact: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

type PersonnelFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: Profile | null;
  onSuccess: () => void;
  submitLabel?: string;
  title: string;
};

export function PersonnelFormDialog({
  open,
  onOpenChange,
  profile,
  onSuccess,
  submitLabel = "Save",
  title,
}: PersonnelFormDialogProps) {
  const queryClient = useQueryClient();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      role: "staff",
      department: "",
      hire_date: "",
      birth_date: "",
      emergency_contact: "",
    },
  });

  const role = watch("role");

  useEffect(() => {
    if (open) {
      setAvatarFile(null);
      setAvatarError(null);
      if (profile) {
        reset({
          full_name: profile.full_name ?? "",
          email: profile.email ?? "",
          phone: profile.phone ?? "",
          role: profile.role,
          department: profile.department ?? "",
          hire_date: profile.hire_date ? profile.hire_date.slice(0, 10) : "",
          birth_date: profile.birth_date ? profile.birth_date.slice(0, 10) : "",
          emergency_contact: profile.emergency_contact ?? "",
        });
        setAvatarPreviewUrl(profile.avatar_url ?? null);
      } else {
        reset({
          full_name: "",
          email: "",
          phone: "",
          role: "staff",
          department: "",
          hire_date: "",
          birth_date: "",
          emergency_contact: "",
        });
        setAvatarPreviewUrl(null);
      }
    }
  }, [open, profile, reset]);

  useEffect(() => {
    if (!open) {
      if (avatarPreviewUrl && avatarPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
      setAvatarPreviewUrl(null);
      setAvatarFile(null);
    }
  }, [open]);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    setAvatarError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setAvatarFile(null);
      setAvatarPreviewUrl(profile?.avatar_url ?? null);
      return;
    }
    const err = validateAvatarFile(file);
    if (err) {
      setAvatarError(err);
      setAvatarFile(null);
      setAvatarPreviewUrl(profile?.avatar_url ?? null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (avatarPreviewUrl && avatarPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }
    setAvatarFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
  }

  function clearAvatar() {
    setAvatarError(null);
    setAvatarFile(null);
    setAvatarPreviewUrl(profile?.avatar_url ?? null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function getInitials(name: string | null, email: string | null) {
    if (name?.trim()) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    if (email) return email[0].toUpperCase();
    return "?";
  }

  async function onSubmit(values: ProfileFormValues) {
    try {
      if (!isSupabaseConfigured()) {
        toast.error(
          "Supabase not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local in the project root, then restart the dev server (Ctrl+C, then npm run dev)."
        );
        return;
      }
      const supabase = createClient();
      let avatar_url: string | null = profile?.avatar_url ?? null;

      if (profile && avatarFile) {
        avatar_url = await uploadAvatar(supabase, avatarFile, profile.id);
        if (profile.avatar_url) {
          await deleteAvatarByUrl(supabase, profile.avatar_url);
        }
      }

      const basePayload = {
        full_name: values.full_name || null,
        email: values.email || null,
        phone: values.phone || null,
        role: values.role,
        department: values.department || null,
        hire_date: values.hire_date || null,
        birth_date: values.birth_date || null,
        emergency_contact: values.emergency_contact || null,
      };

      if (profile) {
        const { error } = await supabase
          .from("profiles")
          .update({ ...basePayload, avatar_url })
          .eq("id", profile.id);
        if (error) throw error;
        toast.success("Personnel updated successfully");
      } else {
        const email = values.email?.trim();
        if (!email) {
          toast.error("Email is required for new personnel (used for login).");
          return;
        }
        const temporary_password = generateTemporaryPassword();
        const temp_password_expires_at = getTempPasswordExpiresAt();

        const createUserRes = await fetch("/api/admin/create-auth-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: temporary_password }),
        });
        if (!createUserRes.ok) {
          const data = await createUserRes.json().catch(() => ({}));
          throw new Error(data?.error || "Failed to create login account");
        }
        const { userId } = (await createUserRes.json()) as { userId: string };

        const { error } = await supabase.from("profiles").insert({
          id: userId,
          ...basePayload,
          temporary_password,
          temp_password_expires_at,
          is_password_forced_change: true,
        }).select("id").single();
        if (error) throw error;
        const newId = userId;
        if (avatarFile && newId) {
          avatar_url = await uploadAvatar(supabase, avatarFile, newId);
          await supabase.from("profiles").update({ avatar_url }).eq("id", newId);
        }
        toast.success("Personnel added successfully");
        try {
          const res = await fetch("/api/notifications/onboarding", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profileId: newId }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            toast.error(data?.error || "WhatsApp onboarding notification failed");
          }
        } catch {
          toast.error("WhatsApp onboarding notification failed");
        }
      }
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      onSuccess();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            {profile ? "Edit team member details." : "Add a new team member. Email is required for login."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-2">
            <Label>Profile photo</Label>
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-muted text-muted-foreground aspect-square">
                {avatarPreviewUrl ? (
                  <img
                    src={avatarPreviewUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-medium">
                    {getInitials(profile?.full_name ?? null, profile?.email ?? null) || "?"}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatarPreviewUrl ? "Change photo" : "Upload photo"}
                </Button>
                {(avatarPreviewUrl || avatarFile) && (
                  <Button type="button" variant="ghost" size="sm" onClick={clearAvatar} className="text-muted-foreground">
                    Remove
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">JPG, JPEG or PNG. Max 2MB.</p>
                {avatarError && <p className="text-xs text-destructive">{avatarError}</p>}
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="full_name">Full Name *</Label>
            <Input id="full_name" {...register("full_name")} placeholder="Full name" />
            {errors.full_name && (
              <p className="text-xs text-destructive">{errors.full_name.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} placeholder="email@company.com" />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register("phone")} placeholder="+91 ..." />
          </div>
          <div className="grid gap-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setValue("role", v as "admin" | "chef" | "staff")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="chef">Chef</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="department">Department</Label>
            <Input id="department" {...register("department")} placeholder="e.g. Kitchen" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="hire_date">Hire Date</Label>
              <Input id="hire_date" type="date" {...register("hire_date")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="birth_date">Birth Date</Label>
              <Input id="birth_date" type="date" {...register("birth_date")} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="emergency_contact">Emergency Contact (Name/Phone)</Label>
            <Input
              id="emergency_contact"
              {...register("emergency_contact")}
              placeholder="Name and phone"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
