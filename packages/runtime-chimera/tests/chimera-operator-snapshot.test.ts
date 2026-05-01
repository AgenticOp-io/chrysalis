import { describe, expect, it } from "vitest";
import {
  CHIMERA_OPERATOR_SNAPSHOT_KIND,
  buildChimeraOperatorSnapshot,
  computeChimeraDeployRoutingFingerprintSha256,
} from "../src/chimera-operator-snapshot.js";
import type { ChimeraStats } from "../src/proxy.js";

const zeroStats = (): ChimeraStats => ({
  total: 0,
  byTarget: { legacy: 0, modern: 0 },
  shadow: {
    requests: 0,
    agreed: 0,
    diverged: 0,
    divergenceLines: 0,
    mirrorErrors: 0,
  },
  canary: {
    modernRuleMatches: 0,
    servedModern: 0,
    servedLegacyWhileModernRule: 0,
    noModernRule: 0,
  },
});

describe("chimera operator snapshot", () => {
  it("builds versioned JSON with stable routing fingerprint", () => {
    const routing = {
      mode: "cutover",
      legacy: "http://a",
      modern: "http://b",
      host: "127.0.0.1",
      port: 8080,
      rules: [{ match: "/x", target: "modern" as const }],
    };
    const fp = computeChimeraDeployRoutingFingerprintSha256(routing);
    const snap = buildChimeraOperatorSnapshot({
      wallTimeIso: "2026-04-30T12:00:00.000Z",
      instanceId: "test-1",
      configLabel: "fixture",
      routingFields: routing,
      toolVersion: "9.9.9",
      stats: zeroStats(),
    });
    expect(snap.kind).toBe(CHIMERA_OPERATOR_SNAPSHOT_KIND);
    expect(snap.schemaVersion).toBe(1);
    expect(snap.deployRoutingFingerprintSha256).toBe(fp);
    expect(snap.toolVersion).toBe("9.9.9");
  });
});
