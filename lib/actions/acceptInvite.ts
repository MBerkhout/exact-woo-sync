"use server";

import { createHash } from "crypto";

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

export async function acceptInviteFromForm(formData: FormData) {
  const user = await requireUser();
  const token = String(formData.get("token") ?? "").trim();
  if (!token) throw new Error("Missing token");

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const admin = createSupabaseServiceRoleClient();

  const { data: invite, error } = await admin
    .from("tenant_invites")
    .select("*")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !invite) throw new Error("Invalid or expired invite");
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    throw new Error("Invite expired");
  }

  if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    throw new Error("Signed-in email does not match invite");
  }

  const { error: memberErr } = await admin.from("tenant_members").insert({
    tenant_id: invite.tenant_id,
    user_id: user.id,
    role: invite.role,
  });

  if (memberErr) throw memberErr;

  await admin.from("tenant_invites").delete().eq("id", invite.id);

  const store = await cookies();
  store.set(CURRENT_TENANT_COOKIE, invite.tenant_id, cookieOpts);

  redirect("/");
}
