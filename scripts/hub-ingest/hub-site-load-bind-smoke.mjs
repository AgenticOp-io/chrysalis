#!/usr/bin/env node
/** Site load bind smoke — traced API → CWL load + HTML (G9430, D6366). */
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(scriptRoot, "fixtures/site-load-bind");

async function loadIngest() {
  try {
    return await import("@chrysalis/ingest");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/ingest/dist/index.js")).href);
  }
}

export async function runSiteLoadBindSmoke() {
  const designText = readFileSync(join(scriptRoot, "DESIGN.md"), "utf8");
  if (!designText.includes("D6366")) {
    return { ok: false, skip: "missing-D6366" };
  }
  if (!existsSync(fixture)) {
    return { ok: false, skip: "missing-fixture", fixture };
  }

  const dir = mkdtempSync(join(tmpdir(), "chrysalis-site-load-bind-smoke-"));
  try {
    mkdirSync(join(dir, "traces", "2026-07-09"), { recursive: true });
    cpSync(join(fixture, "traces", "2026-07-09", "bind-smoke.ndjson"), join(dir, "traces", "2026-07-09", "bind-smoke.ndjson"));
    const cwlPath = join(dir, "routes.cwl");
    cpSync(join(fixture, "routes.cwl"), cwlPath);

    const ingest = await loadIngest();
    const bound = ingest.bindSiteProjectLoadFromTraces({
      tracesDir: join(dir, "traces"),
      cwlPaths: [cwlPath],
    });

    const text = readFileSync(cwlPath, "utf8");
    const ok =
      bound.ok === true &&
      bound.tracesIndexed >= 1 &&
      text.includes("activeRecords: 42") &&
      text.includes("Alpha");

    return {
      ok,
      kind: "chrysalis.hub.site-load-bind-smoke",
      schemaVersion: 1,
      fixture,
      bound: {
        tracesIndexed: bound.tracesIndexed,
        routesBound: bound.routes.filter((r) => r.skip === null).length,
      },
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function main() {
  runSiteLoadBindSmoke().then((r) => {
    console.log(JSON.stringify(r, null, 2));
    if (!r.ok) process.exit(1);
  });
}

if (process.argv[1]?.includes("hub-site-load-bind-smoke")) main();
