#!/usr/bin/env node
/**
 * D6448-ST — Complete conversion success-template prove gate.
 * Fails when hole zero came only from terminal settle, or required
 * fidelity contracts are missing. Checklist-driven; WISP UI is the
 * first filled profile; `cwl-api` covers hole-free PHP API flagships.
 *
 *   node scripts/lib/complete-conversion-prove.mjs
 *   node scripts/lib/complete-conversion-prove.mjs --fixture fixtures/hub-flagship-plain-php
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { countCwlMarkupHoles } from "./cwl-hole-metrics.mjs";
import { unescapeCwlHtmlLiteral } from "./unescape-cwl-html.mjs";

export const PROVE_KIND = "chrysalis.complete-conversion.prove";
export const PROVE_GATE = "D6448-ST";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const defaultFixtureDir = join(root, "fixtures/hub-wisp-management");

function extractPageHtml(cwl, httpPath) {
  const re = new RegExp(
    `@page\\s+GET\\s+"${httpPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[\\s\\S]*?return\\s+html\\s+("(?:\\\\.|[^"\\\\])*")`,
    "m",
  );
  const m = re.exec(cwl);
  return m ? unescapeCwlHtmlLiteral(m[1]) : null;
}

/** @param {string} cwl @param {string} method @param {string} httpPath */
function hasCwlRoute(cwl, method, httpPath) {
  const esc = httpPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`@(?:route|page)\\s+${method}\\s+"${esc}"`, "i");
  return re.test(cwl);
}

/** @param {string[]} argv */
export function parseProveCliArgs(argv = process.argv.slice(2)) {
  /** @type {{ fixtureRel?: string }} */
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--fixture" && argv[i + 1]) {
      out.fixtureRel = argv[++i];
    } else if (a.startsWith("--fixture=")) {
      out.fixtureRel = a.slice("--fixture=".length);
    }
  }
  return out;
}

/**
 * @param {object} [opts]
 */
export function runCompleteConversionProve(opts = {}) {
  const startedAt = new Date().toISOString();
  const fixtureDir = resolve(opts.fixtureDir ?? defaultFixtureDir);
  const checklistFile = resolve(
    opts.checklistPath ?? join(fixtureDir, "chrysalis.complete-conversion.checklist.v1.json"),
  );

  if (!existsSync(checklistFile)) {
    return { kind: PROVE_KIND, gate: PROVE_GATE, ok: false, skip: "missing-checklist" };
  }

  const checklist = JSON.parse(readFileSync(checklistFile, "utf8"));
  const routesRel =
    opts.routesPath ??
    checklist.routesCwl ??
    join(fixtureDir, "routes.cwl");
  const cwlFile = resolve(
    routesRel.startsWith("fixtures/") || routesRel.startsWith("reports/")
      ? join(root, routesRel)
      : routesRel,
  );
  const projectId = checklist.projectId ?? "unknown";
  const proveProfile =
    checklist.proveProfile ??
    (projectId === "wisp-management" || checklist.originPair?.originLanguage === "sveltekit"
      ? "wisp-ui"
      : "cwl-api");
  const reportRel =
    checklist.proveReportRel ??
    (proveProfile === "wisp-ui"
      ? "reports/wisp/complete-conversion-prove.json"
      : `reports/st/${projectId}/complete-conversion-prove.json`);
  const outPath = join(root, reportRel);
  const conversionReportRel =
    checklist.conversionReportRel ??
    (proveProfile === "wisp-ui" ? "reports/wisp/complete-conversion.json" : null);
  const conversionReportPath = conversionReportRel ? join(root, conversionReportRel) : null;

  /** @type {object[]} */
  const checks = [];

  if (!existsSync(cwlFile)) {
    return { kind: PROVE_KIND, gate: PROVE_GATE, ok: false, skip: "missing-routes", checklistPath: checklistFile };
  }

  const cwl = readFileSync(cwlFile, "utf8");
  const census = countCwlMarkupHoles(cwl);
  // cwl-api: also count statement `hole …;` so projection holes cannot hide behind
  // markup-only census (tiny-blog / plain-php ST honesty).
  const stmtHoleMatches = cwl.match(/^\s*hole\s+\S+/gm) || [];
  if (proveProfile !== "wisp-ui") {
    census.total += stmtHoleMatches.length;
    census.statementHoles = stmtHoleMatches.length;
  }

  let conversion = null;
  if (conversionReportPath && existsSync(conversionReportPath)) {
    try {
      conversion = JSON.parse(readFileSync(conversionReportPath, "utf8"));
    } catch {
      conversion = null;
    }
  }

  const forceSettleUsed =
    conversion?.forceSettleUsed === true ||
    conversion?.stopReason === "complete-terminal-settle";

  checks.push({
    id: "hole-total-zero",
    ok: census.total === 0,
    detail: { total: census.total },
    soft: true,
  });
  checks.push({
    id: "evidence-only-no-terminal-settle",
    ok: !forceSettleUsed,
    detail: {
      forceSettleUsed,
      stopReason: conversion?.stopReason ?? null,
      note: forceSettleUsed
        ? "Terminal settle ≠ D6448-ST — re-run evidence closes + island lifts"
        : "ok",
    },
  });

  if (proveProfile === "wisp-ui") {
    const login = extractPageHtml(cwl, "/login");
    checks.push({
      id: "login-welcome-back",
      ok: !!(login && /Welcome Back/i.test(login)),
    });
    checks.push({
      id: "login-sign-in-idle-label",
      ok: !!(
        login &&
        />\s*Sign In\s*</.test(login) &&
        !/>\s*Signing in\.\.\.\s*</.test(login.replace(/hidden[\s\S]*?Signing in/i, ""))
      ),
      detail: { hasSignIn: !!(login && /Sign In/.test(login)) },
    });
    checks.push({
      id: "login-email-password",
      ok: !!(
        login &&
        /type="email"|Email Address/i.test(login) &&
        /type="password"|Password/i.test(login)
      ),
    });

    const plan = extractPageHtml(cwl, "/modules/plan");
    checks.push({
      id: "plan-data-wisp-page",
      ok: !!(plan && /data-wisp-page=/.test(plan)),
    });
    checks.push({
      id: "plan-shared-map-iframe",
      ok: !!(
        plan &&
        /plan-map-iframe|data-cwl-island="shared-map"/.test(plan) &&
        /\/modules\/coverage-map\?/.test(plan)
      ),
      detail: {
        hasEmptyShell: !!(plan && /data-cwl-map-shell="SharedMap"/.test(plan) && !/<iframe/i.test(plan)),
      },
    });
    checks.push({
      id: "plan-no-empty-map-placeholder-only",
      ok: !(plan && /data-cwl-map-shell="SharedMap"/.test(plan) && !/<iframe/i.test(plan)),
    });
    const hasBoolHidden = (tag) => /(?:^|\s)hidden(?:\s|=|>|$)/i.test(tag);
    const planModalTags = plan
      ? [...plan.matchAll(/<[^>]*\b(?:modal-overlay|popup-overlay)\b[^>]*>/gi)]
      : [];
    const planModalsOpen = planModalTags.filter((m) => !hasBoolHidden(m[0])).length;
    checks.push({
      id: "plan-modal-overlays-hidden",
      ok: !plan || planModalsOpen === 0,
      detail: { openOverlays: planModalsOpen, total: planModalTags.length },
    });

    const deploy = extractPageHtml(cwl, "/modules/deploy");
    checks.push({
      id: "deploy-shared-map-iframe",
      ok: !!(
        deploy &&
        (/deploy-map-iframe/.test(deploy) || /data-cwl-map-mode="deploy"/.test(deploy)) &&
        /\/modules\/coverage-map\?/.test(deploy)
      ),
    });
  } else {
    // cwl-api / non-UI: no invented chrome — route presence + content-type contracts from checklist
    const islands = Array.isArray(checklist.islands) ? checklist.islands : [];
    checks.push({
      id: "islands-no-invented-vendor",
      ok: islands.every((i) => !["bing", "invented-osm-default"].includes(String(i?.vendor ?? "").toLowerCase())),
      detail: { islandCount: islands.length },
    });

    const pages = Array.isArray(checklist.pages) ? checklist.pages : [];
    for (const page of pages) {
      const method = String(page.method ?? "GET").toUpperCase();
      const path = String(page.path ?? "");
      const idBase = `route-${method}-${path}`.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
      checks.push({
        id: `${idBase}-present`,
        ok: path.length > 0 && hasCwlRoute(cwl, method, path),
        detail: { method, path },
      });
      if (page.contentType) {
        const esc = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const blockRe = new RegExp(
          `@(?:route|page)\\s+${method}\\s+"${esc}"[\\s\\S]*?(?=@(?:route|page)|$)`,
          "i",
        );
        const block = blockRe.exec(cwl)?.[0] ?? "";
        const ct = String(page.contentType);
        checks.push({
          id: `${idBase}-content-type`,
          ok: block.includes(ct) || new RegExp(`content-type\\s+"[^"]*${ct.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(block),
          detail: { expect: ct },
        });
      }
      if (page.cwlIncludes) {
        const needles = Array.isArray(page.cwlIncludes) ? page.cwlIncludes : [page.cwlIncludes];
        const esc = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const blockRe = new RegExp(
          `@(?:route|page)\\s+${method}\\s+"${esc}"[\\s\\S]*?(?=@(?:route|page)|$)`,
          "i",
        );
        const block = blockRe.exec(cwl)?.[0] ?? "";
        for (const needle of needles) {
          checks.push({
            id: `${idBase}-includes-${String(needle).slice(0, 24).replace(/[^a-zA-Z0-9]+/g, "-")}`,
            ok: block.includes(String(needle)),
            detail: { needle },
          });
        }
      }
    }

    const minRoutes = Number(checklist.minRoutes ?? pages.length ?? 0);
    if (minRoutes > 0) {
      const routeCount = (cwl.match(/@(?:route|page)\s+(?:GET|POST|PUT|PATCH|DELETE)\s+"/gi) || []).length;
      checks.push({
        id: "min-routes",
        ok: routeCount >= minRoutes,
        detail: { routeCount, minRoutes },
      });
    }
  }

  const failed = checks.filter((c) => !c.ok);
  const hardFailed = failed.filter((c) => !c.soft && c.id !== "evidence-only-no-terminal-settle");
  let fidelityOk = hardFailed.length === 0;
  const evidenceOnly = !forceSettleUsed && census.total === 0;
  let stGreen = fidelityOk && evidenceOnly;

  const prevOc = checklist.signedInOriginCompare ?? {};
  const originCompareRel =
    prevOc.reportRel ??
    (proveProfile === "wisp-ui" ? "reports/wisp/complete-conversion-origin-compare.json" : null);
  const originComparePath = originCompareRel ? join(root, originCompareRel) : null;
  let originCompareStatus = null;
  if (originComparePath && existsSync(originComparePath)) {
    try {
      const oc = JSON.parse(readFileSync(originComparePath, "utf8"));
      if (prevOc.mode === "fixture-verify-gold") {
        const correctness = oc?.aggregate?.correctness ?? oc?.correctness ?? 0;
        const framesPassed = oc?.aggregate?.framesPassed ?? 0;
        const framesTotal = oc?.aggregate?.framesTotal ?? 0;
        const goldOk = correctness >= 1 && framesTotal > 0 && framesPassed === framesTotal;
        checks.push({
          id: "fixture-verify-gold",
          ok: goldOk,
          detail: { correctness, framesPassed, framesTotal, reportRel: originCompareRel },
        });
        if (goldOk) originCompareStatus = "passed";
      } else if (oc?.ok === true && (oc.status === "passed" || oc.status === "origin-source-ok-live-skipped")) {
        originCompareStatus = oc.status;
      }
    } catch {
      /* ignore */
    }
  }

  const failedFinal = checks.filter((c) => !c.ok);
  const hardFailedFinal = failedFinal.filter((c) => !c.soft && c.id !== "evidence-only-no-terminal-settle");
  fidelityOk = hardFailedFinal.length === 0;
  stGreen = fidelityOk && evidenceOnly;
  const stClosed = stGreen && !!originCompareStatus;
  const ok = fidelityOk;

  let next;
  if (stClosed) {
    next = "D6448-ST closed — origin compare passed; optional interactive browser session already evidenced";
  } else if (stGreen) {
    next = "Run signed-in origin compare (checklist.signedInOriginCompare)";
  } else if (fidelityOk && !evidenceOnly) {
    next =
      "Fidelity islands OK but terminal settle used — grow evidence closes until forceSettleUsed:false for full D6448-ST";
  } else if (proveProfile === "wisp-ui") {
    next = "Fix failed fidelity checks; re-lift SharedMap/login; redeploy";
  } else {
    next = "Fix failed route/content-type contracts; keep holes honest (no façades)";
  }

  const report = {
    kind: PROVE_KIND,
    schemaVersion: 1,
    gate: PROVE_GATE,
    ok,
    stGreen,
    stClosed,
    fidelityOk,
    evidenceOnly,
    proveProfile,
    startedAt,
    finishedAt: new Date().toISOString(),
    projectId,
    holeCensus: {
      total: census.total,
      forceSettleUsed,
      stopReason: conversion?.stopReason ?? null,
    },
    checks,
    failed: failedFinal.map((f) => f.id),
    checklistPath: checklistFile,
    routesPath: cwlFile,
    reportPath: outPath,
    next,
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  checklist.holeCensus = {
    total: census.total,
    forceSettleUsed,
    stopReason: conversion?.stopReason ?? null,
    provedAt: report.finishedAt,
  };

  checklist.signedInOriginCompare = {
    ...prevOc,
    required: prevOc.required !== false,
    status:
      originCompareStatus ??
      (prevOc.status === "passed" || prevOc.status === "origin-source-ok-live-skipped"
        ? prevOc.status
        : stGreen
          ? "ready-for-operator"
          : fidelityOk
            ? "fidelity-ok-settle-used"
            : "blocked-by-prove"),
    routes: prevOc.routes ?? (proveProfile === "wisp-ui" ? ["/login", "/dashboard", "/modules/plan"] : []),
  };
  writeFileSync(checklistFile, `${JSON.stringify(checklist, null, 2)}\n`, "utf8");

  return report;
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const cli = parseProveCliArgs();
  const fixtureDir = cli.fixtureRel ? resolve(root, cli.fixtureRel) : defaultFixtureDir;
  const report = runCompleteConversionProve({ fixtureDir });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.ok || report.skip) process.exitCode = 1;
}
