import { WikiView } from "@/components/wiki/wiki-view";

export const dynamic = "force-dynamic";

export default function WikiPage() {
  return (
    <div className="min-h-screen">
      <WikiView />
    </div>
  );
}
