#!/usr/bin/env node
/**
 * PHP → Next.js verify (trace replay), not emit-only smoke (G105).
 */
import { copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliBin = join(scriptRoot, "packages/cli/dist/bin.js");
const tinyBlog = join(scriptRoot, "fixtures/tiny-blog");
const plainPhpFlagship = join(scriptRoot, "fixtures/hub-flagship-plain-php");
const symfonyFlagship = join(scriptRoot, "fixtures/hub-flagship-symfony");
const worker = join(scriptRoot, "scripts/hub-ingest/hub-gold-replay-worker.mjs");
const exportWebir = join(scriptRoot, "scripts/hub-ingest/export-project-webir.mjs");
const exportBundle = join(scriptRoot, "scripts/export-webir-bundle.mjs");
const emitNextjs = join(scriptRoot, "scripts/emit-webir-bundle-nextjs.mjs");

export const HUB_PHP_NEXTJS_VERIFY_KIND = "chrysalis.hub.php-nextjs-verify";
export const HUB_PHP_NEXTJS_VERIFY_SCHEMA_VERSION = 1;

function wptpAvailable() {
  const root = resolve(process.env.WPTP_EMIT_NEXTJS_ROOT ?? join(scriptRoot, "..", "wptp-emit-nextjs"));
  return existsSync(join(root, "package.json"));
}

function parseStdoutJson(stdout) {
  const text = stdout.trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return {};
  return JSON.parse(text.slice(start, end + 1));
}

/**
 * @param {string} [projectDir]
 * @param {{ label?: string }} [opts]
 */
export async function runPhpNextjsVerify(projectDir = tinyBlog, opts = {}) {
  const fixtureLabel =
    opts.label ??
    (projectDir === tinyBlog
      ? "fixtures/tiny-blog"
      : projectDir.includes("hub-flagship-plain-php")
        ? "fixtures/hub-flagship-plain-php"
        : projectDir.includes("hub-flagship-symfony")
          ? "fixtures/hub-flagship-symfony"
          : projectDir);
  const base = {
    kind: HUB_PHP_NEXTJS_VERIFY_KIND,
    schemaVersion: HUB_PHP_NEXTJS_VERIFY_SCHEMA_VERSION,
    fixture: fixtureLabel,
    wptpEmitNextjsAvailable: wptpAvailable(),
    correctness: null,
    ok: false,
  };

  if (!existsSync(cliBin) || !existsSync(projectDir)) {
    return { ...base, skip: "missing-cli-or-project" };
  }
  if (!wptpAvailable()) {
    return { ...base, skip: "no-wptp-emit-nextjs", ok: true };
  }

  const scope = `php-nextjs-verify/${fixtureLabel}`;
  const p = createSmokeProgress(scope);
  const progress = join(projectDir, ".chrysalis", "ingest.progress");

  p.start("ingest");
  const ingest = spawnSync(process.execPath, [cliBin, "ingest", projectDir, "--ingest-progress-file", progress], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  p.end("ingest", ingest.status === 0);
  if (ingest.status !== 0) {
    return { ...base, skip: "ingest-failed" };
  }

  const webirOut = join(projectDir, ".chrysalis", "ingested.webir.json");
  const bundleOut = join(projectDir, ".chrysalis", "ingested.webir.bundle.json");
  const out = join(projectDir, "generated", "nextjs");

  for (const [script, args, stepId] of [
    [exportWebir, [projectDir, "--out", webirOut], "export-webir"],
    [exportBundle, ["--in", webirOut, "--out", bundleOut], "export-bundle"],
    [emitNextjs, ["--bundle", bundleOut, "--out", out], "emit-nextjs"],
  ]) {
    p.start(stepId);
    const r = spawnSync(process.execPath, [script, ...args], {
      cwd: scriptRoot,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
    p.end(stepId, r.status === 0);
    if (r.status !== 0) {
      return { ...base, skip: `pipeline-failed:${script}` };
    }
  }

  const hubWebir = join(projectDir, ".chrysalis", "hub.php.webir.json");
  if (existsSync(webirOut)) {
    await copyFile(webirOut, hubWebir);
  }

  p.start("replay");
  const replay = spawnSync(
    process.execPath,
    ["--import", "tsx", worker, projectDir, "--origin", "php", "--target", "nextjs"],
    { cwd: scriptRoot,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    },
  );
  p.end("replay", replay.status === 0);
  if (replay.status !== 0) {
    return { ...base, skip: "replay-failed", stderr: replay.stderr?.slice(0, 500) };
  }

  const parsed = parseStdoutJson(replay.stdout);
  const correctness = parsed.correctness ?? parsed.report?.aggregate?.correctness ?? null;
  const ok = correctness !== null && correctness >= 1;
  return {
    ...base,
    ok,
    correctness,
    routeCount: parsed.routeCount ?? null,
    traceCount: parsed.traceCount ?? null,
    skip: ok ? null : "correctness-below-1",
  };
}

/** Plain PHP flagship WPTP Next.js verify (G178). */
export async function runPhpNextjsFlagshipVerify() {
  return runPhpNextjsVerify(plainPhpFlagship, { label: "fixtures/hub-flagship-plain-php" });
}

/** Symfony flagship WPTP Next.js verify (G181). */
export async function runPhpNextjsSymfonyFlagshipVerify() {
  return runPhpNextjsVerify(symfonyFlagship, { label: "fixtures/hub-flagship-symfony" });
}

async function main() {
  let projectDir = tinyBlog;
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === "--project" && process.argv[i + 1]) {
      projectDir = resolve(process.argv[++i]);
    } else if (process.argv[i] === "--flagship") {
      projectDir = plainPhpFlagship;
    } else if (process.argv[i] === "--symfony") {
      projectDir = symfonyFlagship;
    }
  }
  const report = await runPhpNextjsVerify(projectDir);
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && report.skip !== "no-wptp-emit-nextjs") process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
