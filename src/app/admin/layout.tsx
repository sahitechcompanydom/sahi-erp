"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/contexts/current-user-context";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { profile, isLoading } = useCurrentUser();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    const isAdmin = profile?.role === "admin";
    if (!isAdmin && !hasRedirected.current) {
      hasRedirected.current = true;
      toast.error("Access denied. Administrator access required.");
      router.replace("/dashboard");
      return;
    }
  }, [profile?.role, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (profile?.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
