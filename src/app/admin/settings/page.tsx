import { AdminSettingsView } from "@/components/admin/admin-settings-view";

export const dynamic = "force-dynamic";

export default function AdminSettingsPage() {
  return (
    <div className="min-h-screen">
      <AdminSettingsView />
    </div>
  );
}
