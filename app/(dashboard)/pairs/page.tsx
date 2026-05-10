import { getConnector } from "@/connectors/registry";
import { requireTenant } from "@/lib/auth/requireTenant";
import { pairFeatureSupport } from "@/lib/connectors/feature-matrix";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export default async function PairsPage() {
  const { tenantId } = await requireTenant();
  const supabase = await createSupabaseServerClient();
  const { data: pairs } = await supabase
    .from("connector_pairs")
    .select(
      "id, source_connector_id, target_connector_id, feature_toggles, created_at",
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  const { data: connectors } = await supabase
    .from("connectors")
    .select("id, kind, name")
    .eq("tenant_id", tenantId);

  const byId = new Map((connectors ?? []).map((c) => [c.id, c]));

  const sampleSourceKind = "woocommerce";
  const sampleTargetKind = "exact-online";
  const sampleMatrix =
    getConnector(sampleSourceKind) && getConnector(sampleTargetKind)
      ? pairFeatureSupport(
          getConnector(sampleSourceKind)!,
          getConnector(sampleTargetKind)!,
        )
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Connector pairs
          </h1>
          <p className="text-muted-foreground text-sm">
            Pair creation UI arrives later — capability preview uses stub manifests.
          </p>
        </div>
        <Button type="button" disabled>
          Create pair
        </Button>
      </div>

      {sampleMatrix ? (
        <Card>
          <CardHeader>
            <CardTitle>Capability preview</CardTitle>
            <CardDescription>
              Woo → Exact directions intersect for default toggles.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(Object.keys(sampleMatrix) as (keyof typeof sampleMatrix)[]).map(
              (key) => (
                <Badge key={key} variant={sampleMatrix[key] ? "default" : "outline"}>
                  {key}: {sampleMatrix[key] ? "supported" : "n/a"}
                </Badge>
              ),
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Configured pairs</CardTitle>
          <CardDescription>Reads `connector_pairs` scoped by tenant.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(pairs ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    No pairs yet.
                  </TableCell>
                </TableRow>
              ) : (
                pairs!.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {byId.get(p.source_connector_id)?.name ?? p.source_connector_id}
                    </TableCell>
                    <TableCell>
                      {byId.get(p.target_connector_id)?.name ?? p.target_connector_id}
                    </TableCell>
                    <TableCell>{p.created_at}</TableCell>
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
