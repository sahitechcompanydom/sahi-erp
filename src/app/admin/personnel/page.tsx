import { PersonnelView } from "@/components/personnel/personnel-view";

export const dynamic = "force-dynamic";

export default function AdminPersonnelPage() {
  return (
    <div className="min-h-screen">
      <PersonnelView />
    </div>
  );
}
