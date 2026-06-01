#!/usr/bin/env node
/**
 * CWL authoring diagnostics v0 (G1152): parse errors, duplicate routes, hole catalog.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isCataloguedFullstackHole, lookupFullstackHole } from "./cwl-fullstack-holes.mjs";
import { parseCwlModule } from "./cwl-parser.mjs";

export const CWL_DIAGNOSE_KIND = "chrysalis.cwl.diagnose";
export const CWL_DIAGNOSE_SCHEMA_VERSION = 1;

/**
 * @param {string} source
 * @param {string} [file]
 */
export function diagnoseCwlSource(source, file = "input.cwl") {
  /** @type {Array<{ severity: "error"|"warn"|"info", code: string, message: string, line?: number }>} */
  const diagnostics = [];

  let mod;
  try {
    mod = parseCwlModule(source, file);
  } catch (e) {
    diagnostics.push({
      severity: "error",
      code: "parse",
      message: e instanceof Error ? e.message : String(e),
    });
    return { kind: CWL_DIAGNOSE_KIND, schemaVersion: CWL_DIAGNOSE_SCHEMA_VERSION, ok: false, diagnostics };
  }

  if (!mod.moduleName) {
    diagnostics.push({ severity: "warn", code: "module-name", message: "missing module declaration" });
  }

  const seen = new Map();
  for (const r of mod.routes ?? []) {
    const key = `${r.method} ${r.path}`;
    if (seen.has(key)) {
      diagnostics.push({
        severity: "warn",
        code: "duplicate-route",
        message: `duplicate route surface ${key} (handlers ${seen.get(key)} and ${r.name})`,
      });
    } else {
      seen.set(key, r.name);
    }
    if (r.body?.kind === "hole") {
      const reason = String(r.body.reason ?? "unknown");
      if (isCataloguedFullstackHole(reason)) {
        const entry = lookupFullstackHole(reason);
        diagnostics.push({
          severity: "info",
          code: "catalogued-hole",
          message: `${reason}: ${entry?.summary ?? "catalogued"}`,
        });
      } else {
        diagnostics.push({
          severity: "warn",
          code: "uncatalogued-hole",
          message: `hole ${reason} is not in RFC-0012 catalog`,
        });
      }
    }
  }

  const errors = diagnostics.filter((d) => d.severity === "error").length;
  return {
    kind: CWL_DIAGNOSE_KIND,
    schemaVersion: CWL_DIAGNOSE_SCHEMA_VERSION,
    ok: errors === 0,
    routeCount: mod.routes?.length ?? 0,
    diagnostics,
  };
}

/**
 * @param {string} cwlPath
 */
export async function diagnoseCwlFile(cwlPath) {
  const abs = resolve(cwlPath);
  const source = await readFile(abs, "utf8");
  return diagnoseCwlSource(source, abs);
}

async function main() {
  const cwlPath = process.argv[2];
  if (!cwlPath) {
    console.error("usage: cwl-diagnose.mjs <path/to/file.cwl>");
    process.exit(1);
  }
  const report = await diagnoseCwlFile(cwlPath);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(report.ok ? 0 : 1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
