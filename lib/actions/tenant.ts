"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/requireUser";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { CURRENT_TENANT_COOKIE } from "@/lib/tenant/constants";

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 365,
};

export async function createTenant(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Tenant name required");

  const user = await requireUser();
  const admin = createSupabaseServiceRoleClient();

  const { data: tenant, error: te } = await admin
    .from("tenants")
    .insert({ name })
    .select("id")
    .single();

  if (te || !tenant) throw te ?? new Error("tenant insert failed");

  const { error: me } = await admin.from("tenant_members").insert({
    tenant_id: tenant.id,
    user_id: user.id,
    role: "admin",
  });

  if (me) throw me;

  const store = await cookies();
  store.set(CURRENT_TENANT_COOKIE, tenant.id, cookieOpts);

  redirect("/");
}

export async function switchTenant(formData: FormData) {
  const tenantId = String(formData.get("tenantId") ?? "").trim();
  if (!tenantId) throw new Error("tenantId required");

  const user = await requireUser();
  const supabase = createSupabaseServiceRoleClient();

  const { data, error } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) throw new Error("Not a member of this tenant");

  const store = await cookies();
  store.set(CURRENT_TENANT_COOKIE, tenantId, cookieOpts);

  redirect("/");
}
