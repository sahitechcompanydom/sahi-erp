"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";

const NO_SIDEBAR_PATHS = ["/login", "/signup", "/auth/update-password"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideSidebar = NO_SIDEBAR_PATHS.some((p) => pathname?.startsWith(p));

  if (hideSidebar) {
    return <main className="min-h-screen flex-1 overflow-auto">{children}</main>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
