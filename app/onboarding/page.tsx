import Link from "next/link";

import { createTenant } from "@/lib/actions/tenant";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function OnboardingPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Onboarding</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Phase 1 skeleton: create a tenant, then continue with connector wizard placeholders.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Create tenant</CardTitle>
          <CardDescription>
            Adds a `tenants` row and makes you `admin` via service-role insert.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createTenant} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="name">Organization name</Label>
              <Input id="name" name="name" required placeholder="Acme BV" />
            </div>
            <Button type="submit">Create tenant</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="opacity-70">
        <CardHeader>
          <CardTitle>2. Invite users</CardTitle>
          <CardDescription>
            UI wiring lands with `/settings/users`; tokens are hashed server-side.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="secondary" disabled>
            Coming soon
          </Button>
        </CardContent>
      </Card>

      <Card className="opacity-70">
        <CardHeader>
          <CardTitle>3. Connect WooCommerce</CardTitle>
          <CardDescription>
            Consumer key/secret + webhook subscription (Phase 2).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/connectors"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Open connectors
          </Link>
        </CardContent>
      </Card>

      <Card className="opacity-70">
        <CardHeader>
          <CardTitle>4. Connect Exact Online</CardTitle>
          <CardDescription>
            OAuth per region + prod/test toggle (Phase 3).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/connectors"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Open connectors
          </Link>
        </CardContent>
      </Card>

      <Card className="opacity-70">
        <CardHeader>
          <CardTitle>5. First connector pair</CardTitle>
          <CardDescription>
            Feature toggles respect connector capability matrix (§8.3).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/pairs"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Open pairs
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
