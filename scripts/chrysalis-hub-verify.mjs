/**
 * Translation Hub — oracle verify per site (portal-driven).
 */
import { spawn } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { join } from "node:path";
import { getProject, updateProject } from "./chrysalis-hub-store.mjs";

export function defaultTracesDir(siteLocalDir) {
  return join(siteLocalDir, ".chrysalis", "traces");
}

export function defaultVerifyReportDir(siteLocalDir) {
  return join(siteLocalDir, "reports", "verify");
}

export async function readVerifySummary(siteLocalDir) {
  try {
    const raw = await readFile(join(defaultVerifyReportDir(siteLocalDir), "summary.json"), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function pathExists(p) {
  try {
    await access(p, fsConstants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function runCliVerify(repo, cliBin, argv) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliBin, ...argv], {
      cwd: repo,
      env: { ...process.env, NO_COLOR: "1" },
    });
    const out = [];
    const err = [];
    child.stdout?.on("data", (c) => out.push(c));
    child.stderr?.on("data", (c) => err.push(c));
    child.on("close", (code) => {
      resolve({
        code: code ?? 1,
        stdout: Buffer.concat(out).toString("utf8"),
        stderr: Buffer.concat(err).toString("utf8"),
      });
    });
    child.on("error", reject);
  });
}

/**
 * Run chrysalis verify for one site workspace.
 */
export async function runSiteVerify(
  { repo, cliBin, projectId, siteId, tracesDir, baseUrl, threshold = 0.9, projectRoot = null },
  hooks = {},
) {
  const project = await getProject(projectId);
  if (!project) throw new Error("project not found");
  const site = project.sites.find((s) => s.id === siteId);
  if (!site) throw new Error("site not found");

  const traces = tracesDir ?? defaultTracesDir(site.localDir);
  if (!(await pathExists(traces))) {
    throw new Error(`traces directory not found: ${traces}. Copy oracle NDJSON traces there or set tracesDir.`);
  }
  if (!baseUrl?.trim()) {
    throw new Error("baseUrl is required (URL of the emitted app under test, e.g. http://127.0.0.1:8787)");
  }

  const reportDir = defaultVerifyReportDir(site.localDir);
  await mkdir(reportDir, { recursive: true });
  const phpRoot = projectRoot ?? site.localDir;

  await patchSiteVerify(projectId, siteId, {
    verifyState: "running",
    verifyStartedAt: new Date().toISOString(),
    verifyTracesDir: traces,
    verifyBaseUrl: baseUrl.trim(),
  });

  hooks.onLog?.(siteId, "stdout", `[${site.name}] verify traces=${traces} base=${baseUrl}`);

  const argv = [
    "verify",
    traces,
    "--base-url",
    baseUrl.trim(),
    "--report",
    reportDir,
    "--project",
    phpRoot,
    "--threshold",
    String(threshold),
    "--json-summary",
    "--disable-cookie-chain",
  ];

  const r = await runCliVerify(repo, cliBin, argv);
  for (const line of r.stdout.split(/\r?\n/)) {
    if (line.trim()) hooks.onLog?.(siteId, "stdout", line);
  }
  for (const line of r.stderr.split(/\r?\n/)) {
    if (line.trim()) hooks.onLog?.(siteId, "stderr", line);
  }

  const summary = await readVerifySummary(site.localDir);
  const correctness = summary?.aggregate?.correctness ?? null;
  const passed = r.code === 0 && (correctness == null || correctness >= threshold);

  await patchSiteVerify(projectId, siteId, {
    verifyState: passed ? "passed" : "failed",
    verifyEndedAt: new Date().toISOString(),
    verifyExitCode: r.code,
    verifyCorrectness: correctness,
    verifyReportDir: reportDir,
    verifySummary: summary,
    lastError: passed ? null : r.stderr.trim() || `verify exit ${r.code}`,
  });

  hooks.onSiteVerify?.(siteId, { passed, correctness, exitCode: r.code, summary });
  if (!passed) throw new Error(r.stderr.trim() || `verify failed (exit ${r.code})`);
  return { passed, correctness, summary, reportDir };
}

async function patchSiteVerify(projectId, siteId, patch) {
  const project = await getProject(projectId);
  if (!project) return;
  await updateProject(projectId, {
    sites: project.sites.map((s) => (s.id === siteId ? { ...s, ...patch } : s)),
  });
}

export async function runProjectVerify(
  projectId,
  { repo, cliBin, siteIds = null, tracesDir, baseUrl, threshold },
  hooks = {},
) {
  const project = await getProject(projectId);
  if (!project) throw new Error("project not found");
  const targets = (siteIds?.length ? project.sites.filter((s) => siteIds.includes(s.id)) : project.sites).filter(
    (s) => s.localDir,
  );
  let failed = 0;
  for (const site of targets) {
    try {
      await runSiteVerify(
        { repo, cliBin, projectId, siteId: site.id, tracesDir, baseUrl, threshold, projectRoot: site.localDir },
        hooks,
      );
    } catch {
      failed += 1;
    }
  }
  return { failed, total: targets.length, ok: failed === 0 };
}
