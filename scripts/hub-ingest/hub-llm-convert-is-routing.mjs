#!/usr/bin/env node
/** Phase 42a — IS tier routing for hub convert (G8810). Models propose; verify disposes. */
import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { openLegacyIndexEntries } from "../site-port-federation-lib.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

/** @returns {string | null} */
export function domainIdForHubPair(origin, output) {
  const entries = openLegacyIndexEntries(scriptRoot);
  const byOrigin = entries.find((e) => e.origin === origin);
  if (byOrigin) return byOrigin.id;
  if (origin === "php" && (output === "hono" || output === "fastify")) return "tinyBlog";
  return `${origin}To${output}`;
}

/**
 * Resolve IS shorthand routing before hub translate/ingest (propose-only — never bypass verify).
 * @param {object} input
 * @param {string} input.repoRoot
 * @param {string} input.origin
 * @param {string} input.output
 * @param {string} [input.projectDir]
 * @param {string} [input.domainId]
 * @param {string} [input.sourceDigest]
 * @param {string} [input.lastDonorDomainId]
 * @param {string} [input.nudge]
 */
export async function resolveHubConvertIsRouting(input) {
  const repoRoot = resolve(input.repoRoot ?? scriptRoot);
  const mod = await loadWebLlm();
  const domainId = input.domainId ?? domainIdForHubPair(input.origin, input.output);
  const shorthands = mod.loadIntelligenceShorthandsFromRepo(repoRoot);
  const domainCatalog = openLegacyIndexEntries(repoRoot).map((e) => ({
    id: e.id,
    origin: e.origin,
    minRoutes: e.minRoutes,
    tags: e.tags,
    fixtureRel: e.fixtureRel,
  }));
  const utilityStorePath = mod.defaultIsUtilityPath(repoRoot);
  const resolved = mod.resolveShorthandForTask({
    domainId,
    shorthands,
    needsNovelLanguage: false,
    domainCatalog,
    ...(input.lastDonorDomainId ? { lastDonorDomainId: String(input.lastDonorDomainId) } : {}),
    utilityStorePath,
  });

  const aim = mod.createConvertAim({
    domainId,
    successGate: "verify-green",
    origin: input.origin,
    output: input.output,
    ...(input.sourceDigest ? { sourceDigest: String(input.sourceDigest) } : {}),
  });
  const aimDrive = mod.evaluateAimDrive({
    aim,
    nudge: input.nudge != null ? String(input.nudge) : domainId,
  });
  const governor = mod.classifyConvertAction("hub_convert_is_routing");

  const routing = {
    kind: "chrysalis.hub.convert-is-routing",
    schemaVersion: 3,
    domainId,
    origin: input.origin,
    output: input.output,
    tier: resolved.tier ?? null,
    retrievalHit: resolved.retrievalHit === true,
    skipLlm: resolved.skipLlm === true,
    cacheOutcome: resolved.cacheOutcome ?? (resolved.retrievalHit ? "hit" : "miss"),
    nearMissDomainId: resolved.nearMissDomainId ?? null,
    nearMissScore: resolved.nearMissScore ?? null,
    nearMissFeatures: resolved.nearMissFeatures ?? null,
    holeDeltaLlmOnly: resolved.holeDeltaLlmOnly === true,
    collaborationAttribution: resolved.collaborationAttribution ?? null,
    proposeOnly: true,
    verifyRequired: true,
    governor,
    aim,
    aimDrive,
    ...(input.sourceDigest ? { sourceDigest: input.sourceDigest } : {}),
  };

  if (input.projectDir) {
    const trajectoryPath =
      process.env.CHRYSALIS_HUB_CONVERT_TRAJECTORY ??
      join(resolve(input.projectDir), ".chrysalis", "hub-convert.trajectory.jsonl");
    await mkdir(dirname(trajectoryPath), { recursive: true });
    const sessionId = mod.createTrajectorySessionId("hub-convert");
    mod.appendTrajectoryRecord({
      filePath: trajectoryPath,
      sessionId,
      step: 1,
      role: "system",
      toolName: "hub_convert_is_routing",
      content: `${input.origin}->${input.output}`,
      gate: { name: "is-routing", ok: true },
      isTier: routing.tier ?? undefined,
      isRetrievalHit: routing.retrievalHit,
      skipLlm: routing.skipLlm,
      domainId,
      isCacheOutcome: routing.cacheOutcome,
      nearMissDomainId: routing.nearMissDomainId ?? undefined,
      nearMissScore: routing.nearMissScore ?? undefined,
      nearMissFeatures: routing.nearMissFeatures ?? undefined,
      collaborationAttribution: routing.collaborationAttribution ?? undefined,
      governorTier: governor.tier,
      convertAim: {
        domainId: aim.domainId,
        successGate: aim.successGate,
        origin: aim.origin,
        output: aim.output,
        sourceDigest: aim.sourceDigest,
        setAt: aim.setAt,
      },
      sourceDigest: input.sourceDigest,
      evidenceSource: "hub-convert-verify",
    });
    routing.trajectoryPath = trajectoryPath;
    routing.sessionId = sessionId;
  }

  return routing;
}
