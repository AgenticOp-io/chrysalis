/**
 * Pipeline-owned migration sidecars (DESIGN success metrics 3–4). Consumes
 * per-pilot **`reports/migration/<emit-stats>.json`** (written by verify scripts)
 * and scans emitted handlers for `@chrysalis/compat` usage. Does not import
 * `webir` / emit packages.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";

/**
 * @param {string} dir
 * @param {string[]} [acc]
 */
export function walkTsHandlerFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      walkTsHandlerFiles(p, acc);
    } else if (ent.isFile() && extname(p) === ".ts" && !p.endsWith(".test.ts")) {
      acc.push(p);
    }
  }
  return acc;
}

/**
 * @param {string} handlersDir
 */
export function scanCompatUsageInHandlers(handlersDir) {
  const files = walkTsHandlerFiles(handlersDir);
  let filesWithCompatImport = 0;
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    if (/@chrysalis\/compat/.test(text)) {
      filesWithCompatImport += 1;
    }
  }
  return { totalTsFiles: files.length, filesWithCompatImport };
}

/**
 * @param {ReturnType<typeof scanCompatUsageInHandlers> | null} hono
 * @param {ReturnType<typeof scanCompatUsageInHandlers> | null} fastify
 * @returns {number | null}
 */
export function idiomaticityPctFromScans(hono, fastify) {
  const scans = [hono, fastify].filter((s) => s != null && s.totalTsFiles > 0);
  if (scans.length === 0) {
    return null;
  }
  const pcts = scans.map((s) => {
    if (s.totalTsFiles === 0) return 1;
    return 1 - s.filesWithCompatImport / s.totalTsFiles;
  });
  return Math.max(0, Math.min(1, Math.min(...pcts)));
}

/**
 * @param {{
 *   manifestRoutes?: number;
 *   hono?: { holes?: number };
 *   fastify?: { holes?: number };
 * }} stats
 * @returns {number | null}
 */
export function residualLegacyRequestPctFromEmitStats(stats) {
  if (!stats || typeof stats.manifestRoutes !== "number" || stats.manifestRoutes < 1) {
    return null;
  }
  const maxHoles = Math.max(stats.hono?.holes ?? 0, stats.fastify?.holes ?? 0);
  const routes = Math.max(1, stats.manifestRoutes);
  return Math.min(100, (100 * maxHoles) / routes);
}

/**
 * Counts emit report holes tagged for the auth-boundary track (`reason` starts with `auth:`).
 *
 * @param {ReadonlyArray<{ reason?: string }> | undefined} holes
 * @returns {number}
 */
export function countAuthTaggedHoles(holes) {
  if (!Array.isArray(holes)) {
    return 0;
  }
  let n = 0;
  for (const h of holes) {
    if (typeof h?.reason === "string" && h.reason.startsWith("auth:")) {
      n += 1;
    }
  }
  return n;
}

/**
 * @param {{ holes?: number; authHoles?: number } | undefined} emitter
 */
function authHoleCountFromEmitterStats(emitter) {
  const n = emitter && typeof emitter.authHoles === "number" ? emitter.authHoles : 0;
  return Math.max(0, n);
}

/**
 * Auth-boundary hole density vs manifest routes (parallel to legacyRequestPct).
 * @param {number} manifestRoutes
 * @param {number} maxAuthHoles
 */
export function authLegacyRequestPctFromEmitStats(manifestRoutes, maxAuthHoles) {
  if (typeof manifestRoutes !== "number" || manifestRoutes < 1) {
    return null;
  }
  const routes = Math.max(1, manifestRoutes);
  return Math.min(100, (100 * Math.max(0, maxAuthHoles)) / routes);
}

/**
 * @param {string} repoRoot
 * @param {{
 *   emitStatsFilename: string;
 *   honoHandlersRel: string;
 *   fastifyHandlersRel: string;
 *   pilot: string;
 * }} spec
 * @returns {boolean} true if residual sidecar was written (idiomaticity optional)
 */
export function writeMigrationSidecars(repoRoot, spec) {
  const migrationDir = join(repoRoot, "reports/migration");
  const emitStatsPath = join(migrationDir, spec.emitStatsFilename);
  if (!existsSync(emitStatsPath)) {
    console.log(
      `[flagship-migration-metrics] ${spec.emitStatsFilename} missing — skipping idiomaticity/residual sidecars (${spec.pilot})`,
    );
    return false;
  }
  /** @type {{ manifestRoutes?: number; hono?: { holes?: number }; fastify?: { holes?: number } }} */
  let stats;
  try {
    stats = JSON.parse(readFileSync(emitStatsPath, "utf8"));
  } catch {
    console.log(`[flagship-migration-metrics] emit stats invalid JSON (${spec.pilot}) — skipping sidecars`);
    return false;
  }

  const honoHandlers = join(repoRoot, spec.honoHandlersRel);
  const fastHandlers = join(repoRoot, spec.fastifyHandlersRel);
  const honoScan = existsSync(honoHandlers) ? scanCompatUsageInHandlers(honoHandlers) : null;
  const fastScan = existsSync(fastHandlers) ? scanCompatUsageInHandlers(fastHandlers) : null;
  const pct = idiomaticityPctFromScans(honoScan, fastScan);
  mkdirSync(migrationDir, { recursive: true });
  let wrote = false;
  if (pct == null) {
    console.log(
      `[flagship-migration-metrics] no emitted handler trees (${spec.pilot}) — skipping idiomaticity sidecar`,
    );
  } else {
    const idiomaticity = {
      pct,
      pilot: spec.pilot,
      source: "scan:compat-imports-in-emitted-handlers",
      hono: honoScan,
      fastify: fastScan,
      schema: "chrysalis/migration-idiomaticity/1",
    };
    writeFileSync(join(migrationDir, "idiomaticity.json"), `${JSON.stringify(idiomaticity, null, 2)}\n`);
    console.log(`[flagship-migration-metrics] wrote reports/migration/idiomaticity.json (${spec.pilot})`);
    wrote = true;
  }

  const legacyRequestPct = residualLegacyRequestPctFromEmitStats(stats);
  if (legacyRequestPct == null) {
    console.log(`[flagship-migration-metrics] could not derive residual legacy (${spec.pilot}) — skipping sidecar`);
    return wrote;
  }
  const maxHoles = Math.max(stats.hono?.holes ?? 0, stats.fastify?.holes ?? 0);
  const maxAuthHoles = Math.max(
    authHoleCountFromEmitterStats(stats.hono),
    authHoleCountFromEmitterStats(stats.fastify),
  );
  const authLegacyRequestPct = authLegacyRequestPctFromEmitStats(stats.manifestRoutes, maxAuthHoles) ?? 0;
  const residual = {
    legacyRequestPct,
    pilot: spec.pilot,
    definition: "emit-hole-density-vs-manifest-routes",
    manifestRoutes: stats.manifestRoutes,
    emitHoleMax: maxHoles,
    authLegacyRequestPct,
    authEmitHoleMax: maxAuthHoles,
    authDefinition: "emit-auth-hole-density-vs-manifest-routes",
    source: spec.emitStatsFilename,
    notes:
      "Oracle capture in this pipeline is 100% PHP docroot; this metric indexes emit-time holes vs manifest route count, not chimera production traffic (DESIGN.md success metrics).",
    schema: "chrysalis/migration-residual-legacy/1",
  };
  writeFileSync(join(migrationDir, "residual-legacy.json"), `${JSON.stringify(residual, null, 2)}\n`);
  console.log(`[flagship-migration-metrics] wrote reports/migration/residual-legacy.json (${spec.pilot})`);
  return true;
}

/**
 * @param {string} repoRoot
 * @returns {boolean}
 */
export function writeFlagshipLaravelFullMigrationSidecars(repoRoot) {
  return writeMigrationSidecars(repoRoot, {
    emitStatsFilename: "flagship-laravel-full-emit-stats.json",
    honoHandlersRel: "generated/flagship-laravel-full/src/handlers",
    fastifyHandlersRel: "generated/flagship-laravel-full-fastify/src/handlers",
    pilot: "laravel-full",
  });
}

/**
 * @param {string} repoRoot
 * @returns {boolean}
 */
export function writeFlagshipLaravelMinMigrationSidecars(repoRoot) {
  return writeMigrationSidecars(repoRoot, {
    emitStatsFilename: "flagship-laravel-min-emit-stats.json",
    honoHandlersRel: "generated/flagship-laravel-min/src/handlers",
    fastifyHandlersRel: "generated/flagship-laravel-min-fastify/src/handlers",
    pilot: "laravel-min",
  });
}
