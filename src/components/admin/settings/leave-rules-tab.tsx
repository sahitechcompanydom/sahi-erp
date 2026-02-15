"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays } from "lucide-react";

export function LeaveRulesTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Leave Rules
        </CardTitle>
        <CardDescription>
          Define the work-to-leave rule (e.g. 80 days work = 10 days leave). (Placeholder — save not implemented.)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="work-days">Days of work required</Label>
          <Input id="work-days" type="number" placeholder="80" defaultValue="80" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="leave-days">Leave days earned</Label>
          <Input id="leave-days" type="number" placeholder="10" defaultValue="10" />
        </div>
        <p className="text-sm text-muted-foreground">
          Example: 80 days work = 10 days leave.
        </p>
      </CardContent>
    </Card>
  );
}
