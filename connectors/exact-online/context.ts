import { AsyncLocalStorage } from "node:async_hooks";

export interface ExactConnectorRunContext {
  tenantId: string;
  connectorId: string;
}

export const exactRunContext = new AsyncLocalStorage<ExactConnectorRunContext>();

export function getExactRunContext(): ExactConnectorRunContext {
  const ctx = exactRunContext.getStore();
  if (!ctx) {
    throw new Error("Exact connector context missing (runWithExactContext)");
  }
  return ctx;
}

export async function runWithExactContext<T>(
  ctx: ExactConnectorRunContext,
  fn: () => Promise<T>,
): Promise<T> {
  return exactRunContext.run(ctx, fn);
}
