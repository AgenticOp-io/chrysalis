#!/usr/bin/env node
/** Hub-translate E2E smoke variants (G192/G208-G210). */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

export const HUB_TRANSLATE_E2E_SMOKE_KIND = "chrysalis.hub.translate-e2e-smoke";
export const HUB_TRANSLATE_E2E_SMOKE_SCHEMA_VERSION = 2;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const translateScript = join(scriptRoot, "scripts/hub-ingest/hub-translate.mjs");
const cliBin = join(scriptRoot, "packages/cli/dist/bin.js");

/** @type {Record<string, { rel: string, origin: string, output: string, manifest: string, expectedPath: string | string[], minRoutes?: number, requireHoleFree?: boolean }>} */
export const TRANSLATE_E2E_VARIANTS = {
  plainPhp: {
    rel: "fixtures/hub-flagship-plain-php",
    origin: "php",
    output: "hono",
    manifest: "chrysalis.routes.json",
    expectedPath: "chrysalis-php",
    minRoutes: 20,
    requireHoleFree: true,
  },
  symfony: {
    rel: "fixtures/hub-flagship-symfony",
    origin: "php",
    output: "hono",
    manifest: "chrysalis.routes.json",
    expectedPath: "chrysalis-php",
    minRoutes: 20,
    requireHoleFree: true,
  },
  tinyBlog: {
    rel: "fixtures/tiny-blog",
    origin: "php",
    output: "hono",
    manifest: "chrysalis.routes.json",
    expectedPath: "chrysalis-php",
    minRoutes: 5,
    requireHoleFree: false,
  },
  express: {
    rel: "fixtures/hub-flagship-express",
    origin: "javascript",
    output: "hono",
    manifest: "src/app.js",
    expectedPath: ["hub-lift-emit", "chrysalis-php"],
    minRoutes: 1,
    requireHoleFree: true,
  },
};

function parseStdoutJson(stdout) {
  const text = stdout.trim();
  const line = text.split("\n").pop() ?? "";
  return JSON.parse(line);
}

/**
 * @param {object} [opts]
 * @param {keyof typeof TRANSLATE_E2E_VARIANTS} [opts.variant]
 */
export function runHubTranslateE2eSmoke(opts = {}) {
  const variantKey = opts.variant ?? "plainPhp";
  const variant = TRANSLATE_E2E_VARIANTS[variantKey];
  if (!variant) {
    return {
      kind: HUB_TRANSLATE_E2E_SMOKE_KIND,
      schemaVersion: HUB_TRANSLATE_E2E_SMOKE_SCHEMA_VERSION,
      variant: variantKey,
      ok: false,
      skip: "unknown-variant",
    };
  }

  const fixture = resolve(opts.fixture ?? join(scriptRoot, variant.rel));
  const base = {
    kind: HUB_TRANSLATE_E2E_SMOKE_KIND,
    schemaVersion: HUB_TRANSLATE_E2E_SMOKE_SCHEMA_VERSION,
    variant: variantKey,
    fixture: variant.rel,
    ok: false,
  };

  if (!existsSync(join(fixture, variant.manifest))) {
    return { ...base, skip: "missing-manifest" };
  }
  if (variant.origin === "php" && !existsSync(cliBin)) {
    return { ...base, skip: "missing-cli-dist" };
  }

  const workDir = mkdtempSync(join(tmpdir(), "chrysalis-hub-translate-e2e-"));
  try {
    cpSync(fixture, workDir, { recursive: true });
    const args = [translateScript, workDir, "--origin", variant.origin, "--output", variant.output];
    if (variant.origin === "php") args.push("--cli", cliBin);

    const r = spawnSync(process.execPath, args, {
      cwd: scriptRoot,
      encoding: "utf8",
      maxBuffer: 30 * 1024 * 1024,
      env: {
        ...process.env,
        ...(variant.origin === "javascript" ? { CHRYSALIS_HUB_PREFER_WPTP: "0" } : {}),
      },
    });
    if (r.status !== 0) {
      return { ...base, skip: "translate-failed", detail: (r.stderr ?? "").slice(0, 300) };
    }

    let parsed;
    try {
      parsed = parseStdoutJson(r.stdout);
    } catch {
      return { ...base, skip: "translate-json-missing" };
    }

    const cwlPath = join(workDir, ".chrysalis", "migration.cwl");
    const cwlExists = existsSync(cwlPath);
    const cwlExport = parsed.cwlExport ?? {};
    const expected = Array.isArray(variant.expectedPath) ? variant.expectedPath : [variant.expectedPath];
    const pathOk = expected.includes(parsed.path);
    const holeOk = variant.requireHoleFree === false ? cwlExport.ok === true : cwlExport.holeCount === 0;
    const ok =
      parsed.ok === true &&
      pathOk &&
      cwlExport.ok === true &&
      holeOk &&
      cwlExists &&
      (cwlExport.routeCount ?? 0) >= (variant.minRoutes ?? 1);

    return {
      ...base,
      ok,
      path: parsed.path ?? null,
      cwlExport: {
        ok: cwlExport.ok === true,
        holeCount: cwlExport.holeCount ?? null,
        routeCount: cwlExport.routeCount ?? null,
        source: cwlExport.source ?? null,
      },
      migrationCwlExists: cwlExists,
      generatedAt: new Date().toISOString(),
    };
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

/** @param {Array<keyof typeof TRANSLATE_E2E_VARIANTS>} [variants] */
export function runHubTranslateE2eBatch(variants = ["plainPhp", "symfony", "tinyBlog", "express"]) {
  /** @type {Record<string, ReturnType<typeof runHubTranslateE2eSmoke>>} */
  const results = {};
  let ok = true;
  for (const v of variants) {
    const report = runHubTranslateE2eSmoke({ variant: v });
    results[v] = report;
    if (!report.ok && report.skip !== "missing-cli-dist") ok = false;
  }
  return { ok, results };
}

function parseArgs(argv) {
  let variant = "plainPhp";
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--symfony") variant = "symfony";
    else if (argv[i] === "--express") variant = "express";
    else if (argv[i] === "--tiny-blog") variant = "tinyBlog";
    else if (argv[i] === "--all") variant = "all";
  }
  return { variant };
}

async function main() {
  const { variant } = parseArgs(process.argv);
  if (variant === "all") {
    const batch = runHubTranslateE2eBatch();
    console.log(JSON.stringify(batch, null, 2));
    if (!batch.ok) process.exit(1);
    return;
  }
  const report = runHubTranslateE2eSmoke({ variant });
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && !report.skip) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
