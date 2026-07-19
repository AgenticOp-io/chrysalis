#!/usr/bin/env node
/**
 * Convert all (or N) origin corpus pieces — DESIGN D6444 / G9993.
 *
 *   node scripts/hub-ingest/hub-convert-all-pieces.mjs
 *   node scripts/hub-ingest/hub-convert-all-pieces.mjs --limit 10
 *   node scripts/hub-ingest/hub-convert-all-pieces.mjs --only ui:/dashboard,api:network
 */
import { resolve } from "node:path";
import { convertAllOriginPieces } from "../lib/convert-origin-pieces.mjs";

function parseArgs(argv) {
  /** @type {{ limit?: number, onlyIds?: string[], wispRoot?: string, deploy?: boolean }} */
  const opts = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--limit" && argv[i + 1]) {
      opts.limit = Number(argv[++i]);
    } else if (a === "--only" && argv[i + 1]) {
      opts.onlyIds = String(argv[++i])
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if ((a === "--root" || a === "--wisp-root") && argv[i + 1]) {
      opts.wispRoot = resolve(argv[++i]);
    } else if (a === "--deploy-firebase") {
      opts.deploy = true;
    }
  }
  return opts;
}

async function main() {
  const args = parseArgs(process.argv);
  const report = await convertAllOriginPieces(args);
  console.log(JSON.stringify({ ...report, results: undefined, resultCount: report.results?.length }, null, 2));
  if (report.ok !== true) process.exit(1);

  if (args.deploy) {
    const { spawnSync } = await import("node:child_process");
    const root = resolve(import.meta.dirname, "../..");
    const exportR = spawnSync(process.execPath, ["scripts/lib/cwl-static-export.mjs"], {
      cwd: root,
      encoding: "utf8",
      env: process.env,
    });
    console.log("static-export", exportR.status, (exportR.stderr || exportR.stdout || "").slice(-500));
    const stageR = spawnSync(process.execPath, ["scripts/wisp-cwl-firebase-static-stage.mjs"], {
      cwd: root,
      encoding: "utf8",
      env: process.env,
    });
    console.log("stage", stageR.status);
    const depR = spawnSync(process.execPath, ["scripts/wisp-cwl-firebase-deploy.mjs"], {
      cwd: root,
      encoding: "utf8",
      env: process.env,
    });
    console.log("deploy", depR.status, (depR.stdout || "").slice(-400));
    if (exportR.status !== 0 || stageR.status !== 0 || depR.status !== 0) process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
