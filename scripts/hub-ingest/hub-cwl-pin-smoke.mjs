#!/usr/bin/env node
/**
 * Convert consumer pin smoke — @chrysalis/cwl file: pin + VERSION surface.
 * Does not own language semantics (chrysalis-cwl). No UT spine here.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const CWL_PIN_SMOKE_KIND = "chrysalis.hub.cwl-pin-smoke";
export const CWL_PIN_SMOKE_SCHEMA_VERSION = 1;

const CONVERT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const EXPECTED_PIN = "file:../chrysalis-cwl/packages/cwl";

/**
 * @param {{ convertRoot?: string }} [opts]
 */
export async function runCwlPinSmoke(opts = {}) {
  const root = opts.convertRoot ? resolve(opts.convertRoot) : CONVERT_ROOT;
  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const checks = [];

  const pkgPath = join(root, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const pin =
    pkg.dependencies?.["@chrysalis/cwl"] ||
    pkg.devDependencies?.["@chrysalis/cwl"] ||
    pkg.optionalDependencies?.["@chrysalis/cwl"] ||
    null;
  const pinOk =
    pin === EXPECTED_PIN ||
    (typeof pin === "string" && pin.includes("chrysalis-cwl/packages/cwl"));
  checks.push({
    id: "package-json-file-pin",
    ok: pinOk,
    detail: pin == null ? "missing" : String(pin),
  });

  const indexPath = join(root, "packages/cwl/index.mjs");
  checks.push({
    id: "packages-cwl-index",
    ok: existsSync(indexPath),
    detail: indexPath,
  });

  if (existsSync(indexPath)) {
    const mod = await import(pathToFileURL(indexPath).href);
    const version = mod.VERSION;
    const lang = typeof mod.languageVersion === "function" ? mod.languageVersion() : null;
    const pillar = typeof mod.pillarRoot === "function" ? mod.pillarRoot() : null;
    checks.push({
      id: "export-VERSION",
      ok: typeof version === "string" && /^\d+\.\d+\.\d+/.test(version),
      detail: String(version),
    });
    checks.push({
      id: "export-languageVersion-align",
      ok: lang === version,
      detail: `languageVersion=${lang};VERSION=${version}`,
    });
  checks.push({
    id: "export-pillarRoot",
    ok: Boolean(pillar && existsSync(join(pillar, "LANGUAGE_VERSION.md"))),
    detail: pillar ? String(pillar) : "missing",
  });
  checks.push({
    id: "cwl-1.0-pin-floor",
    ok: typeof version === "string" && Number.parseInt(String(version).split(".")[0] ?? "0", 10) >= 1,
    detail: `VERSION=${version} (Exit 1.0+ file: pin)`,
  });
  // Tip floor for CWL Helix DNA seed parity + control-lower sync (LANGUAGE_VERSION / 1.0.23).
  const parts = String(version ?? "").split(".").map((x) => Number.parseInt(x, 10));
  const tipOk =
    parts.length >= 3 &&
    !parts.some((n) => Number.isNaN(n)) &&
    (parts[0] > 1 ||
      (parts[0] === 1 && parts[1] > 0) ||
      (parts[0] === 1 && parts[1] === 0 && parts[2] >= 23));
  checks.push({
    id: "cwl-1.0.23-tip-floor",
    ok: tipOk,
    detail: `VERSION=${version} (expect >= 1.0.23 named UI islands + form event contracts (gold 33))`,
  });
  for (const sub of ["parser", "print", "diagnose", "lsp-map", "dna-seed"]) {
    const subPath = join(root, "packages/cwl", `${sub}.mjs`);
    checks.push({
      id: `package-subpath-${sub}`,
      ok: existsSync(subPath),
      detail: subPath,
    });
  }
  // Prove package subpath import via file URL (pnpm link may lag; junction is SoR).
  try {
    const parserUrl = pathToFileURL(join(root, "packages/cwl/parser.mjs")).href;
    const parserMod = await import(parserUrl);
    checks.push({
      id: "import-cwl-parser-subpath",
      ok: typeof parserMod.parseCwlModule === "function" || Object.keys(parserMod).length > 0,
      detail: Object.keys(parserMod).slice(0, 8).join(","),
    });
  } catch (e) {
    checks.push({
      id: "import-cwl-parser-subpath",
      ok: false,
      detail: String(e instanceof Error ? e.message : e).slice(0, 300),
    });
  }
  try {
    const seedUrl = pathToFileURL(join(root, "packages/cwl/dna-seed.mjs")).href;
    const seedMod = await import(seedUrl);
    const seedOk =
      typeof seedMod.pathTemplateShapeEqual === "function" &&
      typeof seedMod.responseKeyFingerprint === "function" &&
      typeof seedMod.namesKeyFingerprint === "function";
    checks.push({
      id: "import-cwl-dna-seed-subpath",
      ok: seedOk,
      detail: Object.keys(seedMod).slice(0, 12).join(","),
    });
  } catch (e) {
    checks.push({
      id: "import-cwl-dna-seed-subpath",
      ok: false,
      detail: String(e instanceof Error ? e.message : e).slice(0, 300),
    });
  }
  checks.push({
    id: "no-convert-ut-spine",
    ok: !JSON.stringify(pkg.scripts || {}).includes("pilot:ut-spine"),
    detail: "spine owned by chrysalis-cwl smoke:ut-spine",
  });
  checks.push({
    id: "convert-cwl-consume-doc",
    ok: existsSync(join(root, "docs/CONVERT-CWL-CONSUME.md")),
    detail: "docs/CONVERT-CWL-CONSUME.md",
  });
  checks.push({
    id: "npmrc-example-registry",
    ok: existsSync(join(root, ".npmrc.example")),
    detail: ".npmrc.example (@agenticop-io/cwl GitHub Packages)",
  });
  }

  const failed = checks.filter((c) => !c.ok);
  const report = {
    kind: CWL_PIN_SMOKE_KIND,
    schemaVersion: CWL_PIN_SMOKE_SCHEMA_VERSION,
    ok: failed.length === 0,
    expectedPin: EXPECTED_PIN,
    checks,
    failed: failed.map((c) => c.id),
    generatedAt: new Date().toISOString(),
  };
  return report;
}

const isDirect =
  process.argv[1] != null &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirect) {
  const report = await runCwlPinSmoke();
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}
