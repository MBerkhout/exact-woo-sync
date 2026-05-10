import {
  exactAuthorizeUrl,
  exactRestBaseUrl,
  exactTokenUrl,
  type ExactEnv,
  type ExactRegion,
} from "./config";

export interface ExactOAuthConfig {
  clientId: string;
  clientSecret: string;
  region: ExactRegion;
  env: ExactEnv;
}

export type ExactTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: string | number;
};

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export function loadExactOAuthConfigFromEnv(
  region: ExactRegion,
  env: ExactEnv,
): ExactOAuthConfig {
  return {
    clientId: requiredEnv("EXACT_CLIENT_ID"),
    clientSecret: requiredEnv("EXACT_CLIENT_SECRET"),
    region,
    env,
  };
}

export async function buildExactAuthorizationUrl(input: {
  cfg: ExactOAuthConfig;
  redirectUri: string;
  state: string;
}): Promise<{ url: string }> {
  const u = new URL(exactAuthorizeUrl(input.cfg.region, input.cfg.env));
  u.searchParams.set("client_id", input.cfg.clientId);
  u.searchParams.set("redirect_uri", input.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("state", input.state);
  u.searchParams.set("force_login", "0");
  return { url: u.toString() };
}

export async function exchangeExactAuthorizationCode(input: {
  cfg: ExactOAuthConfig;
  code: string;
  redirectUri: string;
}): Promise<ExactTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: input.cfg.clientId,
    client_secret: input.cfg.clientSecret,
    redirect_uri: input.redirectUri,
    code: input.code,
  });
  const tokenUrl = exactTokenUrl(input.cfg.region, input.cfg.env);
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
  });
  const json = (await res.json().catch(() => ({}))) as ExactTokenResponse & { error?: string };
  if (!res.ok || !json.access_token || !json.refresh_token) {
    throw new Error(
      `Exact token exchange failed (${res.status}): ${json.error ?? JSON.stringify(json)}`,
    );
  }
  return json;
}

export async function refreshExactTokens(input: {
  cfg: ExactOAuthConfig;
  refreshToken: string;
}): Promise<ExactTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: input.cfg.clientId,
    client_secret: input.cfg.clientSecret,
    refresh_token: input.refreshToken,
  });
  const tokenUrl = exactTokenUrl(input.cfg.region, input.cfg.env);
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
  });
  const json = (await res.json().catch(() => ({}))) as ExactTokenResponse & { error?: string };
  if (!res.ok || !json.access_token || !json.refresh_token) {
    throw new Error(
      `Exact token refresh failed (${res.status}): ${json.error ?? JSON.stringify(json)}`,
    );
  }
  return json;
}

export function accessTokenExpiryIso(expiresIn: string | number, now = new Date()): string {
  const n = typeof expiresIn === "string" ? Number.parseInt(expiresIn, 10) : expiresIn;
  if (!Number.isFinite(n)) {
    throw new Error("Invalid expires_in from Exact token response");
  }
  return new Date(now.getTime() + n * 1000).toISOString();
}

export async function fetchCurrentDivision(input: {
  accessToken: string;
  region: ExactRegion;
  env: ExactEnv;
}): Promise<number> {
  const base = exactRestBaseUrl(input.region, input.env);
  const u = new URL(`${base}/current/Me`);
  u.searchParams.set("$select", "CurrentDivision");
  const res = await fetch(u.toString(), {
    headers: { Authorization: `Bearer ${input.accessToken}`, Accept: "application/json" },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Exact Me failed (${res.status}): ${t}`);
  }
  const json = (await res.json()) as {
    d?: { results?: Array<{ CurrentDivision?: number }> };
  };
  const div = json.d?.results?.[0]?.CurrentDivision;
  if (typeof div !== "number") {
    throw new Error("Exact Me response missing CurrentDivision");
  }
  return div;
}
