import { redirect } from "next/navigation";
import { verifyAdmin } from "../../lib/supabase-server";
import AdminDashboard from "../components/AdminDashboard";

export const metadata = { title: "ScareSafe Admin", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const admin = await verifyAdmin();
  if (!admin) redirect("/admin/login");
  return <AdminDashboard email={admin.user.email ?? "Administrator"} />;
}
