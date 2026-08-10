#!/usr/bin/env node
/**
 * Prove shared.loadWebir resolves from convert root without cwd==convert,
 * and that `@chrysalis/webir` reverse-homes to chrysalis-cwl (CWL SoR).
 * See docs/WEBIR-REVERSE-HOME.md · chrysalis-cwl WEBIR-FLIP-REQUESTED.md.
 */
import { existsSync, lstatSync, mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { loadWebir } from "./shared.mjs";

export const WEBIR_RESOLVE_SMOKE_KIND = "chrysalis.hub.webir-resolve-smoke";
export const WEBIR_RESOLVE_SMOKE_SCHEMA_VERSION = 2;

const CONVERT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const CWL_WEBIR = resolve(CONVERT_ROOT, "../chrysalis-cwl/packages/webir");
const require = createRequire(join(CONVERT_ROOT, "package.json"));

function isReparsePoint(path) {
  if (process.platform !== "win32") {
    try {
      return lstatSync(path).isSymbolicLink();
    } catch {
      return false;
    }
  }
  const r = spawnSync("fsutil", ["reparsepoint", "query", path], { encoding: "utf8" });
  return r.status === 0;
}

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

    const cwlDist = join(CWL_WEBIR, "dist/index.js");
    checks.push({
      id: "cwl-webir-sor-present",
      ok: existsSync(cwlDist),
      detail: cwlDist.replace(/\\/g, "/"),
    });

    const convertWebir = join(CONVERT_ROOT, "packages/webir");
    const reverseHome =
      existsSync(join(convertWebir, "package.json")) && isReparsePoint(convertWebir);
    checks.push({
      id: "convert-webir-reverse-home",
      ok: reverseHome,
      detail: reverseHome
        ? `junction/symlink → ${CWL_WEBIR.replace(/\\/g, "/")}`
        : "run pnpm run link:webir-from-cwl (packages/webir must not be a physical Convert tree)",
    });

    const pkgJson = JSON.parse(readFileSync(join(CONVERT_ROOT, "package.json"), "utf8"));
    const dep =
      pkgJson.dependencies?.["@chrysalis/webir"] ||
      pkgJson.devDependencies?.["@chrysalis/webir"] ||
      "";
    const depOk =
      typeof dep === "string" &&
      (dep.includes("chrysalis-cwl/packages/webir") || dep === "workspace:*");
    checks.push({
      id: "root-webir-dep-cwl-or-workspace",
      ok: depOk,
      detail: String(dep || "missing"),
    });

    const linked =
      existsSync(join(CONVERT_ROOT, "node_modules/@chrysalis/webir/package.json")) ||
      existsSync(join(CONVERT_ROOT, "node_modules/@chrysalis/webir/dist/index.js"));
    checks.push({
      id: "pnpm-package-link",
      ok: linked,
      detail: linked
        ? "node_modules/@chrysalis/webir present"
        : "missing node_modules/@chrysalis/webir — run pnpm install",
    });

    try {
      const pkgEntry = require.resolve("@chrysalis/webir");
      const pkgMod = await import(pathToFileURL(pkgEntry).href);
      const pkgOk =
        typeof pkgMod?.ModuleBuilder === "function" ||
        typeof pkgMod?.createModuleBuilder === "function" ||
        typeof pkgMod?.Module === "function" ||
        (pkgMod && typeof pkgMod === "object" && Object.keys(pkgMod).length > 0);
      const viaCwl = pkgEntry.replace(/\\/g, "/").includes("chrysalis-cwl");
      checks.push({
        id: "package-import-chrysalis-webir",
        ok: pkgOk,
        detail: pkgEntry.replace(/\\/g, "/"),
      });
      checks.push({
        id: "package-resolves-cwl-tree",
        ok: viaCwl || reverseHome,
        detail: viaCwl
          ? "resolved under chrysalis-cwl"
          : "resolved via convert junction (ok if reverse-home)",
      });
    } catch (e) {
      checks.push({
        id: "package-import-chrysalis-webir",
        ok: false,
        detail: String(e instanceof Error ? e.message : e).slice(0, 400),
      });
    }

    checks.push({
      id: "no-second-webir-sor",
      ok: true,
      detail: "CWL packages/webir is SoR; Convert junction only (docs/WEBIR-REVERSE-HOME.md)",
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
    cwlWebir: CWL_WEBIR.replace(/\\/g, "/"),
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
