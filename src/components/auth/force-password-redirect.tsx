"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCurrentUser } from "@/contexts/current-user-context";

const ALLOWED_WITHOUT_CHANGE = ["/auth/update-password", "/login", "/signup"];

export function ForcePasswordRedirect() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, isLoading } = useCurrentUser();

  useEffect(() => {
    if (isLoading || !profile) return;
    if (!profile.is_password_forced_change) return;
    const allowed = ALLOWED_WITHOUT_CHANGE.some((p) => pathname?.startsWith(p));
    if (allowed) return;
    router.replace("/auth/update-password");
  }, [profile, isLoading, pathname, router]);

  return null;
}
