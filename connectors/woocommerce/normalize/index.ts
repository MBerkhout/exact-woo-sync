import { normalizeWooCustomer } from "@/connectors/woocommerce/normalize/customer";
import { normalizeWooOrder } from "@/connectors/woocommerce/normalize/order";
import { normalizeWooProduct } from "@/connectors/woocommerce/normalize/product";
import { normalizeWooRefund } from "@/connectors/woocommerce/normalize/refund";
import type { EntityKind } from "@/connectors/_contract/v1";

export interface NormalizedWebhookPayload {
  topic: string;
  entityKind: EntityKind;
  entityId: string;
  payload: unknown;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return null;
}

function strId(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "string" && v.length) return v;
  return "";
}

function topicEntityKind(topic: string): EntityKind | null {
  const [resource] = topic.split(".", 2);
  if (resource === "order") {
    if (topic === "order.refunded") return "refund";
    return "order";
  }
  if (resource === "product") return "product";
  if (resource === "customer") return "customer";
  return null;
}

export function normalizeWooWebhook(
  rawBody: unknown,
  headers: Headers,
): NormalizedWebhookPayload | null {
  const topic = headers.get("x-wc-webhook-topic") ?? "";
  if (!topic) return null;

  const kind = topicEntityKind(topic);
  if (!kind) return null;

  if (kind === "order") {
    const payload = normalizeWooOrder(rawBody);
    if (!payload.id) return null;
    return { topic, entityKind: "order", entityId: payload.id, payload };
  }
  if (kind === "product") {
    const payload = normalizeWooProduct(rawBody);
    if (!payload.id) return null;
    return { topic, entityKind: "product", entityId: payload.id, payload };
  }
  if (kind === "customer") {
    const payload = normalizeWooCustomer(rawBody);
    if (!payload.id) return null;
    return { topic, entityKind: "customer", entityId: payload.id, payload };
  }
  const order = asRecord(rawBody) ?? {};
  const orderId = strId(order.id);
  if (!orderId) return null;
  const refundsRaw = order.refunds;
  const lastRefund = Array.isArray(refundsRaw) ? refundsRaw[refundsRaw.length - 1] : null;
  const payload = normalizeWooRefund(lastRefund ?? {}, orderId);
  return { topic, entityKind: "refund", entityId: payload.id, payload };
}

export { normalizeWooCustomer } from "@/connectors/woocommerce/normalize/customer";
export { normalizeWooOrder } from "@/connectors/woocommerce/normalize/order";
export { normalizeWooProduct } from "@/connectors/woocommerce/normalize/product";
export { normalizeWooRefund } from "@/connectors/woocommerce/normalize/refund";
