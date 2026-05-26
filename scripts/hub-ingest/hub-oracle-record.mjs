#!/usr/bin/env node
/**
 * Dispatch hub oracle capture smoke by origin language.
 * Usage: node scripts/hub-ingest/hub-oracle-record.mjs --origin python --out traces/smoke.ndjson
 */
import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function parseArgs(argv) {
  let origin = "javascript";
  let out = join(scriptRoot, "reports/ci/hub-oracle-smoke.ndjson");
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
    else if (argv[i] === "--out" && argv[i + 1]) out = resolve(argv[++i]);
  }
  return { origin, out };
}

async function main() {
  const { origin, out } = parseArgs(process.argv);
  await mkdir(dirname(out), { recursive: true });

  if (origin === "php") {
    console.log(
      JSON.stringify({
        ok: true,
        origin,
        lane: "legacy-oracle-php",
        note: "Use packages/oracle-php on the legacy host (auto_prepend_file).",
        docs: "docs/HUB-CONNECTIVITY.md#hub-origin-prep",
      }),
    );
    return;
  }

  if (origin === "python") {
    const py = process.env.CHRYSALIS_HUB_PYTHON ?? "python3";
    const script = join(scriptRoot, "packages/oracle-python/record_smoke.py");
    const r = spawnSync(py, [script, out], { cwd: scriptRoot, encoding: "utf8" });
    if (r.status !== 0) {
      console.error(r.stderr || r.stdout);
      process.exit(1);
    }
    console.log(JSON.stringify({ ok: true, origin, lane: "oracle-python", out }, null, 2));
    return;
  }

  if (origin === "javascript" || origin === "typescript") {
    const script = join(scriptRoot, "packages/oracle-node/record-smoke.mjs");
    const r = spawnSync(process.execPath, [script, out], { cwd: scriptRoot, encoding: "utf8" });
    if (r.status !== 0) {
      console.error(r.stderr || r.stdout);
      process.exit(1);
    }
    console.log(JSON.stringify({ ok: true, origin, lane: "oracle-node", out }, null, 2));
    return;
  }

  console.log(
    JSON.stringify({
      ok: false,
      origin,
      hole: `hub:oracle-recorder-not-implemented:${origin}`,
      note: "Use hub lift + hub-gold-trace-replay for structural gold until a recorder lands.",
    }),
  );
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
