/**
 * Composer cross-edge translate: Lang A → WebIR → CWL → emit Lang B.
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exportOriginToCwl } from "./hub-project-to-cwl-all-origins.mjs";
import {
  CWL_ORIGIN_FIXTURES,
  resolveCwlOriginFixturePath,
  CWL_ORIGIN_FIXTURES_ROOT,
} from "./hub-cwl-origin-fixtures.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * @param {string} fromId
 * @param {object} [charter]
 */
export function resolveOriginFixture(fromId, charter) {
  const override = charter?.crossEdgeFixtureOverrides?.[fromId];
  if (override) {
    return { id: fromId, rel: override, origin: fromId, minRoutes: 1 };
  }
  const fixture = CWL_ORIGIN_FIXTURES.find((f) => f.id === fromId);
  if (!fixture) return null;
  return fixture;
}

/**
 * @param {{ from: string, to: string, emit: string, emitTarget?: string, maxHoleCount?: number, charter?: object }} edge
 */
export async function runComposerCrossEdge(edge) {
  const fixture = resolveOriginFixture(edge.from, edge.charter);
  if (!fixture) {
    return { from: edge.from, to: edge.to, ok: false, skip: "unknown-origin" };
  }
  const src = fixture.rel.startsWith("fixtures/")
    ? join(scriptRoot, fixture.rel)
    : resolveCwlOriginFixturePath(fixture, CWL_ORIGIN_FIXTURES_ROOT);
  if (!existsSync(src)) {
    return { from: edge.from, to: edge.to, ok: false, skip: "missing-fixture" };
  }

  const tmp = mkdtempSync(join(tmpdir(), `chrysalis-xedge-${edge.from}-${edge.to}-`));
  try {
    cpSync(src, tmp, { recursive: true });
    const staleChrysalis = join(tmp, ".chrysalis");
    if (existsSync(staleChrysalis)) rmSync(staleChrysalis, { recursive: true, force: true });
    const exported = await exportOriginToCwl(
      {
        id: edge.from,
        origin: fixture.origin,
        rel: ".",
        requireHoleFree: fixture.requireHoleFree,
        minRoutes: fixture.minRoutes ?? 1,
      },
      tmp,
    );
    const exportedRoutes = exported.routeCount ?? 0;
    if (exported.ok !== true || exportedRoutes < (fixture.minRoutes ?? 1)) {
      return { from: edge.from, to: edge.to, ok: false, skip: "cwl-export-failed", exportedRoutes };
    }

    const cwlHubDir = join(tmp, ".chrysalis");
    const migrationPath = join(cwlHubDir, "migration.cwl");
    if (!existsSync(migrationPath)) {
      return { from: edge.from, to: edge.to, ok: false, skip: "missing-migration-cwl" };
    }

    const srcWebir = join(cwlHubDir, `hub.${fixture.origin}.webir.json`);
    const cwlWebirDir = join(cwlHubDir, ".chrysalis");
    const cwlWebirPath = join(cwlWebirDir, "hub.cwl.webir.json");
    if (!existsSync(srcWebir)) {
      return { from: edge.from, to: edge.to, ok: false, skip: "missing-source-webir" };
    }
    mkdirSync(cwlWebirDir, { recursive: true });
    copyFileSync(srcWebir, cwlWebirPath);
    const cwlRoutes = exportedRoutes;

    const emitScript = join(scriptRoot, "scripts/hub-ingest", edge.emit);
    const emitArgs = [emitScript, cwlHubDir, "--origin", "cwl"];
    if (edge.emitTarget) {
      emitArgs.push("--target", edge.emitTarget);
    }
    const emitR = spawnSync(process.execPath, emitArgs, { cwd: scriptRoot, encoding: "utf8" });
    let emitReport = {};
    try {
      emitReport = JSON.parse((emitR.stdout ?? "").trim().split("\n").pop() ?? "{}");
    } catch {
      emitReport = {};
    }
    const holeCount = emitReport.holeCount ?? null;
    const routeCount = emitReport.routeCount ?? emitReport.handlerCount ?? 0;
    const maxHoles = edge.maxHoleCount ?? 0;
    const holeOk = holeCount == null ? emitR.status === 0 : holeCount <= maxHoles;
    const routeOk = routeCount >= exportedRoutes;
    const ok = emitR.status === 0 && holeOk && routeOk;

    return {
      from: edge.from,
      to: edge.to,
      ok,
      exportedRoutes,
      cwlRoutes,
      emitRouteCount: routeCount,
      holeCount,
      emitTarget: edge.emitTarget ?? edge.to,
    };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/**
 * @param {object} charter
 */
export function composerCrossEdgeJobs(charter) {
  const targets = new Map((charter.cwlOutboundTargets ?? []).map((t) => [t.id, t]));
  return (charter.composerCrossEdges ?? []).map((e) => {
    const target = targets.get(e.to);
    if (!target) {
      return { from: e.from, to: e.to, emit: null, ok: false, skip: "unknown-target" };
    }
    return {
      from: e.from,
      to: e.to,
      emit: target.emit,
      emitTarget: target.emitTarget,
      maxHoleCount: charter.maxCrossEdgeHoleCount ?? 0,
      charter,
    };
  });
}
