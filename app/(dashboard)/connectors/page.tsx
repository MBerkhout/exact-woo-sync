import Link from "next/link";

import { requireTenant } from "@/lib/auth/requireTenant";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default async function ConnectorsPage() {
  const { tenantId, role } = await requireTenant();
  const supabase = await createSupabaseServerClient();
  const { data: connectors } = await supabase
    .from("connectors")
    .select("id, kind, name, status, version, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Connectors</h1>
          <p className="text-muted-foreground text-sm">
            WooCommerce (REST keys + signed webhooks) is available; Exact Online remains Phase 3.
          </p>
        </div>
        {role === "admin" ? (
          <Link className={cn(buttonVariants())} href="/connectors/new">
            Add connector
          </Link>
        ) : (
          <Button type="button" disabled>
            Add connector
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stores &amp; administrations</CardTitle>
          <CardDescription>
            Each row is a configured connector instance for this tenant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(connectors ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No connectors yet.
                  </TableCell>
                </TableRow>
              ) : (
                connectors!.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {role === "admin" ? (
                        <Link className="underline" href={`/connectors/${c.id}`}>
                          {c.name}
                        </Link>
                      ) : (
                        c.name
                      )}
                    </TableCell>
                    <TableCell>{c.kind}</TableCell>
                    <TableCell>{c.version}</TableCell>
                    <TableCell>{c.status}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
