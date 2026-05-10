import { createHmac, timingSafeEqual } from "node:crypto";

import type { EntityKind } from "@/connectors/_contract/v1";

function extractContentAndHashFromRaw(raw: string): { contentPart: string; hash: string } | null {
  const trimmed = raw.trim();
  const re = /^\{"Content":([\s\S]*),"HashCode":"([^"]+)"\}\s*$/;
  const m = trimmed.match(re);
  if (!m) return null;
  return { contentPart: m[1], hash: m[2] };
}

export async function verifyExactWebhookSignature(input: {
  rawBody: Uint8Array | string;
  secret: string;
}): Promise<boolean> {
  if (!input.secret) return false;
  const raw =
    typeof input.rawBody === "string"
      ? input.rawBody
      : new TextDecoder().decode(input.rawBody);
  const parsed = extractContentAndHashFromRaw(raw);
  if (!parsed) return false;
  const expected = createHmac("sha256", input.secret)
    .update(parsed.contentPart, "utf8")
    .digest("hex")
    .toUpperCase();
  const received = parsed.hash.trim().toUpperCase();
  if (expected.length !== received.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  } catch {
    return false;
  }
}

const TOPIC_TO_ENTITY: Record<string, EntityKind> = {
  Items: "product",
  Accounts: "customer",
  SalesOrders: "order",
  SalesInvoices: "order",
  StockPositions: "stock",
  SalesItemPrices: "price",
};

function topicFromContent(content: unknown): string | null {
  if (!content || typeof content !== "object") return null;
  const c = content as Record<string, unknown>;
  const direct = c.Topic ?? c.Key;
  if (typeof direct === "string") return direct;
  return null;
}

function resourceIdFromContent(content: unknown): string | null {
  if (!content || typeof content !== "object") return null;
  const c = content as Record<string, unknown>;
  const id = c.ID ?? c.Id ?? c.id;
  if (typeof id === "string" && id.length) return id;
  if (typeof id === "number" && Number.isFinite(id)) return String(id);
  return null;
}

export function normalizeExactWebhookPayload(rawBody: unknown): unknown {
  const content =
    rawBody && typeof rawBody === "object" && rawBody !== null && "Content" in rawBody
      ? (rawBody as { Content: unknown }).Content
      : rawBody;
  const topic = topicFromContent(content);
  const entityKind =
    topic && typeof topic === "string" && topic in TOPIC_TO_ENTITY
      ? TOPIC_TO_ENTITY[topic]
      : null;
  return {
    source: "exact-online",
    topic,
    entityKind,
    resourceId: resourceIdFromContent(content),
    content,
  };
}