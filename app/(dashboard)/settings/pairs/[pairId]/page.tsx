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

export default async function PairSettingsPage({
  params,
}: {
  params: Promise<{ pairId: string }>;
}) {
  const { tenantId } = await requireTenant();
  const { pairId } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: pair } = await supabase
    .from("connector_pairs")
    .select("id, feature_toggles, settings, created_at")
    .eq("tenant_id", tenantId)
    .eq("id", pairId)
    .maybeSingle();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/pairs" className="text-muted-foreground text-sm underline">
          ← Back to pairs
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Pair settings</CardTitle>
          <CardDescription>
            Status maps + filters + customer toggles ship with sync engine milestones.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <span className="text-muted-foreground">Pair ID</span>
            <pre className="bg-muted mt-1 rounded-md p-3 text-xs">{pair?.id ?? "not found"}</pre>
          </div>
          <div>
            <span className="text-muted-foreground">feature_toggles</span>
            <pre className="bg-muted mt-1 max-h-48 overflow-auto rounded-md p-3 text-xs">
              {JSON.stringify(pair?.feature_toggles ?? {}, null, 2)}
            </pre>
          </div>
          <div>
            <span className="text-muted-foreground">settings</span>
            <pre className="bg-muted mt-1 max-h-48 overflow-auto rounded-md p-3 text-xs">
              {JSON.stringify(pair?.settings ?? {}, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
