import { cookies } from "next/headers";

import { CURRENT_TENANT_COOKIE } from "@/lib/tenant/constants";

export async function getCurrentTenantIdFromCookies(): Promise<string | null> {
  const store = await cookies();
  return store.get(CURRENT_TENANT_COOKIE)?.value ?? null;
}

export async function setCurrentTenantCookie(tenantId: string): Promise<void> {
  const store = await cookies();
  store.set(CURRENT_TENANT_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
}
