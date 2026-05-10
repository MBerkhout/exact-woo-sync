import Link from "next/link";
import { notFound } from "next/navigation";

import { TestWooWebhookButton } from "@/components/test-woo-webhook-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveWooCredentials } from "@/lib/actions/connectors";
import { disconnectExactConnector } from "@/lib/actions/connectors/exact";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/auth/requireTenant";
import { cn } from "@/lib/utils";

export default async function ConnectorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { tenantId, role } = await requireTenant();
  const isAdmin = role === "admin";

  const supabase = await createSupabaseServerClient();
  const { data: row } = await supabase
    .from("connectors")
    .select("id, kind, name, status, version, config, created_at")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();

  if (!row) notFound();

  if (row.kind === "woocommerce") {
    if (!isAdmin) notFound();

    const cfg = (row.config ?? {}) as Record<string, unknown>;
    const baseUrl = typeof cfg.baseUrl === "string" ? cfg.baseUrl : "";

    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{row.name}</h1>
            <p className="text-muted-foreground text-sm">
              WooCommerce · status: <span className="font-mono text-xs">{row.status}</span>
            </p>
          </div>
          <Link className={cn(buttonVariants({ variant: "outline" }))} href="/connectors">
            Back
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>REST credentials</CardTitle>
            <CardDescription>
              Consumer key/secret never appear in logs; they are encrypted at rest.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={saveWooCredentials} className="space-y-4">
              <input type="hidden" name="connectorId" value={row.id} />
              <div className="space-y-2">
                <Label htmlFor="baseUrl">Store base URL</Label>
                <Input
                  id="baseUrl"
                  name="baseUrl"
                  type="url"
                  placeholder="https://store.example.com"
                  defaultValue={baseUrl}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="consumerKey">Consumer key</Label>
                <Input id="consumerKey" name="consumerKey" autoComplete="off" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="consumerSecret">Consumer secret</Label>
                <Input id="consumerSecret" name="consumerSecret" type="password" autoComplete="off" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhookSecret">Webhook secret</Label>
                <Input id="webhookSecret" name="webhookSecret" type="password" autoComplete="off" required />
              </div>
              <Button type="submit">Save &amp; health check</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Webhook smoke test</CardTitle>
            <CardDescription>
              Posts a synthetic signed payload to{" "}
              <code className="text-xs">/api/webhooks/woocommerce/{row.id}</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <TestWooWebhookButton connectorId={row.id} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (row.kind === "exact-online") {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{row.name}</h1>
            <p className="text-muted-foreground text-sm">
              {row.kind} · {row.status} · v{row.version}
            </p>
          </div>
          {isAdmin ? (
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

  notFound();
}
