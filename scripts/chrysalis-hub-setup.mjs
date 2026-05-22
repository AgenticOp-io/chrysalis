/**
 * Background site setup for Translation Hub (prep SSH origin, pull code, detect languages).
 */
import {
  getProject,
  prepProjectSite,
  pullFromSsh,
  scanLocalDirectory,
  scanSshRemote,
  updateProject,
  originFromDetection,
} from "./chrysalis-hub-store.mjs";

export async function runSiteSetup(projectId, siteId, opts = {}, hooks = {}) {
  const project = await getProject(projectId);
  if (!project) throw new Error("project not found");
  const site = project.sites.find((s) => s.id === siteId);
  if (!site) throw new Error("site not found");
  if (!site.ssh?.host || !site.ssh?.user) {
    hooks.onLog?.(siteId, "stdout", `[${site.name}] skip setup (no SSH)`);
    return { siteId, skipped: true };
  }

  const prep = opts.prep !== false;
  const pull = opts.pull !== false;
  const detect = opts.detect === true;

  hooks.onSiteState?.(siteId, "running", { phase: "setup" });
  await patchSite(projectId, siteId, { jobState: "running", setupPhase: "starting" });

  try {
    if (prep) {
      hooks.onLog?.(siteId, "stdout", `[${site.name}] preparing origin (SSH)…`);
      await patchSite(projectId, siteId, { setupPhase: "prep" });
      await prepProjectSite(projectId, siteId);
      hooks.onLog?.(siteId, "stdout", `[${site.name}] origin prep done`);
    }
    if (pull) {
      hooks.onLog?.(siteId, "stdout", `[${site.name}] pulling code to hub…`);
      await patchSite(projectId, siteId, { setupPhase: "pull" });
      await pullFromSsh(site.ssh, site.localDir);
      hooks.onLog?.(siteId, "stdout", `[${site.name}] pull done`);
    }
    if (detect) {
      hooks.onLog?.(siteId, "stdout", `[${site.name}] detecting languages…`);
      await patchSite(projectId, siteId, { setupPhase: "detect" });
      const fresh = await getProject(projectId);
      const s = fresh?.sites.find((x) => x.id === siteId);
      let detection = null;
      if (s?.localDir && pull) {
        detection = await scanLocalDirectory(s.localDir);
      } else {
        detection = await scanSshRemote(site.ssh);
      }
      const originLanguage = originFromDetection(detection);
      await patchSite(projectId, siteId, { detection, originLanguage, setupPhase: "detect-done" });
      hooks.onLog?.(siteId, "stdout", `[${site.name}] detect: ${originLanguage}`);
    }
    await patchSite(projectId, siteId, {
      jobState: "ready",
      setupPhase: null,
      lastSetupAt: new Date().toISOString(),
      lastError: null,
    });
    hooks.onSiteState?.(siteId, "ready", {});
    return { siteId, ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await patchSite(projectId, siteId, { jobState: "setup-failed", lastError: msg, setupPhase: null });
    hooks.onSiteState?.(siteId, "setup-failed", { error: msg });
    hooks.onLog?.(siteId, "stderr", `[${site.name}] setup failed: ${msg}`);
    throw e;
  }
}

async function patchSite(projectId, siteId, patch) {
  const project = await getProject(projectId);
  if (!project) return;
  await updateProject(projectId, {
    sites: project.sites.map((s) => (s.id === siteId ? { ...s, ...patch } : s)),
  });
}

export async function runProjectSetup(projectId, { siteIds = null, prep = true, pull = true, detect = false } = {}, hooks = {}) {
  const project = await getProject(projectId);
  if (!project) throw new Error("project not found");
  const targets = (siteIds?.length ? project.sites.filter((s) => siteIds.includes(s.id)) : project.sites).filter(
    (s) => s.ssh?.host && s.ssh?.user,
  );
  if (targets.length === 0) throw new Error("no SSH sites to set up");

  const maxParallel = Number(process.env.CHRYSALIS_HUB_SETUP_PARALLEL ?? "2");
  const concurrency = Number.isFinite(maxParallel) && maxParallel > 0 ? Math.min(8, Math.floor(maxParallel)) : 2;
  let index = 0;
  let failed = 0;

  hooks.onSetupStart?.(targets.map((s) => s.id));

  async function worker() {
    while (index < targets.length) {
      const i = index++;
      const site = targets[i];
      try {
        await runSiteSetup(projectId, site.id, { prep, pull, detect }, hooks);
      } catch {
        failed += 1;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, () => worker()));
  hooks.onSetupDone?.({ failed, total: targets.length, ok: failed === 0 });
  return { failed, total: targets.length, ok: failed === 0 };
}
