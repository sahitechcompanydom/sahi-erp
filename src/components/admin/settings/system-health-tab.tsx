"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSupabaseHealth } from "@/hooks/use-supabase-health";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Activity, Wifi, WifiOff, Loader2, Database } from "lucide-react";
import { cn } from "@/lib/utils";

function maskSupabaseUrl(url: string | undefined): string {
  if (!url || typeof url !== "string") return "—";
  try {
    const u = new URL(url);
    const host = u.hostname;
    if (host.length <= 20) return `${u.protocol}//${host}`;
    return `${u.protocol}//${host.slice(0, 6)}...${host.slice(-12)}`;
  } catch {
    return url.slice(0, 20) + "...";
  }
}

export function SystemHealthTab() {
  const { connectionStatus } = useSupabaseHealth();
  const [testing, setTesting] = useState(false);
  const configured = isSupabaseConfigured();
  const supabaseUrl = typeof window !== "undefined" ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined;

  const handleTestConnection = async () => {
    if (!configured) {
      toast.error("Supabase is not configured. Add .env.local and restart the server.");
      return;
    }
    setTesting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("profiles").select("id").limit(1).maybeSingle();
      if (error) throw new Error(error.message);
      toast.success("Connection successful. Database is reachable.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Connection failed";
      toast.error(message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          System Health
        </CardTitle>
        <CardDescription>
          Real-time Supabase connectivity and connection test.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                connectionStatus === "connected" && "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                connectionStatus === "disconnected" && "bg-destructive/20 text-destructive",
                connectionStatus === "checking" && "bg-muted text-muted-foreground",
                connectionStatus === "not-configured" && "bg-amber-500/20 text-amber-600 dark:text-amber-400"
              )}
            >
              {connectionStatus === "connected" && (
                <span className="relative flex">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <Wifi className="relative h-5 w-5" />
                </span>
              )}
              {connectionStatus === "disconnected" && <WifiOff className="h-5 w-5" />}
              {connectionStatus === "checking" && <Loader2 className="h-5 w-5 animate-spin" />}
              {connectionStatus === "not-configured" && <WifiOff className="h-5 w-5" />}
            </div>
            <div>
              <p className="font-medium">
                {connectionStatus === "connected" && "Connected"}
                {connectionStatus === "disconnected" && "Disconnected"}
                {connectionStatus === "checking" && "Checking…"}
                {connectionStatus === "not-configured" && "Not configured"}
              </p>
              <p className="text-sm text-muted-foreground">
                {connectionStatus === "connected" && "Supabase is reachable."}
                {connectionStatus === "disconnected" && "Cannot reach the database."}
                {connectionStatus === "checking" && "Testing connectivity…"}
                {connectionStatus === "not-configured" && "Set NEXT_PUBLIC_SUPABASE_* in .env.local."}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={!configured || testing}
            className="gap-2"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            Test Connection
          </Button>
        </div>

        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="mb-1 text-sm font-medium text-muted-foreground">Current database URL (masked)</p>
          <code className="text-sm text-foreground">{maskSupabaseUrl(supabaseUrl)}</code>
        </div>
      </CardContent>
    </Card>
  );
}
