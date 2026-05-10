import type { Connector } from "@/connectors/_contract/v1";
import { CONTRACT_VERSION } from "@/connectors/_contract/v1";
import { exactOnlineConnector } from "@/connectors/exact-online";
import { woocommerceConnector } from "@/connectors/woocommerce";

const REGISTRY: Record<string, Connector> = {
  woocommerce: woocommerceConnector,
  "exact-online": exactOnlineConnector,
};

/** Compare contract majors for compatibility (semver-lite). */
export function isContractCompatible(
  moduleContractVersion: string,
  coreContractVersion: string = CONTRACT_VERSION,
): boolean {
  const major = (v: string) => Number.parseInt(v.split(".")[0] ?? "0", 10);
  return major(moduleContractVersion) === major(coreContractVersion);
}

export function getConnector(kind: string): Connector | null {
  const c = REGISTRY[kind];
  if (!c) return null;
  if (!isContractCompatible(c.manifest.contractVersion)) {
    throw new Error(
      `Connector "${kind}" targets contract ${c.manifest.contractVersion} but core expects ${CONTRACT_VERSION}`,
    );
  }
  return c;
}

export function listRegisteredKinds(): string[] {
  return Object.keys(REGISTRY);
}
