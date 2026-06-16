#!/usr/bin/env node
/**
 * Isolated subprocess: tsImport(server.ts) + in-process route probe for HTTP verify.
 * Avoids tsx/esbuild state corruption when many probes run in one long-lived smoke process (GCE).
 * Usage: node --import tsx hub-verify-http-probe-worker.mjs <projectDir> [--origin php] [--target hono]
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadHubProbeContext, probeHubGoldCorpus } from "./hub-verify-probe-corpus.mjs";

export const HUB_VERIFY_HTTP_PROBE_KIND = "chrysalis.hub.verify-http-probe";
export const HUB_VERIFY_HTTP_PROBE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function parseArgs(argv) {
  let fixture = null;
  let origin = null;
  let target = "hono";
  const positional = [];
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
    else if (argv[i] === "--target" && argv[i + 1]) target = argv[++i];
    else if (!argv[i].startsWith("-")) positional.push(argv[i]);
  }
  if (!positional[0]) {
    throw new Error("usage: hub-verify-http-probe-worker.mjs <projectDir> [--origin php|javascript|cwl] [--target hono|fastify]");
  }
  fixture = resolve(positional[0]);
  return { fixture, origin, target };
}

async function main() {
  const { fixture, origin: originArg, target } = parseArgs(process.argv);
  const origin =
    originArg ??
    (await import("./hub-verify-replay.mjs")).inferHubProjectOrigin(fixture);
  const ctx = await loadHubProbeContext(fixture, origin, target, scriptRoot);
  const corpus = await probeHubGoldCorpus({
    routes: ctx.routes,
    middlewarePresets: ctx.middlewarePresets,
    inProcessFetch: ctx.inProcessFetch,
    fixture: ctx.fixture,
    corpusId: "hub-http-probe",
  });
  console.log(
    JSON.stringify({
      kind: HUB_VERIFY_HTTP_PROBE_KIND,
      schemaVersion: HUB_VERIFY_HTTP_PROBE_SCHEMA_VERSION,
      ok: true,
      projectDir: fixture,
      origin,
      target,
      routes: ctx.routes,
      routeCount: ctx.routes.length,
      traceCount: corpus.traces.length,
      corpus,
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
