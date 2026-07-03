#!/usr/bin/env node
/** Phase 42a.1 — IS routing on hub convert (G8811). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { domainIdForHubPair, resolveHubConvertIsRouting } from "./hub-llm-convert-is-routing.mjs";
import { runLlmAssistedConvertProgramDocGate } from "./hub-llm-assisted-convert-program-entry-smoke.mjs";

export const LLM_CONVERT_IS_ROUTING_SMOKE_KIND = "chrysalis.llm-convert-is-routing-smoke";
export const LLM_CONVERT_IS_ROUTING_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

/** G8811 — IS routing resolves for php→hono with trajectory + skipLlm when corpus hits. */
export async function runLlmConvertIsRoutingGate(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const program = runLlmAssistedConvertProgramDocGate();
  const fixtureDir = join(repoRoot, "fixtures/tiny-blog");
  const domainId = domainIdForHubPair("php", "hono");
  const routing = await resolveHubConvertIsRouting({
    repoRoot,
    origin: "php",
    output: "hono",
    projectDir: fixtureDir,
  });

  const mod = await loadWebLlm();
  const records = routing.trajectoryPath ? mod.readTrajectoryRecords(routing.trajectoryPath) : [];
  const tierLogged = records.some((r) => r.toolName === "hub_convert_is_routing" && r.skipLlm === true);

  const checks = {
    programOk: program.ok === true,
    domainIdOk: domainId === "tinyBlog",
    routingKind: routing.kind === "chrysalis.hub.convert-is-routing",
    proposeOnly: routing.proposeOnly === true && routing.verifyRequired === true,
    skipLlm: routing.skipLlm === true,
    retrievalHit: routing.retrievalHit === true,
    trajectoryExists: existsSync(routing.trajectoryPath ?? ""),
    tierLogged,
  };
  const ok = Object.values(checks).every(Boolean);
  return {
    kind: LLM_CONVERT_IS_ROUTING_SMOKE_KIND,
    schemaVersion: LLM_CONVERT_IS_ROUTING_SMOKE_SCHEMA_VERSION,
    ok,
    checks,
    routing,
    generatedAt: new Date().toISOString(),
  };
}

export async function runLlmConvertIsRoutingSmoke(opts = {}) {
  const progress = createSmokeProgress("llm-convert-is-routing");
  const t0 = progress.start("LLM convert IS routing (G8811)");
  const gate = await runLlmConvertIsRoutingGate(opts);
  progress.end("LLM convert IS routing (G8811)", gate.ok === true, t0);
  return {
    kind: LLM_CONVERT_IS_ROUTING_SMOKE_KIND,
    schemaVersion: LLM_CONVERT_IS_ROUTING_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
  };
}

async function main() {
  const r = await runLlmConvertIsRoutingSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-llm-convert-is-routing-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
