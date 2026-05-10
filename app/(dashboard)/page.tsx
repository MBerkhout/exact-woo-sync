import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle>Connector health</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          No connectors configured yet.
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent sync activity</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Empty — webhooks enqueue jobs only in Phase 4+.
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Error count (24h)</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">0</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Queue depth</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Inspect via pg_cron drain API / SQL (`pgmq.metrics`).
        </CardContent>
      </Card>
    </div>
  );
}
