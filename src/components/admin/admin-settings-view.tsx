"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Activity, Building2, CalendarDays, MessageCircle, Wifi } from "lucide-react";
import { SystemHealthTab } from "@/components/admin/settings/system-health-tab";
import { CompanyConfigTab } from "@/components/admin/settings/company-config-tab";
import { SystemConfig } from "@/components/admin/SystemConfig";
import { WhatsAppNotificationsTab } from "@/components/admin/settings/whatsapp-notifications-tab";
import { LeaveRulesTab } from "@/components/admin/settings/leave-rules-tab";

export function AdminSettingsView() {
  return (
    <div className="p-8 pl-[calc(16rem+2rem)]">
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <Settings className="h-7 w-7 text-primary" />
            Administration — Settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            System configuration and connectivity. Restricted to administrators.
          </p>
        </header>

        <Tabs defaultValue="health" className="w-full">
          <TabsList className="grid w-full grid-cols-2 gap-1 sm:grid-cols-3 lg:inline-grid lg:grid-cols-5">
            <TabsTrigger value="health" className="gap-2">
              <Activity className="h-4 w-4" />
              System Health
            </TabsTrigger>
            <TabsTrigger value="company" className="gap-2">
              <Building2 className="h-4 w-4" />
              Company Config
            </TabsTrigger>
            <TabsTrigger value="connectivity" className="gap-2">
              <Wifi className="h-4 w-4" />
              System Connectivity
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              WhatsApp & Notifications
            </TabsTrigger>
            <TabsTrigger value="leave" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Leave Rules
            </TabsTrigger>
          </TabsList>

          <TabsContent value="health" className="mt-6">
            <SystemHealthTab />
          </TabsContent>
          <TabsContent value="company" className="mt-6">
            <CompanyConfigTab />
          </TabsContent>
          <TabsContent value="connectivity" className="mt-6">
            <SystemConfig />
          </TabsContent>
          <TabsContent value="whatsapp" className="mt-6">
            <WhatsAppNotificationsTab />
          </TabsContent>
          <TabsContent value="leave" className="mt-6">
            <LeaveRulesTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
