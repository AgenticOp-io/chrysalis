#!/usr/bin/env node
/**
 * D6448-ST — Signed-in origin compare (converted host vs origin source + live markers).
 *
 * Origin (SvelteKit) is often an SPA shell over HTTP — compare against Module_Manager
 * source contracts, then prove the converted host serves the same ST markers live.
 *
 *   node scripts/lib/complete-conversion-origin-compare.mjs
 *   node scripts/lib/complete-conversion-origin-compare.mjs --skip-live
 *   node scripts/lib/complete-conversion-origin-compare.mjs --require-live
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ORIGIN_COMPARE_KIND = "chrysalis.complete-conversion.origin-compare";
export const ORIGIN_COMPARE_SCHEMA_VERSION = 1;

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const fixtureDir = join(root, "fixtures/hub-wisp-management");
const checklistPath = join(fixtureDir, "chrysalis.complete-conversion.checklist.v1.json");
const reportPath = join(root, "reports/wisp/complete-conversion-origin-compare.json");

/** @type {{ path: string, originRel: string, contracts: { id: string, re: RegExp, originRe?: RegExp }[] }[]} */
const ROUTE_CONTRACTS = [
  {
    path: "/login",
    originRel: "src/routes/login/+page.svelte",
    contracts: [
      { id: "welcome-back", re: /Welcome Back/i, originRe: /Welcome Back/i },
      { id: "sign-in-label", re: /Sign In/i, originRe: /Sign In/i },
      { id: "email-field", re: /type=["']email["']|Email Address/i, originRe: /type=["']email["']|Email/i },
      { id: "password-field", re: /type=["']password["']|Password/i, originRe: /type=["']password["']|Password/i },
    ],
  },
  {
    path: "/dashboard",
    originRel: "src/routes/dashboard/+page.svelte",
    contracts: [
      { id: "data-wisp-page", re: /data-wisp-page=/ },
      { id: "module-surface", re: /module|customers|inventory/i, originRe: /module|customers|inventory/i },
    ],
  },
  {
    path: "/modules/plan",
    originRel: "src/routes/modules/plan/+page.svelte",
    contracts: [
      { id: "data-wisp-page", re: /data-wisp-page=/ },
      {
        id: "shared-map-coverage",
        re: /\/modules\/coverage-map|plan-map-iframe|data-cwl-island=["']shared-map["']/,
        originRe: /SharedMap|coverage-map/,
      },
      { id: "no-empty-map-shell-only", re: /./ }, // special-cased below
    ],
  },
];

function parseArgs(argv) {
  /** @type {Record<string, unknown>} */
  const o = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--skip-live") o.skipLive = true;
    else if (a === "--require-live") o.requireLive = true;
    else if (a === "--converted-host" && argv[i + 1]) o.convertedHost = argv[++i];
    else if (a === "--origin-root" && argv[i + 1]) o.originRoot = argv[++i];
    else if (a === "--checklist" && argv[i + 1]) o.checklistPath = argv[++i];
  }
  return o;
}

/**
 * @param {string} url
 */
async function fetchText(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25000);
  try {
    const r = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "user-agent": "chrysalis-d6448-st-origin-compare/1" },
    });
    const text = await r.text();
    return { ok: r.ok, status: r.status, text, url: r.url };
  } finally {
    clearTimeout(t);
  }
}

/**
 * @param {object} [opts]
 */
export async function runCompleteConversionOriginCompare(opts = {}) {
  const startedAt = new Date().toISOString();
  const checklistFile = resolve(opts.checklistPath ?? checklistPath);
  if (!existsSync(checklistFile)) {
    return { kind: ORIGIN_COMPARE_KIND, ok: false, skip: "missing-checklist" };
  }
  const checklist = JSON.parse(readFileSync(checklistFile, "utf8"));
  const convertedHost = String(
    opts.convertedHost ?? checklist.convertedHost ?? "https://management.wisptools.io",
  ).replace(/\/$/, "");
  const originAuthority = String(checklist.originAuthority ?? "https://wisptools.io").replace(
    /\/$/,
    "",
  );
  const originRoot = resolve(
    opts.originRoot ??
      process.env.CHRYSALIS_WISP_ROOT ??
      process.env.WISP_MODULE_DIR ??
      "C:/Users/david/AgenticOps/products/wisptools/Module_Manager",
  );
  const skipLive =
    opts.skipLive === true ||
    (process.env.CHRYSALIS_SKIP_ORIGIN_COMPARE_LIVE === "1" && opts.requireLive !== true);
  const requireLive = opts.requireLive === true;

  /** @type {object[]} */
  const originChecks = [];
  /** @type {object[]} */
  const liveChecks = [];

  for (const route of ROUTE_CONTRACTS) {
    const srcPath = join(originRoot, route.originRel);
    const srcOk = existsSync(srcPath);
    const src = srcOk ? readFileSync(srcPath, "utf8") : "";
    for (const c of route.contracts) {
      if (c.id === "no-empty-map-shell-only") continue;
      if (c.id === "data-wisp-page") {
        // Origin Svelte does not use data-wisp-page — converted-only contract.
        continue;
      }
      const re = c.originRe ?? c.re;
      originChecks.push({
        id: `origin:${route.path}:${c.id}`,
        ok: srcOk && re.test(src),
        detail: { srcPath, srcOk },
      });
    }
  }

  if (!skipLive) {
    for (const route of ROUTE_CONTRACTS) {
      const url = `${convertedHost}${route.path}`;
      let fetched;
      try {
        fetched = await fetchText(url);
      } catch (e) {
        liveChecks.push({
          id: `live:${route.path}:fetch`,
          ok: false,
          detail: { url, error: String(e?.message ?? e) },
        });
        continue;
      }
      liveChecks.push({
        id: `live:${route.path}:http`,
        ok: fetched.ok && fetched.status === 200,
        detail: { url, status: fetched.status, len: fetched.text.length },
      });
      for (const c of route.contracts) {
        if (c.id === "no-empty-map-shell-only") {
          const emptyOnly =
            /data-cwl-map-shell=["']SharedMap["']/.test(fetched.text) &&
            !/<iframe/i.test(fetched.text);
          liveChecks.push({
            id: `live:${route.path}:${c.id}`,
            ok: !emptyOnly,
            detail: { emptyOnly },
          });
          continue;
        }
        liveChecks.push({
          id: `live:${route.path}:${c.id}`,
          ok: c.re.test(fetched.text),
        });
      }
    }

    // Origin live SPA shell — soft check that host responds (SSR may be empty).
    try {
      const originLive = await fetchText(`${originAuthority}/login`);
      liveChecks.push({
        id: "live:origin-authority:http",
        ok: originLive.status === 200,
        soft: true,
        detail: {
          status: originLive.status,
          len: originLive.text.length,
          note: "Origin is SPA shell; contract truth is Module_Manager source",
        },
      });
    } catch (e) {
      liveChecks.push({
        id: "live:origin-authority:http",
        ok: false,
        soft: true,
        detail: { error: String(e?.message ?? e) },
      });
    }
  }

  const hardOrigin = originChecks.filter((c) => !c.ok);
  const hardLive = liveChecks.filter((c) => !c.ok && !c.soft);
  const liveSkipped = skipLive;
  const liveOk = liveSkipped ? !requireLive : hardLive.length === 0;
  const ok = hardOrigin.length === 0 && liveOk;

  const status = ok
    ? liveSkipped
      ? "origin-source-ok-live-skipped"
      : "passed"
    : hardOrigin.length
      ? "blocked-origin-source"
      : "blocked-converted-live";

  const report = {
    kind: ORIGIN_COMPARE_KIND,
    schemaVersion: ORIGIN_COMPARE_SCHEMA_VERSION,
    gate: "D6448-ST",
    ok,
    status,
    startedAt,
    finishedAt: new Date().toISOString(),
    projectId: checklist.projectId,
    convertedHost,
    originAuthority,
    originRoot,
    skipLive: liveSkipped,
    requireLive,
    originChecks,
    liveChecks,
    failed: [...hardOrigin, ...hardLive].map((c) => c.id),
    reportPath,
    note: ok
      ? "Converted live markers match origin source contracts for checklist routes"
      : "Fix failed origin source or converted-host live markers before claiming signed-in ST close",
  };

  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  checklist.signedInOriginCompare = {
    ...checklist.signedInOriginCompare,
    required: true,
    status,
    routes: ROUTE_CONTRACTS.map((r) => r.path),
    comparedAt: report.finishedAt,
    reportRel: "reports/wisp/complete-conversion-origin-compare.json",
  };
  writeFileSync(checklistFile, `${JSON.stringify(checklist, null, 2)}\n`, "utf8");

  return report;
}

async function main() {
  const args = parseArgs(process.argv);
  const r = await runCompleteConversionOriginCompare(args);
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exitCode = 1;
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
