"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell } from "lucide-react";

export function NotificationKeysTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Keys
        </CardTitle>
        <CardDescription>
          WhatsApp (Twilio/UltraMsg) and SMTP mail settings. (Placeholder — save not implemented.)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="text-sm font-medium">WhatsApp API (Twilio / UltraMsg)</h4>
          <div className="grid gap-2">
            <Label htmlFor="wa-api-key">API Key</Label>
            <Input id="wa-api-key" type="password" placeholder="••••••••" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="wa-api-secret">API Secret / Token</Label>
            <Input id="wa-api-secret" type="password" placeholder="••••••••" />
          </div>
        </div>
        <div className="space-y-4">
          <h4 className="text-sm font-medium">SMTP Mail</h4>
          <div className="grid gap-2">
            <Label htmlFor="smtp-host">SMTP Host</Label>
            <Input id="smtp-host" placeholder="smtp.example.com" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="smtp-user">Username</Label>
            <Input id="smtp-user" placeholder="user@example.com" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="smtp-pass">Password</Label>
            <Input id="smtp-pass" type="password" placeholder="••••••••" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
