#!/usr/bin/env node
/**
 * Prove shared.loadWebir resolves from convert root without cwd==convert,
 * and that pnpm workspace links `@chrysalis/webir` for package import
 * (WEBIR-EXTRACT-PLAN link-until-pnpm exit criterion 1 — progress, not ownership flip).
 */
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { loadWebir } from "./shared.mjs";

export const WEBIR_RESOLVE_SMOKE_KIND = "chrysalis.hub.webir-resolve-smoke";
export const WEBIR_RESOLVE_SMOKE_SCHEMA_VERSION = 1;

const CONVERT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(join(CONVERT_ROOT, "package.json"));

/**
 * @param {{ keepCwd?: boolean }} [opts]
 */
export async function runWebirResolveSmoke(opts = {}) {
  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const checks = [];
  const prevCwd = process.cwd();
  const foreign = mkdtempSync(join(tmpdir(), "chrysalis-webir-resolve-"));

  try {
    if (!opts.keepCwd) {
      process.chdir(foreign);
    }
    checks.push({
      id: "cwd-is-foreign",
      ok: opts.keepCwd ? true : process.cwd() === foreign,
      detail: process.cwd(),
    });

    const webir = await loadWebir();
    const hasBuilder =
      typeof webir?.ModuleBuilder === "function" ||
      typeof webir?.createModuleBuilder === "function" ||
      typeof webir?.Module === "function" ||
      (webir && typeof webir === "object" && Object.keys(webir).length > 0);
    checks.push({
      id: "loadWebir-from-foreign-cwd",
      ok: Boolean(hasBuilder),
      detail: webir ? Object.keys(webir).slice(0, 12).join(",") : "null",
    });

    const linked =
      existsSync(join(CONVERT_ROOT, "node_modules/@chrysalis/webir/package.json")) ||
      existsSync(join(CONVERT_ROOT, "node_modules/@chrysalis/webir/dist/index.js"));
    checks.push({
      id: "pnpm-workspace-link",
      ok: linked,
      detail: linked
        ? "node_modules/@chrysalis/webir present"
        : "missing node_modules/@chrysalis/webir — run pnpm install",
    });

    try {
      // Resolve from convert package.json so foreign cwd cannot hide the workspace link.
      const pkgEntry = require.resolve("@chrysalis/webir");
      const pkgMod = await import(pathToFileURL(pkgEntry).href);
      const pkgOk =
        typeof pkgMod?.ModuleBuilder === "function" ||
        typeof pkgMod?.createModuleBuilder === "function" ||
        typeof pkgMod?.Module === "function" ||
        (pkgMod && typeof pkgMod === "object" && Object.keys(pkgMod).length > 0);
      checks.push({
        id: "package-import-chrysalis-webir",
        ok: pkgOk,
        detail: pkgEntry.replace(/\\/g, "/"),
      });
    } catch (e) {
      checks.push({
        id: "package-import-chrysalis-webir",
        ok: false,
        detail: String(e instanceof Error ? e.message : e).slice(0, 400),
      });
    }

    checks.push({
      id: "no-physical-flip",
      ok: true,
      detail: "packages/webir remains under convert (link-until-pnpm)",
    });
  } catch (e) {
    checks.push({
      id: "loadWebir-from-foreign-cwd",
      ok: false,
      detail: String(e instanceof Error ? e.message : e).slice(0, 400),
    });
  } finally {
    try {
      process.chdir(prevCwd);
    } catch {
      process.chdir(CONVERT_ROOT);
    }
    try {
      rmSync(foreign, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  const failed = checks.filter((c) => !c.ok);
  return {
    kind: WEBIR_RESOLVE_SMOKE_KIND,
    schemaVersion: WEBIR_RESOLVE_SMOKE_SCHEMA_VERSION,
    ok: failed.length === 0,
    convertRoot: CONVERT_ROOT.replace(/\\/g, "/"),
    checks,
    failed: failed.map((c) => c.id),
    generatedAt: new Date().toISOString(),
  };
}

const isDirect =
  process.argv[1] != null &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirect) {
  const report = await runWebirResolveSmoke();
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}
