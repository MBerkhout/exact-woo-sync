"use client";

import { useTransition } from "react";

import { triggerTestWooWebhook } from "@/lib/actions/connectors";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function TestWooWebhookButton({ connectorId }: { connectorId: string }) {
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            await triggerTestWooWebhook(connectorId);
            toast.success("Synthetic webhook accepted (202)");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Test failed");
          }
        })
      }
    >
      {pending ? "Testing…" : "Test webhook"}
    </Button>
  );
}
