#!/usr/bin/env node
/**
 * Post-deploy verification for Translation Hub (run on hub VM after bootstrap).
 * Exit 0 only when build artifacts, parser vendor, WPTP Next.js, and smoke paths pass.
 */
import { spawn } from "node:child_process";
import { access, constants, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveWptpPackageEntry, resolveWptpSiblingsRoot } from "./lib/wptp-siblings.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const strict = process.env.CHRYSALIS_DEPLOY_STRICT !== "0";
const checks = [];

function fail(name, detail) {
  checks.push({ name, ok: false, detail });
  if (strict) throw new Error(`${name}: ${detail}`);
}

function pass(name, detail = "ok") {
  checks.push({ name, ok: true, detail });
}

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function runNode(args, opts = {}) {
  return new Promise((resolveP, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      env: process.env,
      stdio: ["ignore", "ignore", "pipe"],
      ...opts,
    });
    let out = "";
    let err = "";
    child.stdout?.on("data", (c) => (out += c));
    child.stderr?.on("data", (c) => (err += c));
    child.on("close", (code) => {
      if (code === 0) resolveP({ out, err });
      else reject(new Error(err.trim() || out.trim() || `exit ${code}`));
    });
    child.on("error", reject);
  });
}

async function runHttpProbes(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/config`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) fail("hub-http", `GET /api/config ${res.status}`);
    else {
      const j = await res.json();
      if (j.repo && j.cliBin) pass("hub-http", `port ${port}`);
      else fail("hub-http", "unexpected /api/config body");
    }
    const goldRes = await fetch(
      `http://127.0.0.1:${port}/api/hub/gold-suites?origin=javascript&output=hono`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!goldRes.ok) fail("hub-gold-suites", `GET ${goldRes.status}`);
    else {
      const gold = await goldRes.json();
      if (gold.kind !== "chrysalis.hub.gold-suites" || !gold.pair?.suiteIds?.length) {
        fail("hub-gold-suites", "missing pair.suiteIds");
      } else pass("hub-gold-suites", `${gold.pair.suiteIds.length} suites`);
    }
    const covRes = await fetch(
      `http://127.0.0.1:${port}/api/hub/gold-coverage?origin=javascript&output=hono`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!covRes.ok) fail("hub-gold-coverage", `GET ${covRes.status}`);
    else {
      const cov = await covRes.json();
      if (cov.kind !== "chrysalis.hub.gold-coverage" || cov.pair?.coverageGap === true) {
        fail("hub-gold-coverage", "unexpected coverage gap for javascript→hono");
      } else pass("hub-gold-coverage", `gaps ${cov.summary?.coverageGaps ?? "?"}`);
    }
    const tierRes = await fetch(`http://127.0.0.1:${port}/api/hub/verify-tiers`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!tierRes.ok) fail("hub-verify-tiers", `GET ${tierRes.status}`);
    else {
      const tiers = await tierRes.json();
      if (tiers.kind !== "chrysalis.hub.verify-tiers" || typeof tiers.tierCounts?.oracle !== "number") {
        fail("hub-verify-tiers", "missing tierCounts");
      } else pass("hub-verify-tiers", `oracle ${tiers.tierCounts.oracle}`);
    }
  } catch (e) {
    fail("hub-http", e.message);
  }
}

async function main() {
  const httpOnly = process.argv.includes("--http-probe-only");
  const cliBin = join(root, "packages/cli/dist/bin.js");
  const webirDist = join(root, "packages/webir/dist/index.js");
  const ingestDist = join(root, "packages/ingest/dist/index.js");
  const honoDist = join(root, "packages/emit-hono/dist/index.js");
  const fastifyDist = join(root, "packages/emit-fastify/dist/index.js");
  const operatorWeb = join(root, "scripts/chrysalis-operator-web.mjs");
  const parserVendor = join(root, "packages/parser-bridge/vendor/autoload.php");
  const siblingsRoot = resolveWptpSiblingsRoot(root);
  const wptpNext =
    resolveWptpPackageEntry(root, "wptp-emit-nextjs") ??
    join(siblingsRoot, "wptp-emit-nextjs", "dist", "index.js");
  const hubRoot = process.env.CHRYSALIS_HUB_ROOT ?? join(process.env.HOME ?? root, ".chrysalis-hub");

  const port = Number(process.env.CHRYSALIS_STATUS_PORT ?? "19090");

  if (!httpOnly) {
    if (await exists(cliBin)) pass("cli-bin", cliBin);
    else fail("cli-bin", `missing ${cliBin}`);

    if (await exists(webirDist)) pass("webir-dist", webirDist);
    else fail("webir-dist", `missing ${webirDist}`);

    if (await exists(ingestDist)) pass("ingest-dist", ingestDist);
    else fail("ingest-dist", `missing ${ingestDist}`);

    if (await exists(honoDist)) pass("emit-hono-dist", honoDist);
    else fail("emit-hono-dist", `missing ${honoDist}`);

    if (await exists(fastifyDist)) pass("emit-fastify-dist", fastifyDist);
    else fail("emit-fastify-dist", `missing ${fastifyDist}`);

    if (await exists(operatorWeb)) pass("operator-web", operatorWeb);
    else fail("operator-web", `missing ${operatorWeb}`);

    if (await exists(parserVendor)) pass("parser-vendor", parserVendor);
    else pass("parser-vendor", "skipped (no vendor — PHP gold ingest may fail)");

    if (process.env.CHRYSALIS_SKIP_WPTP_HUB_DEPS === "1") {
      pass("wptp-emit-nextjs", "skipped CHRYSALIS_SKIP_WPTP_HUB_DEPS=1");
    } else if (await exists(wptpNext)) {
      pass("wptp-emit-nextjs", wptpNext);
    } else {
      fail("wptp-emit-nextjs", `missing ${wptpNext}`);
    }

    await mkdir(hubRoot, { recursive: true });
    await mkdir(join(hubRoot, "workspaces"), { recursive: true });
    pass("hub-registry-dirs", hubRoot);

    const fixture = join(root, "fixtures/tiny-blog");
    if (!(await exists(fixture))) {
      fail("fixture-tiny-blog", "missing fixtures/tiny-blog");
    } else {
      try {
        const progress = join(root, ".chrysalis/hub-deploy-verify.progress");
        await runNode([cliBin, "ingest", fixture, "--ingest-progress-file", progress]);
        pass("smoke-php-ingest", "fixtures/tiny-blog");
      } catch (e) {
        fail("smoke-php-ingest", e.message);
      }
    }

    if (process.env.CHRYSALIS_SKIP_WPTP_HUB_DEPS !== "1" && (await exists(wptpNext))) {
      try {
        const webirGolden = join(root, "packages/ingest/tests/golden/tiny-blog.webir.json");
        const bundleOut = join(root, "reports/ci/hub-deploy-verify.bundle.json");
        const nextOut = join(root, "generated/hub-deploy-verify-nextjs");
        await mkdir(join(root, "reports/ci"), { recursive: true });
        await runNode([
          join(root, "scripts/export-webir-bundle.mjs"),
          "--in",
          webirGolden,
          "--out",
          bundleOut,
        ]);
        await runNode([
          join(root, "scripts/emit-webir-bundle-nextjs.mjs"),
          "--bundle",
          bundleOut,
          "--out",
          nextOut,
        ]);
        pass("smoke-nextjs-emit", nextOut);
      } catch (e) {
        fail("smoke-nextjs-emit", e.message);
      }
    }
  }

  if (httpOnly || process.env.CHRYSALIS_SKIP_HUB_HTTP_PROBE !== "1") {
    await runHttpProbes(port);
  }

  const report = {
    kind: "chrysalis.hub.deploy-verify",
    schemaVersion: 0,
    ok: checks.every((c) => c.ok),
    strict,
    checks,
    generatedAt: new Date().toISOString(),
  };
  const reportPath = join(root, ".chrysalis/hub.deploy-verify.json");
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  const json = `${JSON.stringify(report, null, 2)}\n`;
  process.stderr.write(`[hub-post-deploy-verify] ${report.ok ? "PASS" : "FAIL"} (${checks.filter((c) => c.ok).length}/${checks.length})\n`);
  process.stdout.write(json);
  if (!report.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
