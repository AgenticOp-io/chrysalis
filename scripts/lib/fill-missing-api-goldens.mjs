#!/usr/bin/env node
/**
 * Fill missing wisp-api-goldens from route contract envelopes (D6442).
 * Does not invent list payloads — empty collections or pending mutate envelopes
 * when no hydrate-sample / live trace exists. Prefer sync-hydrate + live-trace first.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildNativeApiGolden,
  goldenFileName,
  listApiRouteSpecs,
} from "./cwl-api-oracle-contract.mjs";

export const FILL_MISSING_API_GOLDENS_KIND = "chrysalis.wisp.fill-missing-api-goldens";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const goldensDir = join(scriptRoot, "fixtures/hub-wisp-management/wisp-api-goldens");

/** @param {string} path */
function emptyGetBody(path) {
  const p = path.replace(/\/api\//, "").replace(/^\//, "");
  const base = {
    ok: true,
    surface: "wisp-api-native",
    resource: p.split("/")[0] || "api",
    op: "list",
    seeded: "contract-empty",
  };
  if (/\/sites$/.test(path) || path.endsWith("sites")) return { ...base, sites: [] };
  if (/\/sectors$/.test(path)) return { ...base, sectors: [] };
  if (/\/cpe$/.test(path)) return { ...base, cpe: [] };
  if (/\/equipment$/.test(path)) return { ...base, equipment: [] };
  if (/plans/.test(path)) return { ...base, plans: [], items: [] };
  if (/tenants/.test(path)) return { ...base, tenants: [], items: [] };
  if (/users/.test(path)) return { ...base, users: [], items: [] };
  if (/customers/.test(path)) return { ...base, customers: [], items: [] };
  if (/inventory|hardware|bundles/.test(path)) return { ...base, items: [] };
  if (/work-orders/.test(path)) return { ...base, workOrders: [], items: [] };
  if (/notifications/.test(path)) return { ...base, notifications: [], items: [] };
  if (/monitoring/.test(path)) return { ...base, items: [], graphs: [] };
  if (/auth/.test(path)) {
    return {
      ok: true,
      authenticated: false,
      surface: "wisp-auth-native",
      seeded: "contract-empty",
    };
  }
  return { ...base, items: [] };
}

/**
 * @param {object} [opts]
 */
export function fillMissingWispApiGoldens(opts = {}) {
  const dir = resolve(opts.goldensDir ?? goldensDir);
  mkdirSync(dir, { recursive: true });
  const specs = listApiRouteSpecs(opts.manifestPath);
  /** @type {string[]} */
  const written = [];
  /** @type {string[]} */
  const skipped = [];

  for (const spec of specs) {
    const name = goldenFileName(spec.method, spec.path);
    const out = join(dir, name);
    if (existsSync(out) && opts.force !== true) {
      skipped.push(name);
      continue;
    }
    let body;
    if (spec.method === "GET") {
      body = emptyGetBody(spec.path);
    } else {
      body = {
        ...buildNativeApiGolden(spec.entry, spec.method),
        seeded: "contract-mutate",
      };
    }
    writeFileSync(out, `${JSON.stringify(body, null, 2)}\n`, "utf8");
    written.push(name);
  }

  return {
    kind: FILL_MISSING_API_GOLDENS_KIND,
    schemaVersion: 1,
    ok: true,
    goldensDir: dir.replace(/\\/g, "/"),
    written: written.length,
    skippedExisting: skipped.length,
    totalSpecs: specs.length,
    generatedAt: new Date().toISOString(),
  };
}

function main() {
  const force = process.argv.includes("--force");
  const r = fillMissingWispApiGoldens({ force });
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("fill-missing-api-goldens")) main();
