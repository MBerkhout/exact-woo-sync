import { redirect } from "next/navigation";

import { requireTenant, type TenantContext } from "@/lib/auth/requireTenant";

/** Dashboard routes: send users without membership through onboarding. */
export async function requireDashboardTenant(): Promise<TenantContext> {
  try {
    return await requireTenant();
  } catch {
    redirect("/onboarding");
  }
}
