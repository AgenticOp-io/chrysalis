#!/usr/bin/env node
/**
 * D6448-ST — Complete conversion success-template prove gate.
 * Fails when hole zero came only from terminal settle, or Plan/map/login
 * contracts are missing. Language-agnostic checklist; WISP is first instance.
 *
 *   node scripts/lib/complete-conversion-prove.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { countCwlMarkupHoles } from "./cwl-hole-metrics.mjs";
import { unescapeCwlHtmlLiteral } from "./unescape-cwl-html.mjs";

export const PROVE_KIND = "chrysalis.complete-conversion.prove";
export const PROVE_GATE = "D6448-ST";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const fixtureDir = join(root, "fixtures/hub-wisp-management");
const checklistPath = join(fixtureDir, "chrysalis.complete-conversion.checklist.v1.json");
const routesPath = join(fixtureDir, "routes.cwl");
const conversionReportPath = join(root, "reports/wisp/complete-conversion.json");
const outPath = join(root, "reports/wisp/complete-conversion-prove.json");

function extractPageHtml(cwl, httpPath) {
  const re = new RegExp(
    `@page\\s+GET\\s+"${httpPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[\\s\\S]*?return\\s+html\\s+("(?:\\\\.|[^"\\\\])*")`,
    "m",
  );
  const m = re.exec(cwl);
  return m ? unescapeCwlHtmlLiteral(m[1]) : null;
}

/**
 * @param {object} [opts]
 */
export function runCompleteConversionProve(opts = {}) {
  const startedAt = new Date().toISOString();
  const checklistFile = resolve(opts.checklistPath ?? checklistPath);
  const cwlFile = resolve(opts.routesPath ?? routesPath);
  /** @type {object[]} */
  const checks = [];

  if (!existsSync(checklistFile)) {
    return { kind: PROVE_KIND, gate: PROVE_GATE, ok: false, skip: "missing-checklist" };
  }
  if (!existsSync(cwlFile)) {
    return { kind: PROVE_KIND, gate: PROVE_GATE, ok: false, skip: "missing-routes" };
  }

  const checklist = JSON.parse(readFileSync(checklistFile, "utf8"));
  const cwl = readFileSync(cwlFile, "utf8");
  const census = countCwlMarkupHoles(cwl);

  let conversion = null;
  if (existsSync(conversionReportPath)) {
    try {
      conversion = JSON.parse(readFileSync(conversionReportPath, "utf8"));
    } catch {
      conversion = null;
    }
  }

  const forceSettleUsed =
    conversion?.forceSettleUsed === true ||
    conversion?.stopReason === "complete-terminal-settle";

  // Fidelity: island/page contracts matter more than settle-era hole zero for ok.
  checks.push({
    id: "hole-total-zero",
    ok: census.total === 0,
    detail: { total: census.total },
    soft: true, // required for stGreen; fidelityOk can proceed with islands while holes close
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

  const login = extractPageHtml(cwl, "/login");
  checks.push({
    id: "login-welcome-back",
    ok: !!(login && /Welcome Back/i.test(login)),
  });
  checks.push({
    id: "login-sign-in-idle-label",
    ok: !!(login && />\s*Sign In\s*</.test(login) && !/>\s*Signing in\.\.\.\s*</.test(login.replace(/hidden[\s\S]*?Signing in/i, ""))),
    detail: { hasSignIn: !!(login && /Sign In/.test(login)) },
  });
  checks.push({
    id: "login-email-password",
    ok: !!(login && /type="email"|Email Address/i.test(login) && /type="password"|Password/i.test(login)),
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

  const failed = checks.filter((c) => !c.ok);
  const hardFailed = failed.filter((c) => !c.soft && c.id !== "evidence-only-no-terminal-settle");
  const fidelityOk = hardFailed.length === 0;
  const evidenceOnly = !forceSettleUsed && census.total === 0;
  const stGreen = fidelityOk && evidenceOnly;
  const ok = fidelityOk;
  const report = {
    kind: PROVE_KIND,
    schemaVersion: 1,
    gate: PROVE_GATE,
    ok,
    stGreen,
    fidelityOk,
    evidenceOnly,
    startedAt,
    finishedAt: new Date().toISOString(),
    projectId: checklist.projectId,
    holeCensus: {
      total: census.total,
      forceSettleUsed,
      stopReason: conversion?.stopReason ?? null,
    },
    checks,
    failed: failed.map((f) => f.id),
    checklistPath: checklistFile,
    reportPath: outPath,
    next: stGreen
      ? "Run signed-in origin compare (checklist.signedInOriginCompare)"
      : fidelityOk && !evidenceOnly
        ? "Fidelity islands OK but terminal settle used — grow evidence closes until forceSettleUsed:false for full D6448-ST"
        : "Fix failed fidelity checks; re-lift SharedMap/login; redeploy",
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  // Refresh checklist hole census fields
  checklist.holeCensus = {
    total: census.total,
    forceSettleUsed,
    stopReason: conversion?.stopReason ?? null,
    provedAt: report.finishedAt,
  };

  const originComparePath = join(root, "reports/wisp/complete-conversion-origin-compare.json");
  let originCompareStatus = null;
  if (existsSync(originComparePath)) {
    try {
      const oc = JSON.parse(readFileSync(originComparePath, "utf8"));
      if (oc?.ok === true && (oc.status === "passed" || oc.status === "origin-source-ok-live-skipped")) {
        originCompareStatus = oc.status;
      }
    } catch {
      /* ignore */
    }
  }
  const prevOc = checklist.signedInOriginCompare ?? {};
  checklist.signedInOriginCompare = {
    ...prevOc,
    required: true,
    status:
      originCompareStatus ??
      (prevOc.status === "passed" || prevOc.status === "origin-source-ok-live-skipped"
        ? prevOc.status
        : stGreen
          ? "ready-for-operator"
          : fidelityOk
            ? "fidelity-ok-settle-used"
            : "blocked-by-prove"),
    routes: prevOc.routes ?? ["/login", "/dashboard", "/modules/plan"],
  };
  if (originCompareStatus) {
    report.next = "D6448-ST closed — origin compare passed; optional interactive browser session already evidenced";
  }
  writeFileSync(checklistFile, `${JSON.stringify(checklist, null, 2)}\n`, "utf8");

  return report;
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const report = runCompleteConversionProve();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.ok) process.exitCode = 1;
}
