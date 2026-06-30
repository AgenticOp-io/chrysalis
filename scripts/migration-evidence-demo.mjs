#!/usr/bin/env node
/** One-command Migration Evidence POC — Site-Port + VMF + web-LLM agent programs. */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { runFederationDemo } from "./site-port-federation-demo.mjs";
import { runWebLlmDemo } from "./web-llm-demo.mjs";
import { runMigrationEvidenceBuildHub } from "./migration-evidence-build-hub.mjs";

export const MIGRATION_EVIDENCE_DEMO_KIND = "chrysalis.migration-evidence.demo";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function runBuildWebLlm() {
  const r = spawnSync("pnpm", ["--filter", "@chrysalis/web-llm", "build"], {
    cwd: scriptRoot,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  return (r.status ?? 1) === 0;
}

/**
 * @param {object} [opts]
 */
export async function runMigrationEvidenceDemo(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const skipBuild = opts.skipBuild === true || process.env.CHRYSALIS_POC_SKIP_BUILD === "1";
  const skipFederation = opts.skipFederation === true || process.env.CHRYSALIS_EVIDENCE_SKIP_FEDERATION === "1";
  const skipWebLlm = opts.skipWebLlm === true || process.env.CHRYSALIS_EVIDENCE_SKIP_WEB_LLM === "1";

  if (!skipBuild) {
    const built = runBuildWebLlm();
    if (!built) return { ok: false, skip: "web-llm-build-failed" };
  }

  const federation = skipFederation
    ? { ok: existsSync(join(repoRoot, "reports/federation/poc/index.html")), skip: "federation-skipped" }
    : await runFederationDemo({ repoRoot, skipBuild: true, contributor: opts.contributor ?? "evidence-demo" });

  const webLlm = skipWebLlm
    ? { ok: existsSync(join(repoRoot, "reports/web-llm/poc/index.html")), skip: "web-llm-skipped" }
    : await runWebLlmDemo({ repoRoot, skipBuild: true });

  const ok = federation.ok === true && webLlm.ok === true;

  const summary = {
    kind: MIGRATION_EVIDENCE_DEMO_KIND,
    schemaVersion: 1,
    ok: false,
    sitePort: { ok: federation.ok === true },
    vmf: { ok: federation.ok === true, submissionCount: federation.ports?.length ?? null },
    webLlm: {
      ok: webLlm.ok === true,
      passCount: webLlm.passCount ?? null,
      scenarioCount: webLlm.scenarioCount ?? null,
    },
    shorthand: {
      count: federation.shorthand?.count ?? null,
      compressionVs7BTotal: federation.shorthand?.summary?.compressionVs7BTotal ?? null,
      hubOk: federation.shorthandHub?.ok ?? null,
    },
    federation,
    webLlmDetail: webLlm,
    generatedAt: new Date().toISOString(),
  };
  summary.ok = ok;

  const outDir = join(repoRoot, "reports/migration-evidence/poc");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "last-demo.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  const hub = await runMigrationEvidenceBuildHub({ repoRoot, demoState: summary });
  summary.hub = hub;
  summary.hubPath = hub.indexPath;
  summary.ok = ok && hub.ok === true;
  writeFileSync(join(outDir, "last-demo.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  return summary;
}

async function main() {
  const summary = await runMigrationEvidenceDemo();
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exit(1);
  console.error("");
  console.error("Migration Evidence POC hub:", summary.hubPath);
  console.error("Open reports/migration-evidence/poc/index.html in a browser.");
}

if (process.argv[1]?.includes("migration-evidence-demo")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
