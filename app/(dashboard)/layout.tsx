import { DashboardShell } from "@/components/dashboard-shell";
import { requireDashboardTenant } from "@/lib/auth/requireDashboardTenant";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await requireDashboardTenant();
  return <DashboardShell role={tenant.role}>{children}</DashboardShell>;
}
