#!/usr/bin/env node
/**
 * CWL language pillar bridge smoke (G10123 / D6548).
 * Always check CWL as core: resolve chrysalis-cwl, require LANGUAGE_VERSION +
 * language-gold local parse→print (+ DNA bridge contract) gates, then Convert
 * WebIR round-trip on a hole-free subset (WebIR still lives in Convert).
 * RFC-0022 DNA seed/enforce stays in chrysalis-security — Convert only consumes
 * the surface gold via WebIR round-trip + pillar gate spawn.
 */
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCwlModule } from "./cwl-parser.mjs";
import { runCwlRoundtripSmoke } from "./hub-cwl-roundtrip-smoke.mjs";

export const CWL_LANGUAGE_PILLAR_SMOKE_KIND = "chrysalis.hub.cwl-language-pillar-smoke";
export const CWL_LANGUAGE_PILLAR_SMOKE_SCHEMA_VERSION = 3;

const CONVERT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** Hole-free language-gold dirs safe for Convert WebIR round-trip (no hole stmt).
 * Expand as CWL pillar adds goldens; skip holes + multi-file (import graph). */
const WEBIR_ROUNDTRIP_DIRS = [
  "01-literals",
  "02-path-params",
  "03-query-params",
  "06-response-status",
  "09-fullstack-page",
  "13-middleware",
  "16-layout",
  "24-dna-bridge",
  "32-stream-sse",
  "33-ui-island-contracts",
];

/**
 * @param {{ cwlRoot?: string }} [opts]
 */
export function resolveCwlPillarRoot(opts = {}) {
  if (opts.cwlRoot) return resolve(opts.cwlRoot);
  if (process.env.CHRYSALIS_CWL_ROOT) return resolve(process.env.CHRYSALIS_CWL_ROOT);
  const sibling = resolve(CONVERT_ROOT, "../chrysalis-cwl");
  if (existsSync(join(sibling, "LANGUAGE_VERSION.md"))) return sibling;
  try {
    const realPkg = realpathSync(join(CONVERT_ROOT, "packages/cwl"));
    const viaJunction = resolve(realPkg, "../..");
    if (existsSync(join(viaJunction, "LANGUAGE_VERSION.md"))) return viaJunction;
  } catch {
    /* ignore */
  }
  return sibling;
}

/**
 * @param {string} text
 */
export function parseLanguageVersionDoc(text) {
  const lang =
    /\*\*languageVersion\*\*\s*\|\s*`([^`]+)`/i.exec(text) ||
    /\*\*Version\*\*\s*\|\s*`([^`]+)`/i.exec(text);
  const schema =
    /\*\*schemaVersion\*\*\s*\|\s*`([^`]+)`/i.exec(text) ||
    /\*\*Status\*\*\s*\|\s*([^\n|]+)/i.exec(text);
  return {
    languageVersion: lang?.[1]?.trim() ?? null,
    schemaOrStatus: schema?.[1]?.trim()?.replace(/^`|`$/g, "") ?? null,
  };
}

/**
 * @param {{ cwlRoot?: string }} [opts]
 */
export async function runCwlLanguagePillarSmoke(opts = {}) {
  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const checks = [];
  const cwlRoot = resolveCwlPillarRoot(opts);
  const versionPath = join(cwlRoot, "LANGUAGE_VERSION.md");
  const versionOk = existsSync(versionPath);
  checks.push({
    id: "language-version-doc",
    ok: versionOk,
    detail: versionOk ? versionPath : `missing:${versionPath}`,
  });

  let languageVersion = null;
  if (versionOk) {
    const parsed = parseLanguageVersionDoc(readFileSync(versionPath, "utf8"));
    languageVersion = parsed.languageVersion;
    checks.push({
      id: "language-version-fields",
      ok: Boolean(languageVersion && /^\d+\.\d+\.\d+/.test(languageVersion)),
      detail: JSON.stringify(parsed),
    });
  }

  const pkgPath = join(cwlRoot, "packages/cwl/package.json");
  let pkgOk = existsSync(pkgPath);
  if (pkgOk) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      pkgOk = pkg.name === "@chrysalis/cwl" && typeof pkg.version === "string";
    } catch {
      pkgOk = false;
    }
  } else if (existsSync(join(cwlRoot, "packages/cwl/README.md"))) {
    // README-only surface is acceptable until package.json lands
    pkgOk = true;
  }
  checks.push({ id: "cwl-package-surface", ok: pkgOk, detail: pkgPath });

  const goldRoot = join(cwlRoot, "fixtures/language-gold");
  const goldDirs = existsSync(goldRoot)
    ? readdirSync(goldRoot, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort()
    : [];
  checks.push({
    id: "language-gold-count",
    ok: goldDirs.length >= 20,
    detail: `${goldDirs.length}:${goldDirs.join(",") || "none"}`,
  });

  const pkgVersionPath = join(cwlRoot, "packages/cwl/package.json");
  if (languageVersion && existsSync(pkgVersionPath)) {
    try {
      const pkgVer = JSON.parse(readFileSync(pkgVersionPath, "utf8")).version;
      checks.push({
        id: "language-version-pkg-align",
        ok: pkgVer === languageVersion,
        detail: `LANGUAGE_VERSION=${languageVersion};@chrysalis/cwl=${pkgVer}`,
      });
    } catch (e) {
      checks.push({
        id: "language-version-pkg-align",
        ok: false,
        detail: String(e).slice(0, 200),
      });
    }
  }

  /**
   * @param {string} id
   * @param {string} relScript
   * @param {string} okLabel
   */
  function spawnPillarGate(id, relScript, okLabel) {
    const gateScript = join(cwlRoot, relScript);
    if (!existsSync(gateScript)) {
      checks.push({ id, ok: false, detail: `missing:${gateScript}` });
      return;
    }
    const spawned = spawnSync(process.execPath, [gateScript], {
      cwd: cwlRoot,
      encoding: "utf8",
      env: process.env,
    });
    checks.push({
      id,
      ok: spawned.status === 0,
      detail:
        spawned.status === 0
          ? okLabel
          : (spawned.stderr || spawned.stdout || "").slice(0, 400),
    });
  }

  spawnPillarGate(
    "cwl-local-parse-print-gate",
    "scripts/gate-cwl-roundtrip.mjs",
    "gate-cwl-roundtrip STATUS_OK",
  );
  spawnPillarGate(
    "cwl-dna-bridge-contract-gate",
    "scripts/gate-cwl-dna-bridge.mjs",
    "gate-cwl-dna-bridge STATUS_OK",
  );

  for (const name of WEBIR_ROUNDTRIP_DIRS) {
    const dir = join(goldRoot, name);
    const cwlPath = join(dir, "routes.cwl");
    if (!existsSync(cwlPath)) {
      checks.push({ id: `webir-roundtrip:${name}`, ok: false, detail: "missing" });
      continue;
    }
    const source = readFileSync(cwlPath, "utf8");
    let mod;
    try {
      mod = parseCwlModule(source, cwlPath);
    } catch (e) {
      checks.push({ id: `parse:${name}`, ok: false, detail: String(e).slice(0, 200) });
      continue;
    }
    checks.push({
      id: `parse:${name}`,
      ok: Boolean(mod.moduleName) && (mod.routes?.length ?? 0) >= 1,
      detail: `module=${mod.moduleName};routes=${mod.routes?.length ?? 0}`,
    });
    const round = await runCwlRoundtripSmoke({
      fixtureRel: `chrysalis-cwl/fixtures/language-gold/${name}`,
      fixtureDir: dir,
      rfc: "CWL-LANGUAGE-PILLAR",
      moduleName: mod.moduleName ?? name.replace(/-/g, "_"),
      header: `# CWL language pillar (${name})`,
    });
    checks.push({
      id: `webir-roundtrip:${name}`,
      ok: round.ok === true,
      detail: round.skip ?? `routes=${round.rendered?.routeCount ?? 0}`,
    });
  }

  const holesPath = join(goldRoot, "11-holes/routes.cwl");
  if (existsSync(holesPath)) {
    const mod = parseCwlModule(readFileSync(holesPath, "utf8"), holesPath);
    const holeOk = mod.routes.some((r) => r.body?.kind === "hole");
    checks.push({
      id: "honest-hole-preserved",
      ok: holeOk,
      detail: JSON.stringify(mod.routes.map((r) => r.body?.kind)),
    });
  }

  const junctionReadme = join(CONVERT_ROOT, "packages/cwl/README.md");
  checks.push({
    id: "convert-cwl-junction",
    ok: existsSync(junctionReadme),
    detail: junctionReadme,
  });

  const ok = checks.every((c) => c.ok);
  return {
    kind: CWL_LANGUAGE_PILLAR_SMOKE_KIND,
    schemaVersion: CWL_LANGUAGE_PILLAR_SMOKE_SCHEMA_VERSION,
    ok,
    gate: "G10123",
    decision: "D6548",
    thesis: "CWL matures as language core; Convert bridges via local gate + WebIR subset",
    cwlRoot,
    languageVersion,
    goldenDirs: goldDirs,
    checks,
    failed: checks.filter((c) => !c.ok),
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlLanguagePillarSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

if (
  process.argv[1] &&
  /hub-cwl-language-pillar-smoke\.mjs$/.test(process.argv[1].replace(/\\/g, "/"))
) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
