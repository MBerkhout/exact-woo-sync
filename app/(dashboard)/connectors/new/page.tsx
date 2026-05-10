import Link from "next/link";

import { createWooConnector } from "@/lib/actions/connectors";
import { requireRole } from "@/lib/auth/requireRole";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default async function NewConnectorPage() {
  await requireRole("admin");

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add connector</h1>
        <p className="text-muted-foreground text-sm">Phase 2 ships WooCommerce; more kinds follow later.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>WooCommerce</CardTitle>
          <CardDescription>
            Creates an inactive connector shell. You will land on the credentials wizard next.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createWooConnector} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display name</Label>
              <Input id="name" name="name" placeholder="Main storefront" required />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="submit">Continue</Button>
              <Link className={cn(buttonVariants({ variant: "outline" }))} href="/connectors">
                Cancel
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
