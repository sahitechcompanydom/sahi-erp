"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Users2,
  ListTodo,
  Building2,
  Moon,
  Sun,
  Sparkles,
  Settings,
  LogIn,
  LogOut,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useCurrentUser } from "@/contexts/current-user-context";
import { createClient } from "@/lib/supabase/client";

const topLevelNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Task Tracker", icon: ListTodo },
  { href: "/wiki", label: "Wiki", icon: BookOpen },
];

const adminSubNav = [
  { href: "/admin/personnel", label: "Personnel Management", icon: Users },
  { href: "/admin/teams", label: "Teams", icon: Users2 },
  { href: "/admin/settings", label: "System Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { profile } = useCurrentUser();
  const [mounted, setMounted] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  const isAdminPath = pathname?.startsWith("/admin");
  useEffect(() => {
    if (isAdminPath) setAdminOpen(true);
  }, [isAdminPath]);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSignOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <aside
      className={cn(
        "sidebar-glass fixed left-0 top-0 z-40 flex h-screen w-64 flex-col",
        "border-r border-sidebar-border"
      )}
    >
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
        <Building2 className="h-7 w-7 text-primary" />
        <span className="font-semibold tracking-tight text-foreground">
          Sahi Company
        </span>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-4">
        {topLevelNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <span
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
              </span>
            </Link>
          );
        })}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setAdminOpen((o) => !o)}
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
              isAdminPath
                ? "bg-primary/10 text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <span className="flex items-center gap-3">
              <Settings className="h-5 w-5 shrink-0" />
              Administration
            </span>
            {adminOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          </button>
          {adminOpen && (
            <div className="ml-2 mt-0.5 space-y-0.5 border-l border-border pl-3">
              {adminSubNav.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <span
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-2 text-xs font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>
      <div className="space-y-1 border-t border-sidebar-border p-4">
        {mounted && profile ? (
          <Button variant="ghost" size="sm" className="w-full justify-start gap-3 text-muted-foreground" onClick={handleSignOut}>
            <LogOut className="h-5 w-5" />
            Sign out
          </Button>
        ) : mounted ? (
          <Link href="/login">
            <Button variant="ghost" size="sm" className="w-full justify-start gap-3 text-muted-foreground">
              <LogIn className="h-5 w-5" />
              Login
            </Button>
          </Link>
        ) : null}
        {mounted && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between gap-2 text-muted-foreground">
                <span className="flex items-center gap-3">
                  {theme === "light" && <Sun className="h-4 w-4 shrink-0" />}
                  {theme === "dark" && <Moon className="h-4 w-4 shrink-0" />}
                  {(theme === "signature" || !theme) && <Sparkles className="h-4 w-4 shrink-0" />}
                  <span className="truncate">{theme === "light" ? "Light" : theme === "dark" ? "Dark" : "Signature"}</span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <DropdownMenuItem onClick={() => setTheme("light")} className={cn("gap-2", theme === "light" && "bg-accent")}>
                {theme === "light" ? <Check className="h-4 w-4 shrink-0" /> : <span className="inline-block h-4 w-4 shrink-0" aria-hidden />}
                <Sun className="h-4 w-4 shrink-0" />
                Light Mode
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")} className={cn("gap-2", theme === "dark" && "bg-accent")}>
                {theme === "dark" ? <Check className="h-4 w-4 shrink-0" /> : <span className="inline-block h-4 w-4 shrink-0" aria-hidden />}
                <Moon className="h-4 w-4 shrink-0" />
                Dark Mode
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("signature")} className={cn("gap-2", (theme === "signature" || !theme) && "bg-accent")}>
                {(theme === "signature" || !theme) ? <Check className="h-4 w-4 shrink-0" /> : <span className="inline-block h-4 w-4 shrink-0" aria-hidden />}
                <Sparkles className="h-4 w-4 shrink-0" />
                Signature Mode
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </aside>
  );
}
