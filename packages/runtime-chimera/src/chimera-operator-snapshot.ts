/**
 * Machine-readable operator snapshots for chimera drift / fleet dashboards (V2-M5, DESIGN D258).
 * No secrets: fingerprint covers routing fields only.
 */

import { createHash } from "node:crypto";
import { stableStringifyChimeraDeploySigningPayload } from "./chimera-deploy-config.js";
import type { ChimeraStats } from "./proxy.js";

export const CHIMERA_OPERATOR_SNAPSHOT_KIND = "chrysalis.chimera.operator-snapshot" as const;

export const CHIMERA_OPERATOR_SNAPSHOT_SCHEMA_VERSION = 1 as const;

export interface ChimeraOperatorSnapshotV1 {
  readonly kind: typeof CHIMERA_OPERATOR_SNAPSHOT_KIND;
  readonly schemaVersion: typeof CHIMERA_OPERATOR_SNAPSHOT_SCHEMA_VERSION;
  readonly wallTimeIso: string;
  readonly instanceId: string;
  readonly configLabel: string;
  readonly deployRoutingFingerprintSha256: string;
  readonly toolVersion?: string;
  readonly stats: ChimeraStats;
}

/** Fields that affect request routing / canary / shadow selection (for drift detection). */
export function chimeraDeployRoutingFingerprintPayload(input: Record<string, unknown>): string {
  return stableStringifyChimeraDeploySigningPayload(input);
}

export function computeChimeraDeployRoutingFingerprintSha256(input: Record<string, unknown>): string {
  const payload = chimeraDeployRoutingFingerprintPayload(input);
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

export function buildChimeraOperatorSnapshot(input: {
  readonly wallTimeIso: string;
  readonly instanceId: string;
  readonly configLabel: string;
  readonly routingFields: Record<string, unknown>;
  readonly toolVersion?: string;
  readonly stats: ChimeraStats;
}): ChimeraOperatorSnapshotV1 {
  return {
    kind: CHIMERA_OPERATOR_SNAPSHOT_KIND,
    schemaVersion: CHIMERA_OPERATOR_SNAPSHOT_SCHEMA_VERSION,
    wallTimeIso: input.wallTimeIso,
    instanceId: input.instanceId,
    configLabel: input.configLabel,
    deployRoutingFingerprintSha256: computeChimeraDeployRoutingFingerprintSha256(input.routingFields),
    ...(input.toolVersion !== undefined ? { toolVersion: input.toolVersion } : {}),
    stats: input.stats,
  };
}
