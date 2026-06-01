/**
 * Read and validate CWL full-stack hole budget manifest (G1157).
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

export const CWL_FULLSTACK_HOLE_BUDGET_KIND = "chrysalis.cwl.fullstack-hole-budget";

/**
 * @param {string} fixtureDir
 */
export async function readFullstackHoleBudget(fixtureDir) {
  const root = resolve(fixtureDir);
  const path = join(root, "chrysalis.fullstack-hole-budget.json");
  if (!existsSync(path)) {
    return { ok: false, reason: "missing-budget", path };
  }
  const raw = JSON.parse(await readFile(path, "utf8"));
  if (raw.kind !== CWL_FULLSTACK_HOLE_BUDGET_KIND) {
    return { ok: false, reason: "wrong-kind", path };
  }
  return { ok: true, path, budget: raw };
}

/**
 * @param {object} budget
 * @param {{ holeCount: number, routeCount: number, pageCount?: number, apiCount?: number, pageLoadCount?: number }} stats
 */
export function checkFullstackHoleBudget(budget, stats) {
  const violations = [];
  if (typeof budget.maxHoles === "number" && stats.holeCount > budget.maxHoles) {
    violations.push(`holes ${stats.holeCount} > max ${budget.maxHoles}`);
  }
  if (typeof budget.minRoutes === "number" && stats.routeCount < budget.minRoutes) {
    violations.push(`routes ${stats.routeCount} < min ${budget.minRoutes}`);
  }
  if (typeof budget.minPageRoutes === "number" && (stats.pageCount ?? 0) < budget.minPageRoutes) {
    violations.push(`page routes ${stats.pageCount ?? 0} < min ${budget.minPageRoutes}`);
  }
  if (typeof budget.minApiRoutes === "number" && (stats.apiCount ?? 0) < budget.minApiRoutes) {
    violations.push(`api routes ${stats.apiCount ?? 0} < min ${budget.minApiRoutes}`);
  }
  if (typeof budget.minPageLoadRoutes === "number" && (stats.pageLoadCount ?? 0) < budget.minPageLoadRoutes) {
    violations.push(`page-load routes ${stats.pageLoadCount ?? 0} < min ${budget.minPageLoadRoutes}`);
  }
  return { ok: violations.length === 0, violations };
}
