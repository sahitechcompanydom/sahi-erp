"use client";

import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { useSupabaseHealth } from "@/hooks/use-supabase-health";
import { useCurrentUser } from "@/contexts/current-user-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LayoutDashboard,
  Users,
  ListTodo,
  AlertCircle,
  Wifi,
  WifiOff,
  Loader2,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function DashboardView() {
  const { profile } = useCurrentUser();
  const {
    teamMembers,
    teamMembersLoading,
    activeTasks,
    reviewPending,
    tasksLoading,
    myTasks,
    myPendingApprovals,
    myTasksLoading,
  } = useDashboardStats();
  const { connectionStatus } = useSupabaseHealth();

  const isAdmin = profile?.role === "admin";
  const displayName = profile?.full_name?.trim() || profile?.email || "User";

  if (typeof window !== "undefined" && connectionStatus) {
    console.log("[Supabase] Connection status:", connectionStatus);
  }

  const adminStatCards = [
    {
      title: "Total staff",
      value: teamMembersLoading ? "…" : String(teamMembers),
      icon: Users,
      href: "/admin/personnel",
      description: "Company-wide",
    },
    {
      title: "Active tasks",
      value: tasksLoading ? "…" : String(activeTasks),
      icon: ListTodo,
      href: "/tasks",
      description: "Company-wide",
    },
    {
      title: "Pending reviews",
      value: tasksLoading ? "…" : String(reviewPending),
      icon: AlertCircle,
      href: "/tasks?status=Review Pending",
      description: "Awaiting approval",
    },
  ];

  const staffStatCards = [
    {
      title: "My tasks",
      value: myTasksLoading ? "…" : String(myTasks),
      icon: ListTodo,
      href: "/tasks",
      description: "Pending + In progress",
    },
    {
      title: "My pending approvals",
      value: myTasksLoading ? "…" : String(myPendingApprovals),
      icon: AlertCircle,
      href: "/tasks?status=Review Pending",
      description: "Awaiting your action",
    },
    {
      title: "My remaining leave days",
      value: "—",
      icon: CalendarDays,
      href: "#",
      description: "Leave balance (configure in Settings)",
    },
  ];

  const statCards = isAdmin ? adminStatCards : staffStatCards;

  return (
    <div className="p-8 pl-[calc(16rem+2rem)]">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-border aspect-square object-cover">
              <AvatarImage src={profile?.avatar_url ?? undefined} alt={displayName} className="object-cover" />
              <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                {profile?.full_name?.trim()
                  ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                  : profile?.email?.[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Welcome back, {displayName}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isAdmin
                  ? "Company-wide overview of jobs and personnel."
                  : "Your tasks and approvals at a glance."}
              </p>
            </div>
          </div>
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
              connectionStatus === "connected" &&
                "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
              connectionStatus === "disconnected" &&
                "border-destructive/30 bg-destructive/10 text-destructive",
              connectionStatus === "checking" &&
                "border-muted bg-muted/50 text-muted-foreground",
              connectionStatus === "not-configured" &&
                "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
            )}
          >
            {connectionStatus === "connected" && <Wifi className="h-4 w-4" />}
            {connectionStatus === "disconnected" && <WifiOff className="h-4 w-4" />}
            {connectionStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin" />}
            {connectionStatus === "not-configured" && <WifiOff className="h-4 w-4" />}
            <span>
              {connectionStatus === "connected" && "Supabase connected"}
              {connectionStatus === "disconnected" && "Supabase disconnected"}
              {connectionStatus === "checking" && "Checking connection…"}
              {connectionStatus === "not-configured" && "Supabase not configured"}
            </span>
          </div>
        </header>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            const content = (
              <Card className="transition-colors hover:bg-muted/30">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            );
            return stat.href === "#" ? (
              <div key={stat.title}>{content}</div>
            ) : (
              <Link key={stat.title} href={stat.href}>
                {content}
              </Link>
            );
          })}
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5" />
              Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {isAdmin
              ? "Use Administration in the sidebar for Personnel and System Settings. Task Tracker shows all company tasks."
              : "Use Task Tracker to view and update your assigned tasks. Pending approvals need an admin or chef to mark them completed."}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
