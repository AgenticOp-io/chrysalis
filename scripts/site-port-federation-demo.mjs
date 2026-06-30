#!/usr/bin/env node
/** One-command Site-Port + VMF POC demo for operators and sponsors. */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { runSitePortToCwl } from "./site-port-to-cwl.mjs";
import {
  loadOpenLegacyIndex,
  publishFederationArtifacts,
  submitFederationShard,
  syncRegistryFromOpenLegacyIndex,
  resolveFederationPaths,
} from "./site-port-federation-lib.mjs";
import { runFederationBuildPocHub } from "./site-port-federation-build-poc-hub.mjs";

export const FEDERATION_DEMO_KIND = "chrysalis.site-port-federation.demo";

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
export async function runFederationDemo(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const skipBuild = opts.skipBuild === true || process.env.CHRYSALIS_POC_SKIP_BUILD === "1";
  const contributor = opts.contributor ?? process.env.CHRYSALIS_FEDERATION_CONTRIBUTOR ?? "poc-demo";

  if (!skipBuild) {
    const built = runBuildWebLlm();
    if (!built) return { ok: false, skip: "web-llm-build-failed" };
  }

  syncRegistryFromOpenLegacyIndex(repoRoot);
  const index = loadOpenLegacyIndex(repoRoot);
  /** @type {Array<{ id: string, portOk: boolean, submitOk: boolean }>} */
  const ports = [];

  for (const entry of index.entries ?? []) {
    const projectDir = join(repoRoot, entry.fixtureRel);
    if (!existsSync(projectDir)) {
      ports.push({ id: entry.id, portOk: false, submitOk: false, skip: "missing-fixture" });
      continue;
    }
    const port = await runSitePortToCwl({
      projectDir,
      repoRoot,
      origin: entry.origin,
      minRoutes: entry.minRoutes,
      verify: true,
      exportDataset: true,
    });
    const submit = port.ok
      ? await submitFederationShard({ repoRoot, projectDir, fixtureId: entry.id, contributor })
      : { ok: false, skip: "port-failed" };
    ports.push({
      id: entry.id,
      portOk: port.ok === true,
      submitOk: submit.ok === true,
      verifyCorrectness: port.verify?.correctness ?? null,
      routeCount: port.cwl?.routeCount ?? null,
    });
  }

  const published = await publishFederationArtifacts(repoRoot);
  const corpus = published.corpus;
  const league = published.league;
  const wvb = published.wvb;
  const bundle = published.bundle;
  const hub = await runFederationBuildPocHub({ repoRoot });
  let shorthandHub = null;
  try {
    const { runWebLlmBuildShorthandHub } = await import("./web-llm-build-shorthand-hub.mjs");
    shorthandHub = await runWebLlmBuildShorthandHub({ repoRoot });
  } catch {
    /* optional */
  }

  const portOk = ports.every((p) => p.portOk === true);
  const submitOk = ports.every((p) => p.submitOk === true);
  const ok =
    portOk &&
    submitOk &&
    published.ok === true &&
    hub.ok === true;

  const summary = {
    kind: FEDERATION_DEMO_KIND,
    schemaVersion: 1,
    ok,
    contributor,
    ports,
    corpus,
    league,
    wvb,
    bundle,
    shorthand: published.shorthand,
    shorthandHub,
    hub,
    hubPath: hub.indexPath,
    bundlePath: bundle.outPath ?? null,
    leaguePath: league.htmlPath ?? null,
    corpusPath: corpus.jsonlPath ?? null,
    wvbPath: wvb.outPath ?? null,
    generatedAt: new Date().toISOString(),
  };

  const paths = resolveFederationPaths(repoRoot);
  mkdirSync(join(paths.base, "poc"), { recursive: true });
  writeFileSync(join(paths.base, "poc", "last-demo.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  return summary;
}

async function main() {
  const summary = await runFederationDemo();
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exit(1);
  console.error("");
  console.error("VMF POC hub:", summary.hubPath);
  console.error("Verify League:", summary.leaguePath ?? "(see hub)");
  console.error("Open reports/federation/poc/index.html in a browser.");
}

if (process.argv[1]?.includes("site-port-federation-demo")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
