"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { API_CONFIG_KEYS } from "@/lib/api-config-keys";

const SUGGESTED_KEYS = [
  { name: API_CONFIG_KEYS.SUPABASE_SERVICE_ROLE_KEY, description: "Supabase service_role secret (for creating users)" },
  { name: API_CONFIG_KEYS.ULTRAMSG_TOKEN, description: "UltraMsg API token for WhatsApp" },
  { name: API_CONFIG_KEYS.WHATSAPP_INSTANCE_ID, description: "UltraMsg instance ID" },
];

type ConfigRow = {
  key_name: string;
  key_value: string;
  is_secret: boolean;
  updated_at: string;
};

export function ApiSecretsTab() {
  const queryClient = useQueryClient();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [keyName, setKeyName] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [isSecret, setIsSecret] = useState(true);
  const [showValue, setShowValue] = useState(false);

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["api_configurations"],
    queryFn: async (): Promise<ConfigRow[]> => {
      const res = await fetch("/api/admin/api-configurations");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to load");
      }
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { key_name: string; key_value: string; is_secret: boolean }) => {
      const res = await fetch("/api/admin/api-configurations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to save");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api_configurations"] });
      setEditingKey(null);
      setKeyName("");
      setKeyValue("");
      setShowValue(false);
      toast.success("Saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function startEdit(key: ConfigRow) {
    setEditingKey(key.key_name);
    setKeyName(key.key_name);
    setKeyValue(""); // leave empty so we keep existing unless user types
    setIsSecret(key.is_secret);
    setShowValue(false);
  }

  function startAdd() {
    setEditingKey("");
    setKeyName("");
    setKeyValue("");
    setIsSecret(true);
    setShowValue(false);
  }

  function handleSave() {
    const name = keyName.trim();
    if (!name) {
      toast.error("Key name is required");
      return;
    }
    const value = editingKey && keyValue === "" ? "••••••••" : keyValue;
    saveMutation.mutate({ key_name: name, key_value: value, is_secret: isSecret });
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          API & System Secrets
        </CardTitle>
        <CardDescription>
          Store API keys and secrets in the database. Used for Supabase admin (create user) and WhatsApp (UltraMsg). Leave value as •••••••• to keep existing secret.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Configured keys</h4>
            <Button variant="outline" size="sm" onClick={startAdd}>
              Add key
            </Button>
          </div>
          <ul className="rounded-md border border-border divide-y divide-border">
            {list.length === 0 && editingKey !== "" ? (
              <li className="px-4 py-3 text-sm text-muted-foreground">No keys yet. Add one below.</li>
            ) : (
              list.map((row) => (
                <li key={row.key_name} className="px-4 py-3 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-mono text-sm">{row.key_name}</span>
                    {row.is_secret && (
                      <span className="ml-2 text-xs text-muted-foreground">(secret)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground font-mono">
                      {row.is_secret ? row.key_value : row.key_value || "(empty)"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(row)}
                    >
                      Edit
                    </Button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        {editingKey !== null && (
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
            <h4 className="text-sm font-medium">
              {editingKey === "" ? "Add key" : `Edit ${editingKey}`}
            </h4>
            <div className="grid gap-2">
              <Label>Key name</Label>
              {editingKey === "" ? (
                <>
                  <Input
                    placeholder="e.g. SUPABASE_SERVICE_ROLE"
                    value={keyName}
                    onChange={(e) => {
                      const v = e.target.value;
                      setKeyName(v);
                      const suggested = SUGGESTED_KEYS.find((k) => k.name === v);
                      if (suggested) setIsSecret(v !== API_CONFIG_KEYS.WHATSAPP_INSTANCE_ID);
                    }}
                    className="font-mono"
                    list="suggested-keys"
                  />
                  <datalist id="suggested-keys">
                    {SUGGESTED_KEYS.map((k) => (
                      <option key={k.name} value={k.name} />
                    ))}
                  </datalist>
                  {keyName && (
                    <p className="text-xs text-muted-foreground">
                      {SUGGESTED_KEYS.find((k) => k.name === keyName)?.description}
                    </p>
                  )}
                </>
              ) : (
                <Input value={keyName} readOnly className="font-mono bg-muted" />
              )}
            </div>
            <div className="grid gap-2">
              <Label>Value</Label>
              <div className="flex gap-2">
                <Input
                  type={showValue ? "text" : "password"}
                  value={keyValue}
                  onChange={(e) => setKeyValue(e.target.value)}
                  placeholder={editingKey && editingKey !== "" ? "Leave blank to keep current" : "Paste value"}
                  className="font-mono flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowValue(!showValue)}
                  title={showValue ? "Hide" : "Show"}
                >
                  {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="api-secret-checkbox"
                checked={isSecret}
                onChange={(e) => setIsSecret(e.target.checked)}
                className="rounded border-input"
              />
              <Label htmlFor="api-secret-checkbox" className="text-sm font-normal">
                Mask value in UI (secret)
              </Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : "Save"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditingKey(null);
                  setKeyName("");
                  setKeyValue("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
