import { processInboundWebhook } from "@/lib/webhooks/processInboundWebhook";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ connectorId: string }> },
) {
  const { connectorId } = await ctx.params;
  return processInboundWebhook({
    platform: "woocommerce",
    connectorId,
    request: req,
  });
}
