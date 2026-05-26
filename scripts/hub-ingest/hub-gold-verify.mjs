#!/usr/bin/env node
/**
 * Gold gate: hub literal-only JS/TS lift must be hole-free and emit Hono.
 * Usage: node scripts/hub-ingest/hub-gold-verify.mjs [--fixture fixtures/hub-gold-js-literal]
 */
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");
const emitScript = join(scriptRoot, "scripts/hub-ingest/emit-from-hub.mjs");

function parseArgs(argv) {
  let fixture = join(scriptRoot, "fixtures/hub-gold-js-literal");
  let origin = "javascript";
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--fixture" && argv[i + 1]) fixture = resolve(argv[++i]);
    else if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
  }
  return { fixture, origin };
}

async function main() {
  const { fixture, origin } = parseArgs(process.argv);
  const lift = spawnSync(process.execPath, [liftScript, fixture, "--language", origin], {
    cwd: scriptRoot,
    encoding: "utf8",
  });
  if (lift.status !== 0) {
    console.error(lift.stderr || lift.stdout);
    process.exit(1);
  }
  const liftReport = JSON.parse(lift.stdout.trim().split("\n").pop() ?? "{}");
  if ((liftReport.holeCount ?? 1) !== 0) {
    console.error(JSON.stringify({ ok: false, reason: "lift-holes", liftReport }, null, 2));
    process.exit(1);
  }

  const webir = await import(pathToFileURL(join(scriptRoot, "packages/webir/dist/index.js")).href);
  const raw = JSON.parse(await readFile(join(fixture, ".chrysalis", `hub.${origin}.webir.json`), "utf8"));
  const mod = webir.moduleFromGoldenSnapshot(raw);
  const footprint = webir.computeOracleFootprint(mod);
  if (footprint.totalHoleCount !== 0) {
    console.error(JSON.stringify({ ok: false, reason: "footprint-holes", footprint }, null, 2));
    process.exit(1);
  }

  const emit = spawnSync(process.execPath, [emitScript, fixture, "--origin", origin, "--target", "hono"], {
    cwd: scriptRoot,
    encoding: "utf8",
  });
  if (emit.status !== 0) {
    console.error(emit.stderr || emit.stdout);
    process.exit(1);
  }
  const emitReport = JSON.parse(emit.stdout.trim().split("\n").pop() ?? "{}");

  console.log(
    JSON.stringify(
      {
        kind: "chrysalis.hub.gold-verify",
        schemaVersion: 0,
        fixture,
        origin,
        output: "hono",
        lift: liftReport,
        footprint,
        emit: emitReport,
        ok: true,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
