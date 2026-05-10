import { AsyncLocalStorage } from "node:async_hooks";

import type postgres from "postgres";

import type { WooCredentials } from "@/connectors/woocommerce/credentials";

export interface WooWorkerContext {
  sql: postgres.Sql;
  tenantId: string;
  connectorId: string;
  baseUrl: string;
  credentials: WooCredentials;
  rateLimitRps: number;
  suppressionMs: number;
}

const storage = new AsyncLocalStorage<WooWorkerContext>();

export function runWithWooContext<T>(ctx: WooWorkerContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export async function runWithWooContextAsync<T>(
  ctx: WooWorkerContext,
  fn: () => Promise<T>,
): Promise<T> {
  return storage.run(ctx, fn);
}

export function getWooCtx(): WooWorkerContext {
  const ctx = storage.getStore();
  if (!ctx) {
    throw new Error("WooCommerce worker context is not set");
  }
  return ctx;
}
