#!/usr/bin/env node
/**
 * Convert WPTP orbit cohesion smoke — siblings resolve + CWL WebIR reverse-home.
 * Does not require matrix gold or Next emit (those stay optional / honest skip).
 *
 *   pnpm run hub:wptp-orbit-smoke
 *   CHRYSALIS_SKIP_WPTP=1  → soft-ok skip
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { listWptpSiblingStatus } from "../lib/wptp-siblings.mjs";

export const WPTP_ORBIT_SMOKE_KIND = "chrysalis.hub.wptp-orbit-smoke";
export const WPTP_ORBIT_SMOKE_SCHEMA_VERSION = 1;
export const WPTP_CONVERT_ORBIT_OK = "WPTP_CONVERT_ORBIT_OK";

const CONVERT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * @param {{ convertRoot?: string }} [opts]
 */
export async function runWptpOrbitSmoke(opts = {}) {
  const root = opts.convertRoot ? resolve(opts.convertRoot) : CONVERT_ROOT;
  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const checks = [];

  if (process.env.CHRYSALIS_SKIP_WPTP === "1" || process.env.CHRYSALIS_SKIP_WPTP_HUB_DEPS === "1") {
    return {
      kind: WPTP_ORBIT_SMOKE_KIND,
      schemaVersion: WPTP_ORBIT_SMOKE_SCHEMA_VERSION,
      ok: true,
      skipped: true,
      token: WPTP_CONVERT_ORBIT_OK,
      checks: [{ id: "skip-env", ok: true, detail: "CHRYSALIS_SKIP_WPTP*" }],
      generatedAt: new Date().toISOString(),
    };
  }

  const siblings = listWptpSiblingStatus(root);
  checks.push({
    id: "siblings-root",
    ok: Boolean(siblings.siblingsRoot),
    detail: siblings.siblingsRoot,
  });

  const required = ["wptp-ir", "wptp-matrix", "wptp-emit-nextjs"];
  for (const name of required) {
    const row = siblings.repos.find((r) => r.name === name);
    checks.push({
      id: `sibling:${name}`,
      ok: Boolean(row?.present),
      detail: row?.root,
    });
  }

  const optional = siblings.repos.filter((r) => !required.includes(r.name));
  for (const row of optional) {
    checks.push({
      id: `sibling-optional:${row.name}`,
      ok: true,
      detail: row.present ? row.root : `absent (ok): ${row.root}`,
    });
  }

  const webirPkg = join(root, "packages/webir/package.json");
  let webirOk = false;
  let webirDetail = webirPkg;
  if (existsSync(webirPkg)) {
    try {
      const name = JSON.parse(readFileSync(webirPkg, "utf8")).name;
      webirOk = name === "@chrysalis/webir";
      webirDetail = `${webirPkg} (${name})`;
    } catch (e) {
      webirDetail = String(e);
    }
  }
  checks.push({ id: "cwl-webir-reverse-home", ok: webirOk, detail: webirDetail });

  const cwlPkg = join(root, "packages/cwl/package.json");
  let cwlOk = false;
  let cwlDetail = cwlPkg;
  if (existsSync(cwlPkg)) {
    try {
      const j = JSON.parse(readFileSync(cwlPkg, "utf8"));
      cwlOk = j.name === "@chrysalis/cwl";
      cwlDetail = `${j.name}@${j.version}`;
    } catch (e) {
      cwlDetail = String(e);
    }
  }
  checks.push({ id: "cwl-package-junction", ok: cwlOk, detail: cwlDetail });

  const exportScript = join(root, "scripts/export-webir-bundle.mjs");
  checks.push({
    id: "export-webir-bundle",
    ok: existsSync(exportScript),
    detail: exportScript,
  });

  const orbitDoc = join(root, "docs/WPTP-CONVERT-ORBIT.md");
  checks.push({
    id: "orbit-doc",
    ok: existsSync(orbitDoc),
    detail: orbitDoc,
  });

  const failed = checks.filter((c) => !c.ok);
  return {
    kind: WPTP_ORBIT_SMOKE_KIND,
    schemaVersion: WPTP_ORBIT_SMOKE_SCHEMA_VERSION,
    ok: failed.length === 0,
    token: failed.length === 0 ? WPTP_CONVERT_ORBIT_OK : undefined,
    siblingsRoot: siblings.siblingsRoot,
    checks,
    failed: failed.map((c) => c.id),
    generatedAt: new Date().toISOString(),
  };
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const report = await runWptpOrbitSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (report.ok && report.token) console.log(report.token);
  process.exit(report.ok ? 0 : 1);
}
