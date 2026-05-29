#!/usr/bin/env node
/**
 * Migration program templates (API slice, auth, public read-only) — Phase 2 / G97.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildMigrationPlan } from "./hub-migration-planner.mjs";

export const HUB_MIGRATION_PROGRAMS_KIND = "chrysalis.hub.migration-programs";
export const HUB_MIGRATION_PROGRAMS_SCHEMA_VERSION = 1;

/** @type {Record<string, { id: string, title: string, description: string, routePatterns: string[], verifyThreshold: number, extraSteps: string[] }>} */
export const MIGRATION_PROGRAM_TEMPLATES = {
  "api-slice": {
    id: "api-slice",
    title: "API slice (JSON routes)",
    description: "Migrate stateless JSON endpoints first; defer session/HTML until verify green.",
    routePatterns: ["/api/*", "POST /api/*", "GET /api/*"],
    verifyThreshold: 1,
    extraSteps: [
      "Scope capture to JSON Content-Type routes only.",
      "Run verify with --threshold 1 on API slice before expanding scope.",
      "Export migration.cwl contract for the slice before chimera cutover.",
    ],
  },
  "auth-slice": {
    id: "auth-slice",
    title: "Auth slice (login / session / me)",
    description: "Session-bearing routes with cookie bridge and chimera dual-stack.",
    routePatterns: ["POST /login", "POST /logout", "GET /me", "/session/*"],
    verifyThreshold: 1,
    extraSteps: [
      "Enable session bridge (Redis) on staging before capture.",
      "Capture login → me → logout → relogin sequence.",
      "Verify Set-Cookie and session state transitions explicitly.",
    ],
  },
  "public-readonly": {
    id: "public-readonly",
    title: "Public read-only",
    description: "GET/HEAD routes without writes; lowest risk first cutover.",
    routePatterns: ["GET /*", "HEAD /*"],
    verifyThreshold: 1,
    extraSteps: [
      "Exclude POST/PUT/PATCH from capture corpus for this program.",
      "Chimera route 100% read traffic before enabling writes.",
    ],
  },
};

/**
 * @param {object} opts
 * @param {string} opts.origin
 * @param {string[]} opts.outputs
 * @param {string} opts.programId
 * @param {string[]} [opts.detectedDatabases]
 * @param {Record<string, unknown>} [opts.originServices]
 */
export function buildMigrationProgram(opts) {
  const template = MIGRATION_PROGRAM_TEMPLATES[opts.programId];
  if (!template) {
    throw new Error(`unknown program: ${opts.programId}`);
  }
  const basePlan = buildMigrationPlan({
    origin: opts.origin,
    outputs: opts.outputs,
    detectedDatabases: opts.detectedDatabases,
    originServices: opts.originServices,
  });
  return {
    kind: HUB_MIGRATION_PROGRAMS_KIND,
    schemaVersion: HUB_MIGRATION_PROGRAMS_SCHEMA_VERSION,
    program: template,
    plan: basePlan,
    steps: [...basePlan.steps, ...template.extraSteps],
    routePatterns: template.routePatterns,
    verifyThreshold: template.verifyThreshold,
    generatedAt: new Date().toISOString(),
  };
}

function parseArgs(argv) {
  let origin = null;
  let outputs = [];
  let programId = "api-slice";
  let detectedDatabases = [];
  let jsonOut = null;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
    else if (argv[i] === "--outputs" && argv[i + 1]) {
      outputs = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    } else if (argv[i] === "--program" && argv[i + 1]) programId = argv[++i];
    else if (argv[i] === "--databases" && argv[i + 1]) {
      detectedDatabases = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    } else if (argv[i] === "--json-out" && argv[i + 1]) jsonOut = resolve(argv[++i]);
  }
  if (!origin || outputs.length === 0) {
    throw new Error(
      "usage: hub-migration-programs.mjs --origin php --outputs hono --program api-slice [--json-out path]",
    );
  }
  return { origin, outputs, programId, detectedDatabases, jsonOut };
}

async function main() {
  const { origin, outputs, programId, detectedDatabases, jsonOut } = parseArgs(process.argv);
  const report = buildMigrationProgram({ origin, outputs, programId, detectedDatabases });
  if (jsonOut) {
    await mkdir(dirname(jsonOut), { recursive: true });
    await writeFile(jsonOut, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(report, null, 2));
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
