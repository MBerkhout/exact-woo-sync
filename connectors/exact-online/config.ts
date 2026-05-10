/** Exact Online regions supported for production OAuth + API hosts. */
export type ExactRegion = "nl" | "be" | "de" | "uk" | "es" | "fr" | "com";

export type ExactEnv = "production" | "sandbox";

/** Webhook subscription topics provisioned on connect (§7.4). */
export const EXACT_WEBHOOK_TOPICS = [
  "Items",
  "Accounts",
  "SalesOrders",
  "SalesInvoices",
  "StockPositions",
  "SalesItemPrices",
] as const;

export type ExactWebhookTopic = (typeof EXACT_WEBHOOK_TOPICS)[number];

const REGION_HOST: Record<ExactRegion, string> = {
  nl: "start.exactonline.nl",
  be: "start.exactonline.be",
  de: "start.exactonline.de",
  uk: "start.exactonline.co.uk",
  es: "start.exactonline.es",
  fr: "start.exactonline.fr",
  com: "start.exactonline.com",
};

/** Sandbox/test administrations use the NL stack only (per product constraints). */
const SANDBOX_HOST = REGION_HOST.nl;

export function assertSandboxRegion(region: ExactRegion): void {
  if (region !== "nl") {
    throw new Error("Exact Online sandbox is only available for the NL region");
  }
}

export function exactApiHost(region: ExactRegion, env: ExactEnv): string {
  if (env === "sandbox") {
    assertSandboxRegion(region);
    return SANDBOX_HOST;
  }
  return REGION_HOST[region];
}

export function exactAuthorizeUrl(region: ExactRegion, env: ExactEnv): string {
  const host = exactApiHost(region, env);
  return `https://${host}/api/oauth2/auth`;
}

export function exactTokenUrl(region: ExactRegion, env: ExactEnv): string {
  const host = exactApiHost(region, env);
  return `https://${host}/api/oauth2/token`;
}

export function exactRestBaseUrl(region: ExactRegion, env: ExactEnv): string {
  const host = exactApiHost(region, env);
  return `https://${host}/api/v1`;
}
