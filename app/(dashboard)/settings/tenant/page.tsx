import Link from "next/link";

import { requireTenant } from "@/lib/auth/requireTenant";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function TenantSettingsPage() {
  const { tenantId } = await requireTenant();
  const supabase = await createSupabaseServerClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, created_at")
    .eq("id", tenantId)
    .maybeSingle();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tenant settings</h1>
        <p className="text-muted-foreground text-sm">
          Rename + billing hooks arrive later.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>Read-only in Phase 1 shell.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Name</span>
            <div className="font-medium">{tenant?.name ?? "—"}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Created</span>
            <div className="font-mono text-xs">{tenant?.created_at ?? "—"}</div>
          </div>
          <Link href="/settings/users" className="text-primary text-sm underline">
            Manage users
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
