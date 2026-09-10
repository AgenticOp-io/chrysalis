#!/usr/bin/env node
/**
 * Convert WPTP orbit cohesion smoke — siblings resolve + load real platforms/@wptp code.
 * Does not require matrix gold or full Next emit suites (those stay optional / honest skip).
 *
 *   pnpm run hub:wptp-orbit-smoke
 *   CHRYSALIS_SKIP_WPTP=1  → soft-ok skip
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import {
  listWptpSiblingStatus,
  resolveWptpPackageEntry,
  resolveWptpRepoRoot,
} from "../lib/wptp-siblings.mjs";

export const WPTP_ORBIT_SMOKE_KIND = "chrysalis.hub.wptp-orbit-smoke";
export const WPTP_ORBIT_SMOKE_SCHEMA_VERSION = 1;
export const WPTP_CONVERT_ORBIT_OK = "WPTP_CONVERT_ORBIT_OK";

const CONVERT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * @param {string} convertRoot
 * @param {string} name
 * @param {string[]} [needExports]
 */
async function importSibling(convertRoot, name, needExports = []) {
  const entry = resolveWptpPackageEntry(convertRoot, name);
  if (!entry) {
    return { ok: false, detail: `no dist/src entry under ${resolveWptpRepoRoot(convertRoot, name)}` };
  }
  try {
    const mod = await import(pathToFileURL(entry).href);
    const missing = needExports.filter((k) => typeof mod[k] !== "function" && typeof mod[k] !== "string");
    if (missing.length) {
      return { ok: false, detail: `${entry} missing exports: ${missing.join(",")}` };
    }
    return { ok: true, detail: entry };
  } catch (e) {
    return { ok: false, detail: `${entry}: ${e && e.message ? e.message : String(e)}` };
  }
}

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
  const prefersPlatforms = /[/\\]platforms$/i.test(siblings.siblingsRoot);
  checks.push({
    id: "siblings-root",
    ok: Boolean(siblings.siblingsRoot),
    detail: siblings.siblingsRoot,
  });
  checks.push({
    id: "siblings-prefer-platforms",
    ok: prefersPlatforms || process.env.WPTP_SIBLINGS_ROOT != null,
    detail: prefersPlatforms
      ? "platforms/"
      : process.env.WPTP_SIBLINGS_ROOT
        ? `env override: ${process.env.WPTP_SIBLINGS_ROOT}`
        : `expected ../../platforms when present; got ${siblings.siblingsRoot}`,
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

  // Load real platforms code (not package.json-only).
  const irLoad = await importSibling(root, "wptp-ir", ["importWebIrBundleJson", "assertIrDocumentV0"]);
  checks.push({ id: "import:wptp-ir", ok: irLoad.ok, detail: irLoad.detail });

  const emitLoad = await importSibling(root, "wptp-emit-nextjs", ["emitNextJsAppRouter"]);
  checks.push({ id: "import:wptp-emit-nextjs", ok: emitLoad.ok, detail: emitLoad.detail });

  // Adapters / bronze emits: require built entry when the sibling is present (deps may be uninstalled).
  for (const name of ["wptp-adapter-openapi", "wptp-adapter-browser", "wptp-emit-hono", "wptp-emit-fastify"]) {
    const row = siblings.repos.find((r) => r.name === name);
    if (!row?.present) {
      checks.push({ id: `entry-optional:${name}`, ok: true, detail: "absent (ok)" });
      continue;
    }
    const entry = resolveWptpPackageEntry(root, name);
    checks.push({
      id: `entry-optional:${name}`,
      ok: Boolean(entry),
      detail: entry || `present but no dist/src entry under ${row.root}`,
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

  const wholeDoc = join(root, "docs/CONVERT-WHOLE-SYSTEM.md");
  checks.push({
    id: "whole-system-doc",
    ok: existsSync(wholeDoc),
    detail: wholeDoc,
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
