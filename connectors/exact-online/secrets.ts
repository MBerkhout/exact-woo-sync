import type { ExactEnv, ExactRegion } from "@/connectors/exact-online/config";

/** Encrypted JSON payload shape stored in `connector_secrets` for `exact-online`. */
export type ExactSecretsV1 = {
  v: 1;
  accessToken: string;
  refreshToken: string;
  /** ISO timestamp when `accessToken` expires */
  accessTokenExpiresAt: string;
  region: ExactRegion;
  env: ExactEnv;
  /** Division number from `/current/Me` */
  division: number;
};

export function isExactSecretsV1(v: unknown): v is ExactSecretsV1 {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    o.v === 1 &&
    typeof o.accessToken === "string" &&
    typeof o.refreshToken === "string" &&
    typeof o.accessTokenExpiresAt === "string" &&
    typeof o.region === "string" &&
    (o.env === "production" || o.env === "sandbox") &&
    typeof o.division === "number"
  );
}
