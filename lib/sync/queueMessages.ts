import type { EntityKind } from "@/connectors/_contract/v1";

export const INBOUND_MAX_ATTEMPTS = 5;

export interface InboundQueueMessage {
  platform: "woocommerce" | "exact-online";
  connectorId: string;
  tenantId: string;
  deliveryId: string;
  receivedAt: string;
  topic: string;
  entityKind: EntityKind;
  entityId: string;
  payload: unknown;
  attempts?: number;
}

export interface OutboundQueueMessage {
  tenantId: string;
  pairId: string;
  sourceConnectorId: string;
  targetConnectorId: string;
  targetKind: string;
  entityKind: EntityKind;
  entityId: string;
  payload: unknown;
  attempts?: number;
}
