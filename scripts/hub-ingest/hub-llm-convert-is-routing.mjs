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
 */
export async function resolveHubConvertIsRouting(input) {
  const repoRoot = resolve(input.repoRoot ?? scriptRoot);
  const mod = await loadWebLlm();
  const domainId = domainIdForHubPair(input.origin, input.output);
  const shorthands = mod.loadIntelligenceShorthandsFromRepo(repoRoot);
  const resolved = mod.resolveShorthandForTask({
    domainId,
    shorthands,
    needsNovelLanguage: false,
  });

  const routing = {
    kind: "chrysalis.hub.convert-is-routing",
    schemaVersion: 1,
    domainId,
    origin: input.origin,
    output: input.output,
    tier: resolved.tier ?? null,
    retrievalHit: resolved.retrievalHit === true,
    skipLlm: resolved.skipLlm === true,
    proposeOnly: true,
    verifyRequired: true,
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
    });
    routing.trajectoryPath = trajectoryPath;
  }

  return routing;
}
