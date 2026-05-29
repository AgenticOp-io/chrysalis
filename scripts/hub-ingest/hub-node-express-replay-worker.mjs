#!/usr/bin/env node
/**
 * Replay live-captured NDJSON corpus against emitted Hono in-process (G112).
 * Usage: node --import tsx scripts/hub-ingest/hub-node-express-replay-worker.mjs <fixtureDir> <tracesRoot>
 */
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readCorpus } from "../../packages/oracle/dist/index.js";
import { replayCorpus, buildReport } from "../../packages/verify/dist/index.js";

const scriptRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..", "..");

function parseArgs(argv) {
  const fixture = resolve(argv[2] ?? join(scriptRoot, "fixtures/hub-flagship-express"));
  const tracesRoot = resolve(argv[3] ?? join(fixture, "traces"));
  return { fixture, tracesRoot };
}

async function main() {
  const { fixture, tracesRoot } = parseArgs(process.argv);
  const outDir = join(fixture, "generated", "hono");
  const serverPath = join(outDir, "src/server.ts");
  if (!existsSync(serverPath)) {
    console.log(JSON.stringify({ ok: false, skip: "missing-emitted-server" }));
    process.exit(1);
  }

  const corpus = readCorpus({ root: tracesRoot });
  const serverMod = await import(pathToFileURL(serverPath).href);
  const fetchFn = serverMod.chrysalisInProcessFetch ?? serverMod.fetch;
  if (typeof fetchFn !== "function") {
    console.log(JSON.stringify({ ok: false, skip: "no-in-process-fetch" }));
    process.exit(1);
  }
  const inProcessFetch = fetchFn.bind(serverMod);
  const outcomes = await replayCorpus(corpus, {
    baseUrl: "http://127.0.0.1",
    injectDeterminismHeaders: true,
    fetch: (url, init) => inProcessFetch(url, init),
  });
  const report = buildReport(outcomes);
  const correctness = report.aggregate?.correctness ?? 0;
  console.log(
    JSON.stringify({
      ok: correctness >= 1,
      correctness,
      framesTotal: report.aggregate?.framesTotal ?? null,
      framesPassed: report.aggregate?.framesPassed ?? null,
      traceCount: corpus.traces?.length ?? null,
    }),
  );
  process.exit(correctness >= 1 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
