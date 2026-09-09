import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import AdminDashboardClient from "./AdminDashboardClient";

export default async function AdminDashboardPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/devside");
  }

  return <AdminDashboardClient username={session.username} />;
}
