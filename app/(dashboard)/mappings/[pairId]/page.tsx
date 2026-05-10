import { requireTenant } from "@/lib/auth/requireTenant";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function MappingPlaceholderPage({
  params,
}: {
  params: Promise<{ pairId: string }>;
}) {
  const { pairId } = await params;
  await requireTenant();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mappings</CardTitle>
        <CardDescription>
          Pair <span className="font-mono text-xs">{pairId}</span> — dual-column tables +
          AI-assisted drafts ship in Phase 7.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        Countries, VAT codes, currencies, shipping methods, statuses, and custom fields
        will be editable here per connector pair revision.
      </CardContent>
    </Card>
  );
}
