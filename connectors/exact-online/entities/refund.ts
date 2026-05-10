import type { EntityOps } from "@/connectors/_contract/v1";

import { exactRestBaseUrl } from "../config";
import { getExactRunContext } from "../context";
import { createExactRateLimitedHttpClient, lockedRefreshExactSecretsIfNeeded } from "../http";
import {
  jsonReadHeaders,
  jsonWriteHeaders,
  odataGuidKey,
  readODataCreate,
  readODataRecord,
  readODataUpdate,
} from "./_canonical";

const http = createExactRateLimitedHttpClient();

async function apiRoot(): Promise<string> {
  const { connectorId } = getExactRunContext();
  const s = await lockedRefreshExactSecretsIfNeeded(connectorId);
  const base = exactRestBaseUrl(s.region, s.env);
  return `${base}/${s.division}`;
}

export const exactRefundEntityOps: EntityOps = {
  async fetch(id: string) {
    const root = await apiRoot();
    const u = `${root}/${odataGuidKey("salesentry/SalesCreditNotes", id)}`;
    const res = await http.request(new Request(u, { headers: jsonReadHeaders() }));
    return readODataRecord(res);
  },
  async create(payload: unknown) {
    const root = await apiRoot();
    const u = `${root}/salesentry/SalesCreditNotes`;
    const res = await http.request(
      new Request(u, { method: "POST", headers: jsonWriteHeaders(), body: JSON.stringify(payload) }),
    );
    return readODataCreate(res);
  },
  async update(id: string, patch: unknown) {
    const root = await apiRoot();
    const u = `${root}/${odataGuidKey("salesentry/SalesCreditNotes", id)}`;
    const res = await http.request(
      new Request(u, {
        method: "PUT",
        headers: jsonWriteHeaders(),
        body: JSON.stringify(patch),
      }),
    );
    return readODataUpdate(res);
  },
};
