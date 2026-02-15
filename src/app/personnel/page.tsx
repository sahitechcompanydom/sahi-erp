import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function PersonnelRedirectPage() {
  redirect("/admin/personnel");
}
