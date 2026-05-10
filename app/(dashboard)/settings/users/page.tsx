import { requireTenant } from "@/lib/auth/requireTenant";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

export default async function UsersSettingsPage() {
  await requireTenant();
  const supabase = await createSupabaseServerClient();
  const { data: members } = await supabase
    .from("tenant_members")
    .select("user_id, role, created_at");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground text-sm">
          Invite emails + role changes use service-role actions (Phase 1 lists membership IDs only).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Supabase Auth emails require service-role `auth.admin`; UI enhancement tracked for Phase 8.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(members ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    No rows returned.
                  </TableCell>
                </TableRow>
              ) : (
                members!.map((m) => (
                  <TableRow key={m.user_id}>
                    <TableCell className="font-mono text-xs">{m.user_id}</TableCell>
                    <TableCell>{m.role}</TableCell>
                    <TableCell>{m.created_at}</TableCell>
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
