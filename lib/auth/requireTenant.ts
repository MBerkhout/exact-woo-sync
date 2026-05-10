import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getCurrentTenantIdFromCookies } from "@/lib/tenant/currentTenant";

export type TenantRole = "admin" | "viewer";

export interface TenantContext {
  tenantId: string;
  role: TenantRole;
}

/**
 * Resolves tenant context from membership + optional cookie.
 * Cookie must be set via `switchTenant` server action (cannot mutate cookies during RSC render).
 */
export async function requireTenant(): Promise<TenantContext> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  let tenantId = await getCurrentTenantIdFromCookies();
  const { data: memberships, error } = await supabase
    .from("tenant_members")
    .select("tenant_id, role")
    .eq("user_id", user.id);

  if (error) throw error;
  if (!memberships?.length) {
    throw new Error("No tenant membership");
  }

  const ids = new Set(memberships.map((m) => m.tenant_id));
  if (!tenantId || !ids.has(tenantId)) {
    tenantId = memberships[0].tenant_id;
  }

  const membership = memberships.find((m) => m.tenant_id === tenantId)!;

  return {
    tenantId,
    role: membership.role as TenantRole,
  };
}
