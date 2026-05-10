import { redirect } from "next/navigation";

import { acceptInviteFromForm } from "@/lib/actions/acceptInvite";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token) redirect("/sign-in");

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accept invite</CardTitle>
          <CardDescription>
            Join the tenant linked to this invite token (email must match).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={acceptInviteFromForm} className="space-y-4">
            <input type="hidden" name="token" value={token} />
            <Button type="submit" className="w-full">
              Accept & continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
