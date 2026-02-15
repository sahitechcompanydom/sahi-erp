"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Database, Shield, MessageCircle, Loader2, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

const MASK = "••••••••";

type ConnectivityConfig = {
  id: string | null;
  next_public_supabase_url: string;
  next_public_supabase_anon_key: string;
  supabase_service_role_key: string;
  whatsapp_instance_id: string;
  whatsapp_token: string;
};

const emptyConfig: ConnectivityConfig = {
  id: null,
  next_public_supabase_url: "",
  next_public_supabase_anon_key: "",
  supabase_service_role_key: "",
  whatsapp_instance_id: "",
  whatsapp_token: "",
};

export function SystemConfig() {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<ConnectivityConfig>(emptyConfig);
  const [showServiceRole, setShowServiceRole] = useState(false);
  const [showWhatsAppToken, setShowWhatsAppToken] = useState(false);
  const [testStatus, setTestStatus] = useState<Record<string, { ok: boolean; error?: string } | null>>({});

  const { data: fetched, isLoading } = useQuery({
    queryKey: ["system-connectivity"],
    queryFn: async (): Promise<ConnectivityConfig> => {
      const res = await fetch("/api/admin/system-connectivity");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to load");
      }
      const raw = await res.json();
      return {
        id: raw.id ?? null,
        next_public_supabase_url: raw.next_public_supabase_url ?? "",
        next_public_supabase_anon_key: raw.next_public_supabase_anon_key ?? "",
        supabase_service_role_key: raw.supabase_service_role_key ?? "",
        whatsapp_instance_id: raw.whatsapp_instance_id ?? "",
        whatsapp_token: raw.whatsapp_token ?? "",
      };
    },
  });

  useEffect(() => {
    if (fetched) setConfig(fetched);
  }, [fetched]);

  const saveMutation = useMutation({
    mutationFn: async (payload: ConnectivityConfig) => {
      const res = await fetch("/api/admin/system-connectivity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: payload.id,
          next_public_supabase_url: payload.next_public_supabase_url,
          next_public_supabase_anon_key: payload.next_public_supabase_anon_key,
          supabase_service_role_key: payload.supabase_service_role_key === "" && payload.id ? MASK : payload.supabase_service_role_key,
          whatsapp_instance_id: payload.whatsapp_instance_id,
          whatsapp_token: payload.whatsapp_token === "" && payload.id ? MASK : payload.whatsapp_token,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to save");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-connectivity"] });
      toast.success("Configuration saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function testConnection(type: "supabase-public" | "supabase-admin" | "whatsapp") {
    setTestStatus((s) => ({ ...s, [type]: null }));
    const payload: Record<string, string> = {
      type,
      next_public_supabase_url: config.next_public_supabase_url,
      next_public_supabase_anon_key: config.next_public_supabase_anon_key,
    };
    if (type === "supabase-admin") {
      payload.supabase_service_role_key = config.supabase_service_role_key;
    }
    if (type === "whatsapp") {
      payload.whatsapp_instance_id = config.whatsapp_instance_id;
      payload.whatsapp_token = config.whatsapp_token;
    }
    try {
      const res = await fetch("/api/admin/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        setTestStatus((s) => ({ ...s, [type]: { ok: true } }));
        toast.success("Connection successful");
      } else {
        setTestStatus((s) => ({ ...s, [type]: { ok: false, error: data?.error } }));
        toast.error(data?.error || "Connection failed");
      }
    } catch (e) {
      const err = e instanceof Error ? e.message : "Connection failed";
      setTestStatus((s) => ({ ...s, [type]: { ok: false, error: err } }));
      toast.error(err);
    }
  }

  function handleSaveAll() {
    saveMutation.mutate(config);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Central configuration for Supabase and WhatsApp (UltraMsg). Save all, then use Test Connection to verify each group. Secret fields are only visible to admins.
      </p>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        {/* Group A: Supabase Core (Public) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Group A: Supabase Core (Public)
            </CardTitle>
            <CardDescription>
              Project URL and anon key for client and server auth.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="supabase-url">NEXT_PUBLIC_SUPABASE_URL</Label>
              <Input
                id="supabase-url"
                value={config.next_public_supabase_url}
                onChange={(e) => setConfig((c) => ({ ...c, next_public_supabase_url: e.target.value }))}
                placeholder="https://xxx.supabase.co"
                className="font-mono text-sm"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="supabase-anon">NEXT_PUBLIC_SUPABASE_ANON_KEY</Label>
              <Input
                id="supabase-anon"
                type="text"
                value={config.next_public_supabase_anon_key}
                onChange={(e) => setConfig((c) => ({ ...c, next_public_supabase_anon_key: e.target.value }))}
                placeholder="eyJ..."
                className="font-mono text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => testConnection("supabase-public")}
              >
                Test Connection
              </Button>
              {testStatus["supabase-public"] !== null && testStatus["supabase-public"] !== undefined && (
                testStatus["supabase-public"].ok ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <span title={testStatus["supabase-public"].error}>
                    <XCircle className="h-4 w-4 text-destructive" />
                  </span>
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* Group B: Supabase Admin (Secret) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Group B: Supabase Admin (Secret)
            </CardTitle>
            <CardDescription>
              Service role key for creating users and admin operations. Masked in UI.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="service-role">SUPABASE_SERVICE_ROLE_KEY</Label>
              <div className="flex gap-2">
                <Input
                  id="service-role"
                  type={showServiceRole ? "text" : "password"}
                  value={config.supabase_service_role_key}
                  onChange={(e) => setConfig((c) => ({ ...c, supabase_service_role_key: e.target.value }))}
                  placeholder="••••••••"
                  className="font-mono text-sm flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowServiceRole(!showServiceRole)}
                  title={showServiceRole ? "Hide" : "Show"}
                >
                  {showServiceRole ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => testConnection("supabase-admin")}
              >
                Test Connection
              </Button>
              {testStatus["supabase-admin"] !== null && testStatus["supabase-admin"] !== undefined && (
                testStatus["supabase-admin"].ok ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <span title={testStatus["supabase-admin"].error}>
                    <XCircle className="h-4 w-4 text-destructive" />
                  </span>
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* Group C: WhatsApp Gateway (UltraMsg) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Group C: WhatsApp Gateway (UltraMsg)
            </CardTitle>
            <CardDescription>
              Instance ID and token for UltraMsg API.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="wa-instance">WHATSAPP_INSTANCE_ID</Label>
              <Input
                id="wa-instance"
                value={config.whatsapp_instance_id}
                onChange={(e) => setConfig((c) => ({ ...c, whatsapp_instance_id: e.target.value }))}
                placeholder="instance-id"
                className="font-mono text-sm"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wa-token">WHATSAPP_TOKEN</Label>
              <div className="flex gap-2">
                <Input
                  id="wa-token"
                  type={showWhatsAppToken ? "text" : "password"}
                  value={config.whatsapp_token}
                  onChange={(e) => setConfig((c) => ({ ...c, whatsapp_token: e.target.value }))}
                  placeholder="••••••••"
                  className="font-mono text-sm flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowWhatsAppToken(!showWhatsAppToken)}
                  title={showWhatsAppToken ? "Hide" : "Show"}
                >
                  {showWhatsAppToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => testConnection("whatsapp")}
              >
                Test Connection
              </Button>
              {testStatus["whatsapp"] !== null && testStatus["whatsapp"] !== undefined && (
                testStatus["whatsapp"].ok ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <span title={testStatus["whatsapp"].error}>
                    <XCircle className="h-4 w-4 text-destructive" />
                  </span>
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSaveAll} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Saving…" : "Save All Configuration"}
        </Button>
      </div>
    </div>
  );
}
