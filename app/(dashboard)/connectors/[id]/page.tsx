import Link from "next/link";
import { notFound } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { disconnectExactConnector } from "@/lib/actions/connectors/exact";
import { requireTenant } from "@/lib/auth/requireTenant";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function ConnectorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { tenantId, role } = await requireTenant();
  const supabase = await createSupabaseServerClient();
  const { data: row } = await supabase
    .from("connectors")
    .select("id, kind, name, status, version, config, created_at")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();

  if (!row) notFound();

  const isExact = row.kind === "exact-online";
  const isAdmin = role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{row.name}</h1>
          <p className="text-muted-foreground text-sm">
            {row.kind} · {row.status} · v{row.version}
          </p>
        </div>
        {isAdmin && isExact ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/api/oauth/exact/start?connector_id=${encodeURIComponent(row.id)}`}
              className={cn(buttonVariants({ variant: "default" }))}
            >
              Reconnect OAuth
            </Link>
            <form action={disconnectExactConnector}>
              <input type="hidden" name="connectorId" value={row.id} />
              <Button type="submit" variant="destructive">
                Disconnect
              </Button>
            </form>
          </div>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>Non-secret fields stored on the connector row.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted text-muted-foreground overflow-x-auto rounded-lg p-3 text-xs">
            {JSON.stringify(row.config ?? {}, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <div>
        <Link href="/connectors" className={cn(buttonVariants({ variant: "outline" }))}>
          Back to connectors
        </Link>
      </div>
    </div>
  );
}
