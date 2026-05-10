import type { TenantRole } from "@/lib/auth/requireTenant";
import { requireTenant } from "@/lib/auth/requireTenant";

export async function requireRole(atLeast: TenantRole): Promise<
  Awaited<ReturnType<typeof requireTenant>>
> {
  const ctx = await requireTenant();
  if (atLeast === "viewer") return ctx;
  if (ctx.role !== "admin") {
    throw new Error("Forbidden");
  }
  return ctx;
}
