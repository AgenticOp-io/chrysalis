/**
 * Translation Hub batch runner — parallel site translation with per-site progress.
 */
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import {
  getProject,
  planSiteTranslation,
  siteProgressPath,
  updateProject,
  writeHubReport,
} from "./chrysalis-hub-store.mjs";
import { hubJobSteps, runJobSteps } from "./chrysalis-hub-runners.mjs";

export function defaultBatchConcurrency() {
  const n = Number(process.env.CHRYSALIS_HUB_MAX_PARALLEL ?? "3");
  return Number.isFinite(n) && n > 0 ? Math.min(16, Math.floor(n)) : 3;
}

/** Read ingest.progress JSON for one site workspace. */
export async function readSiteProgress(siteLocalDir) {
  const { readFile } = await import("node:fs/promises");
  const path = siteProgressPath(siteLocalDir);
  try {
    const raw = await readFile(path, "utf8");
    const j = JSON.parse(raw);
    const completed = Array.isArray(j.completedRouteKeys) ? j.completedRouteKeys : [];
    let totalRoutes = completed.length;
    try {
      const manifest = JSON.parse(await readFile(join(siteLocalDir, "chrysalis.routes.json"), "utf8"));
      if (Array.isArray(manifest.routes)) totalRoutes = manifest.routes.length;
    } catch {
      /* routes not yet written */
    }
    const pct = totalRoutes > 0 ? Math.min(100, Math.round((completed.length / totalRoutes) * 100)) : 0;
    return {
      ok: true,
      path,
      completedRouteKeys: completed,
      totalRoutes,
      completed: completed.length,
      completedCount: completed.length,
      pct,
      percent: pct,
      phase: j.phase ?? null,
    };
  } catch {
    return {
      ok: false,
      path,
      completedRouteKeys: [],
      totalRoutes: 0,
      completed: 0,
      completedCount: 0,
      pct: 0,
      percent: 0,
      phase: null,
    };
  }
}

function runStepsAsync(steps, repo, hooks) {
  return new Promise((resolve, reject) => {
    runJobSteps(steps, repo, {
      onStepStart: hooks.onStepStart,
      onLog: hooks.onLog,
      onDone: (code, err) => (code === 0 ? resolve() : reject(err ?? new Error(`steps failed (${code})`))),
    });
  });
}

/**
 * Run translation for one site workspace.
 */
export async function runSiteTranslation({ repo, cliBin, project, site, hooks }) {
  const plan = planSiteTranslation(project, site);
  await mkdir(join(site.localDir, ".chrysalis"), { recursive: true });
  await writeHubReport(site.localDir, { projectId: project.id, siteId: site.id, ...plan });

  if (plan.runnable.length === 0) {
    const msg = plan.errors[0]?.message ?? "No runnable route";
    hooks.onSiteState?.(site.id, "failed", { error: msg, plan });
    throw new Error(msg);
  }

  hooks.onSiteState?.(site.id, "running", { plan });

  await new Promise((resolveP, reject) => {
    const child = spawn(process.execPath, [cliBin, "init", site.localDir], { cwd: repo, env: process.env });
    child.on("close", (code) => (code === 0 ? resolveP() : resolveP()));
    child.on("error", () => resolveP());
  });

  const runnable = plan.runnable[0];
  const steps = hubJobSteps(repo, cliBin, site.localDir, runnable, siteProgressPath(site.localDir));

  await runStepsAsync(steps, repo, {
    onStepStart(step) {
      hooks.onLog?.(site.id, "stdout", `[${site.name}] step ${step.kind}`);
    },
    onLog(stream, line) {
      hooks.onLog?.(site.id, stream, line);
    },
  });

  hooks.onSiteState?.(site.id, "succeeded", { plan });
  return { siteId: site.id, plan };
}

/**
 * Run translation for many sites with bounded parallelism.
 */
export async function runProjectBatch({
  repo,
  cliBin,
  project,
  siteIds = null,
  concurrency = defaultBatchConcurrency(),
  hooks,
}) {
  const sites = (siteIds?.length ? project.sites.filter((s) => siteIds.includes(s.id)) : project.sites).filter(
    (s) => s.localDir,
  );
  if (sites.length === 0) throw new Error("no sites to run");

  const batchId = `batch-${Date.now()}`;
  hooks.onBatchStart?.(batchId, sites.map((s) => s.id));

  let index = 0;
  let failed = 0;

  async function worker() {
    while (index < sites.length) {
      const i = index++;
      const site = sites[i];
      try {
        await runSiteTranslation({ repo, cliBin, project, site, hooks });
        const freshOk = await getProject(project.id);
        if (freshOk) {
          await updateProject(project.id, {
            sites: freshOk.sites.map((s) =>
              s.id === site.id ? { ...s, jobState: "succeeded", lastRunAt: new Date().toISOString() } : s,
            ),
          });
        }
      } catch (e) {
        failed += 1;
        const msg = e instanceof Error ? e.message : String(e);
        hooks.onSiteState?.(site.id, "failed", { error: msg });
        const freshFail = await getProject(project.id);
        if (freshFail) {
          await updateProject(project.id, {
            sites: freshFail.sites.map((s) =>
              s.id === site.id ? { ...s, jobState: "failed", lastError: msg, lastRunAt: new Date().toISOString() } : s,
            ),
          });
        }
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, sites.length) }, () => worker());
  await Promise.all(workers);

  hooks.onBatchDone?.(batchId, { failed, total: sites.length, ok: failed === 0 });
  return { batchId, failed, total: sites.length };
}
