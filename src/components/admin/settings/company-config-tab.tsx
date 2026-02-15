"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2 } from "lucide-react";

export function CompanyConfigTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Company Config
        </CardTitle>
        <CardDescription>
          Company name, logo, and timezone. (Placeholder — save not implemented.)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="company-name">Company Name</Label>
          <Input id="company-name" placeholder="e.g. Sahi Company" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="company-logo">Logo upload</Label>
          <Input id="company-logo" type="file" accept="image/*" className="cursor-pointer" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Input id="timezone" placeholder="e.g. Asia/Kolkata" />
        </div>
      </CardContent>
    </Card>
  );
}
