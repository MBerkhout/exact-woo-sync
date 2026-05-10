import { requireTenant } from "@/lib/auth/requireTenant";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const connectorId =
    typeof sp.connector === "string" ? sp.connector : undefined;
  const pairId = typeof sp.pair === "string" ? sp.pair : undefined;
  const errorsOnly = sp.errors === "true";

  const { tenantId } = await requireTenant();
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("sync_logs")
    .select(
      "id, connector_id, pair_id, direction, entity_kind, entity_id, status, created_at",
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (status) query = query.eq("status", status);
  if (connectorId) query = query.eq("connector_id", connectorId);
  if (pairId) query = query.eq("pair_id", pairId);
  if (errorsOnly) query = query.neq("status", "success");

  const { data: logs } = await query;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sync logs</h1>
        <p className="text-muted-foreground text-sm">
          Payloads are stored redacted server-side (`sync_logs.redacted_payload`).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Query params: `status`, `connector`, `pair`, `errors=true`.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap gap-3">
            <Input name="status" placeholder="status (success|retry|failed)" />
            <Input name="connector" placeholder="connector uuid" />
            <Input name="pair" placeholder="pair uuid" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="errors" value="true" />
              Errors only
            </label>
            <button
              type="submit"
              className="bg-primary text-primary-foreground inline-flex h-9 items-center rounded-md px-4 text-sm"
            >
              Apply
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent entries</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Direction</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(logs ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No logs yet.
                  </TableCell>
                </TableRow>
              ) : (
                logs!.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.created_at}</TableCell>
                    <TableCell>{log.status}</TableCell>
                    <TableCell>
                      {log.entity_kind ?? "—"} {log.entity_id ?? ""}
                    </TableCell>
                    <TableCell>{log.direction}</TableCell>
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
