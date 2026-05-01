#!/usr/bin/env node
/**
 * Wrap an arbitrary JSON payload (typically **`chrysalis status --json`** output) in the
 * **`chrysalis.fleet.status-uplink`** v0 envelope. Writes **stdout** only; no network calls (**DESIGN D255**).
 *
 *   node scripts/export-fleet-status-uplink.mjs --payload-json status.json --project-label fixtures/tiny-blog
 *
 * Optional **`--tool-version`** overrides **`toolVersion`** (default: root **package.json** **`version`**).
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function repoToolVersion() {
  try {
    const raw = readFileSync(resolve(ROOT, "package.json"), "utf8");
    const j = JSON.parse(raw);
    if (typeof j.version === "string" && j.version.length > 0) return j.version;
  } catch {
    /* ignore */
  }
  return "0.0.0";
}

function usage() {
  console.error(
    "usage: node scripts/export-fleet-status-uplink.mjs --payload-json <file> --project-label <str> [--tool-version <str>]",
  );
  process.exit(2);
}

/** @param {string[]} argv */
function parseArgs(argv) {
  let payloadJson = null;
  let projectLabel = null;
  let toolVersion = null;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--payload-json") {
      payloadJson = argv[++i];
    } else if (a === "--project-label") {
      projectLabel = argv[++i];
    } else if (a === "--tool-version") {
      toolVersion = argv[++i];
    } else if (a === "--help" || a === "-h") {
      usage();
    }
  }
  return { payloadJson, projectLabel, toolVersion };
}

const { payloadJson, projectLabel, toolVersion } = parseArgs(process.argv);
if (!payloadJson || !projectLabel) usage();

let payload;
try {
  payload = JSON.parse(readFileSync(resolve(payloadJson), "utf8"));
} catch (e) {
  const m = e instanceof Error ? e.message : String(e);
  console.error(`export-fleet-status-uplink: failed to read JSON (${m})`);
  process.exit(2);
}

const out = {
  kind: "chrysalis.fleet.status-uplink",
  schemaVersion: 0,
  collectedAt: new Date().toISOString(),
  toolVersion: typeof toolVersion === "string" && toolVersion.length > 0 ? toolVersion : repoToolVersion(),
  items: [{ projectLabel, status: payload }],
};

process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
