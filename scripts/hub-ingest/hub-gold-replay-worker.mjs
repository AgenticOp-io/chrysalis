#!/usr/bin/env node
/**
 * Probe emitted Hono app and replay corpus in-process (hub trace oracle).
 * Usage: node --import tsx scripts/hub-ingest/hub-gold-replay-worker.mjs <fixtureDir>
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildReport, replayCorpus } from "../../packages/verify/dist/index.js";
import { loadHubProbeContext, probeHubGoldCorpus } from "./hub-verify-probe-corpus.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function parseArgs(argv) {
  let fixture = join(scriptRoot, "fixtures/hub-gold-js-literal");
  let origin = "javascript";
  let target = "hono";
  const positional = [];
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
    else if (argv[i] === "--target" && argv[i + 1]) target = argv[++i];
    else if (!argv[i].startsWith("-")) positional.push(argv[i]);
  }
  if (positional[0]) fixture = resolve(positional[0]);
  return { fixture, origin, target };
}

async function main() {
  const { fixture, origin, target } = parseArgs(process.argv);
  const ctx = await loadHubProbeContext(fixture, origin, target, scriptRoot);
  const corpus = await probeHubGoldCorpus({
    routes: ctx.routes,
    middlewarePresets: ctx.middlewarePresets,
    inProcessFetch: ctx.inProcessFetch,
    fixture: ctx.fixture,
    corpusId: "hub-gold-probe",
  });

  const outcomes = await replayCorpus(corpus, {
    baseUrl: "http://127.0.0.1",
    injectDeterminismHeaders: true,
    fetch: (url, init) => ctx.inProcessFetch(url, init),
  });
  const report = buildReport(outcomes);
  const correctness = report.aggregate?.correctness ?? 0;

  console.log(
    JSON.stringify({
      kind: "chrysalis.hub.trace-replay",
      schemaVersion: 0,
      fixture,
      origin,
      emitTarget: target,
      routeCount: ctx.routes.length,
      traceCount: corpus.traces.length,
      correctness,
      ok: correctness >= 1,
      report,
    }),
  );
  if (correctness < 1) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
