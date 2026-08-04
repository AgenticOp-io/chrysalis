#!/usr/bin/env node
/**
 * COBOL best-fit + pattern-lift depth prove.
 * - Lane: hub-pattern-lift
 * - PROCEDURE paragraph routes (structured multi-paragraph)
 * - Honest holes for CALL/ACCEPT/DISPLAY
 * - Gold verify → java/csharp/python/go (+ hono)
 * - Hono trace-replay on structured + middleware
 *
 * Gate: hub:cobol-best-fit-smoke
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runGoldVerifySuite } from "./hub-gold-verify.mjs";
import { resolveGoldSuites } from "./hub-gold-manifest.mjs";
import { ingestLaneForOrigin } from "./hub-translation-paths.mjs";
import {
  parseCobolRoutes,
  cobolBodyAfter,
  cobolUnresolvedOps,
  inventoryCobolSource,
  resolveCobolCopybooks,
  buildCobolWebIrHoleAttrs,
  expandCobolCopybooks,
  inferCobolCopybookDirs,
  inventoryBmsSource,
  inventoryCsdSource,
  inventoryDclgenSource,
  crosswalkOnlineBmsMaps,
  crosswalkOnlineCicsPrograms,
  crosswalkCsdPrograms,
  crosswalkCsdMapsets,
  parseJclExecPrograms,
  crosswalkJclPrograms,
  parseJclDdNames,
  crosswalkJclDdAssign,
} from "./cobol-pattern-lift.mjs";
import { buildCobolResidualLedger } from "./cobol-residual-ledger.mjs";
import { emitFromCobolPatterns, detectEmitPattern, expectedFromPattern } from "./cobol-pattern-emit.mjs";
import { liftPatternRoutesFile } from "./pattern-route-lift.mjs";
import { loadWebir } from "./shared.mjs";
import { runTraceReplaySuite } from "./hub-gold-trace-replay.mjs";
import { detectOriginAdapter } from "../lib/site-inventory/index.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const LIFT = join(ROOT, "scripts/hub-ingest/lift-to-webir.mjs");

/** Best commercial depth targets for COBOL lift → WebIR → native emit. */
const BEST_FIT_TARGETS = ["java", "csharp", "python", "go"];
/** Web control emit (not a mainframe replacement target). */
const CONTROL_TARGETS = ["hono"];

const STRUCTURED = join(ROOT, "fixtures/hub-gold-cobol-structured");
const HOLES = join(ROOT, "fixtures/hub-gold-cobol-holes");
const CLBS_MINI = join(ROOT, "fixtures/hub-cobol-clbs-mini");
const CLBS_BATCH = join(CLBS_MINI, "batch");
const CLBS_ONLINE = join(CLBS_MINI, "online");

/**
 * @param {string} emitTarget
 * @returns {string[]}
 */
function suiteIdsFor(emitTarget) {
  return [`cobol-structured-${emitTarget}-full`, `cobol-middleware-${emitTarget}-full`];
}

/**
 * @param {string} fixture
 * @param {string} language
 */
function runLift(fixture, language) {
  const r = spawnSync(process.execPath, [LIFT, fixture, "--language", language], {
    cwd: ROOT,
    encoding: "utf8",
  });
  const text = (r.stdout || "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const report = start >= 0 && end > start ? JSON.parse(text.slice(start, end + 1)) : {};
  return { status: r.status ?? 1, report, stderr: r.stderr || "" };
}

export async function runCobolBestFitSmoke() {
  const progress = createSmokeProgress("cobol-best-fit");
  const t0 = progress.start("COBOL pattern-lift best-fit prove");

  /** @type {Array<{ id: string, ok: boolean, reason?: string, detail?: unknown }>} */
  const results = [];

  const lane = ingestLaneForOrigin("cobol");
  results.push({
    id: "lane-hub-pattern-lift",
    ok: lane === "hub-pattern-lift",
    reason: lane === "hub-pattern-lift" ? undefined : `lane=${lane}`,
  });

  const hubCob = join(STRUCTURED, "hub.cob");
  const hubSrc = existsSync(hubCob) ? readFileSync(hubCob, "utf8") : "";
  const paraRoutes = parseCobolRoutes(hubSrc);
  const structuredInv = hubSrc ? inventoryCobolSource(hubSrc, "hub.cob") : null;
  const paraOk =
    paraRoutes.some((r) => r.method === "GET" && r.path === "/health") &&
    paraRoutes.some((r) => r.method === "GET" && r.path === "/meta") &&
    paraRoutes.some((r) => r.method === "GET" && r.path === "/main-logic") &&
    !!structuredInv &&
    structuredInv.sectionNames.includes("MAIN-LOGIC");
  results.push({
    id: "procedure-paragraph-routes",
    ok: paraOk,
    reason: paraOk ? undefined : "missing /health+/meta+/main-logic SECTION routes",
    detail: { routes: paraRoutes, sections: structuredInv?.sectionNames },
  });

  // CLBS mini + CKPRSTRN / DEPTPAY inventory (pattern-lift deepen; not behavioral)
  for (const [id, file, assertFn] of [
    [
      "clbs-mini-clbsmath",
      join(CLBS_BATCH, "CLBSMATH.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) => inv.programIds.includes("CLBSMATH") && inv.computes >= 1,
    ],
    [
      "clbs-mini-ckprstrn",
      join(CLBS_BATCH, "CKPRSTRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("CKPRSTRN") &&
        inv.evaluateTrue >= 1 &&
        inv.routeCount >= 2 &&
        inv.performs.includes("PROC-TAKE-CHECKPOINT"),
    ],
    [
      "clbs-mini-deptpay",
      join(CLBS_BATCH, "DEPTPAY.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("DEPTPAY") &&
        inv.computes >= 1 &&
        inv.performs.includes("AVERAGE-SALARY"),
    ],
  ]) {
    const src = existsSync(file) ? readFileSync(file, "utf8") : "";
    const inv = src ? inventoryCobolSource(src, file) : null;
    const ok = !!inv && assertFn(inv);
    results.push({
      id: /** @type {string} */ (id),
      ok,
      reason: ok
        ? undefined
        : inv
          ? `ids=${inv.programIds.join(",")} evalTrue=${inv.evaluateTrue} computes=${inv.computes}`
          : "missing-fixture",
      detail: inv
        ? {
            programIds: inv.programIds,
            evaluateTrue: inv.evaluateTrue,
            computes: inv.computes,
            routeCount: inv.routeCount,
            performs: inv.performs,
          }
        : undefined,
    });
  }

  for (const [id, file, assertFn] of [
    [
      "clbs-mini-srchtab",
      join(CLBS_BATCH, "SRCHTAB.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) => inv.programIds.includes("SRCHTAB") && inv.occurs >= 1 && inv.search >= 1,
    ],
    [
      "clbs-mini-evalmany",
      join(CLBS_BATCH, "EVALMANY.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("EVALMANY") &&
        inv.evaluateAny >= 1 &&
        inv.evaluateTrue === 0 &&
        (inv.evaluateNumericWhens || []).length >= 3,
    ],
    [
      "clbs-mini-cardfeein",
      join(CLBS_BATCH, "CARDFEEIN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) => inv.programIds.includes("CARDFEEIN") && inv.computes >= 3,
    ],
    [
      "clbs-mini-ckprusrn",
      join(CLBS_BATCH, "CKPRUSRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("CKPRUSRN") &&
        inv.procedureUsing >= 1 &&
        inv.evaluateTrue >= 1,
    ],
    [
      "clbs-mini-seqmax",
      join(CLBS_BATCH, "SEQMAX.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) => inv.programIds.includes("SEQMAX") && inv.fileIo >= 1,
    ],
    [
      "clbs-mini-entryrn",
      join(CLBS_BATCH, "ENTRYRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("ENTRYRN") &&
        inv.entryCount >= 1 &&
        inv.entryNames.includes("ALTPHASE"),
    ],
    [
      "clbs-mini-idxvsam-holes",
      join(CLBS_BATCH, "IDXVSAM.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("IDXVSAM") &&
        inv.organizationIndexed >= 1 &&
        (inv.alternateRecordKeys || []).includes("IDX-ALT-KEY") &&
        inv.unresolved.includes("indexed-file") &&
        inv.unresolved.includes("record-key") &&
        inv.unresolved.includes("alternate-record-key") &&
        inv.unresolved.includes("invalid-key"),
    ],
    [
      "clbs-mini-idxkeyrn",
      join(CLBS_BATCH, "IDXKEYRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("IDXKEYRN") &&
        inv.fileIo >= 1 &&
        (inv.organizationIndexed || 0) === 0,
    ],
    [
      "clbs-mini-idxupdrn",
      join(CLBS_BATCH, "IDXUPDRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("IDXUPDRN") &&
        inv.fileIo >= 1 &&
        (inv.organizationIndexed || 0) === 0,
    ],
    [
      "clbs-mini-cardbill",
      join(CLBS_BATCH, "CARDBILL.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) => inv.programIds.includes("CARDBILL") && inv.computes >= 3,
    ],
    [
      "clbs-mini-cardpay",
      join(CLBS_BATCH, "CARDPAY.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("CARDPAY") &&
        inv.evaluateWhens.includes("F") &&
        inv.evaluateWhens.includes("P") &&
        inv.evaluateWhens.includes("M"),
    ],
    [
      "clbs-mini-idxrngrn",
      join(CLBS_BATCH, "IDXRNGRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("IDXRNGRN") &&
        inv.fileIo >= 1 &&
        (inv.organizationIndexed || 0) === 0,
    ],
    [
      "clbs-mini-cardstat",
      join(CLBS_BATCH, "CARDSTAT.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("CARDSTAT") &&
        inv.evaluateWhens.includes("A") &&
        inv.evaluateWhens.includes("D") &&
        inv.evaluateWhens.includes("C"),
    ],
    [
      "clbs-mini-histldrn",
      join(CLBS_BATCH, "HISTLDRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("HISTLDRN") &&
        inv.fileIo >= 1 &&
        (inv.organizationIndexed || 0) === 0 &&
        (inv.execSql || 0) === 0,
    ],
    [
      "clbs-mini-idxprobe",
      join(CLBS_BATCH, "IDXPROBE.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("IDXPROBE") &&
        inv.organizationIndexed >= 1 &&
        (inv.recordKeys || []).includes("IDX-KEY") &&
        !(inv.alternateRecordKeys || []).length &&
        inv.unresolved.includes("indexed-file"),
    ],
    [
      "clbs-mini-sqlinv",
      join(CLBS_BATCH, "SQLINV00.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("SQLINV00") &&
        inv.execSql >= 10 &&
        (inv.execSqlOps || []).includes("INSERT") &&
        (inv.execSqlOps || []).includes("DECLARE-CURSOR") &&
        (inv.execSqlOps || []).includes("COMMIT") &&
        inv.unresolved.includes("exec-sql"),
    ],
    [
      "clbs-mini-cardaccf",
      join(CLBS_BATCH, "CARDACCF.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("CARDACCF") &&
        inv.occurs >= 1 &&
        inv.evaluateWhens.includes("A") &&
        inv.evaluateWhens.includes("D") &&
        inv.evaluateWhens.includes("C"),
    ],
    [
      "clbs-mini-rptposrn",
      join(CLBS_BATCH, "RPTPOSRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("RPTPOSRN") &&
        inv.fileIo >= 1 &&
        (inv.organizationIndexed || 0) === 0,
    ],
    [
      "clbs-mini-idxaltrn",
      join(CLBS_BATCH, "IDXALTRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("IDXALTRN") &&
        inv.organizationIndexed >= 1 &&
        (inv.alternateRecordKeys || []).includes("IDX-ALT-KEY") &&
        inv.unresolved.includes("alternate-record-key"),
    ],
    [
      "clbs-mini-cardschd",
      join(CLBS_BATCH, "CARDSCHD.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("CARDSCHD") &&
        inv.occurs >= 2 &&
        inv.search >= 1,
    ],
    [
      "clbs-mini-rptaurn",
      join(CLBS_BATCH, "RPTAUDRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("RPTAUDRN") &&
        inv.fileIo >= 1 &&
        (inv.organizationIndexed || 0) === 0,
    ],
    [
      "clbs-mini-idxstrwr",
      join(CLBS_BATCH, "IDXSTRWR.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("IDXSTRWR") &&
        inv.organizationIndexed >= 1 &&
        (inv.recordKeys || []).includes("IDX-KEY") &&
        inv.unresolved.includes("indexed-file") &&
        inv.unresolved.includes("invalid-key"),
    ],
    [
      "clbs-mini-rptstarn",
      join(CLBS_BATCH, "RPTSTARN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("RPTSTARN") &&
        inv.fileIo >= 1 &&
        (inv.organizationIndexed || 0) === 0,
    ],
    [
      "clbs-mini-prcseqrn",
      join(CLBS_BATCH, "PRCSEQRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("PRCSEQRN") &&
        inv.procedureUsing >= 1 &&
        inv.evaluateTrue >= 1,
    ],
    [
      "clbs-mini-idxdelrn",
      join(CLBS_BATCH, "IDXDELRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("IDXDELRN") &&
        inv.organizationIndexed >= 1 &&
        (inv.recordKeys || []).includes("IDX-KEY") &&
        inv.unresolved.includes("indexed-file"),
    ],
    [
      "clbs-mini-idxaltrw",
      join(CLBS_BATCH, "IDXALTRW.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("IDXALTRW") &&
        inv.organizationIndexed >= 1 &&
        (inv.alternateRecordKeys || []).includes("IDX-ALT-KEY") &&
        inv.unresolved.includes("alternate-record-key"),
    ],
    [
      "clbs-mini-rtnanarn",
      join(CLBS_BATCH, "RTNANARN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("RTNANARN") &&
        inv.fileIo >= 1 &&
        (inv.organizationIndexed || 0) === 0,
    ],
    [
      "clbs-mini-bchctlrn",
      join(CLBS_BATCH, "BCHCTLRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("BCHCTLRN") &&
        inv.procedureUsing >= 1 &&
        inv.evaluateTrue >= 1,
    ],
    [
      "clbs-mini-utlmntrn",
      join(CLBS_BATCH, "UTLMNTRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("UTLMNTRN") &&
        inv.procedureUsing >= 1 &&
        inv.evaluateTrue >= 1,
    ],
    [
      "clbs-mini-utlvalrn",
      join(CLBS_BATCH, "UTLVALRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("UTLVALRN") &&
        inv.procedureUsing >= 1 &&
        inv.evaluateTrue >= 1,
    ],
    [
      "clbs-mini-idxgtnrn",
      join(CLBS_BATCH, "IDXGTNRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("IDXGTNRN") &&
        inv.organizationIndexed >= 1 &&
        (inv.recordKeys || []).includes("IDX-KEY") &&
        inv.unresolved.includes("indexed-file"),
    ],
    [
      "clbs-mini-utlmonrn",
      join(CLBS_BATCH, "UTLMONRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("UTLMONRN") &&
        inv.procedureUsing >= 1 &&
        inv.evaluateTrue >= 1,
    ],
    [
      "clbs-mini-tstvalrn",
      join(CLBS_BATCH, "TSTVALRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("TSTVALRN") &&
        inv.procedureUsing >= 1 &&
        inv.evaluateTrue >= 1,
    ],
    [
      "clbs-mini-portvalrn",
      join(CLBS_BATCH, "PORTVALRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("PORTVALRN") &&
        inv.procedureUsing >= 1 &&
        inv.evaluateTrue >= 1,
    ],
    [
      "clbs-mini-idxnlprn",
      join(CLBS_BATCH, "IDXNLPRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("IDXNLPRN") &&
        inv.organizationIndexed >= 1 &&
        (inv.recordKeys || []).includes("IDX-KEY") &&
        inv.unresolved.includes("indexed-file"),
    ],
    [
      "clbs-mini-utlmntls",
      join(CLBS_BATCH, "UTLMNTLS.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("UTLMNTLS") &&
        (inv.organizationIndexed || 0) === 0,
    ],
    [
      "clbs-mini-tstgenrn",
      join(CLBS_BATCH, "TSTGENRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("TSTGENRN") &&
        (inv.organizationIndexed || 0) === 0,
    ],
    [
      "clbs-mini-portaddrn",
      join(CLBS_BATCH, "PORTADDRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("PORTADDRN") &&
        (inv.organizationIndexed || 0) === 0,
    ],
    [
      "clbs-mini-portupdrn",
      join(CLBS_BATCH, "PORTUPDRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("PORTUPDRN") &&
        inv.evaluateTrue >= 1,
    ],
    [
      "clbs-mini-idxltprn",
      join(CLBS_BATCH, "IDXLTPRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("IDXLTPRN") &&
        inv.organizationIndexed >= 1 &&
        (inv.recordKeys || []).includes("IDX-KEY") &&
        inv.unresolved.includes("indexed-file"),
    ],
    [
      "clbs-mini-portdelrn",
      join(CLBS_BATCH, "PORTDELRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("PORTDELRN") &&
        inv.evaluateTrue >= 1,
    ],
    [
      "clbs-mini-portreadrn",
      join(CLBS_BATCH, "PORTREADRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("PORTREADRN") &&
        (inv.organizationIndexed || 0) === 0,
    ],
    [
      "clbs-mini-porttranrn",
      join(CLBS_BATCH, "PORTTRANRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("PORTTRANRN") &&
        (inv.organizationIndexed || 0) === 0,
    ],
    [
      "clbs-mini-idxeqprn",
      join(CLBS_BATCH, "IDXEQPRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("IDXEQPRN") &&
        inv.organizationIndexed >= 1 &&
        (inv.recordKeys || []).includes("IDX-KEY") &&
        inv.unresolved.includes("indexed-file"),
    ],
    [
      "clbs-mini-idxngtrn",
      join(CLBS_BATCH, "IDXNGTRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("IDXNGTRN") &&
        inv.organizationIndexed >= 1 &&
        (inv.recordKeys || []).includes("IDX-KEY") &&
        inv.unresolved.includes("indexed-file"),
    ],
    [
      "clbs-mini-portvaldn",
      join(CLBS_BATCH, "PORTVALDN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("PORTVALDN") &&
        (inv.copybooks || []).map((c) => c.toUpperCase()).includes("PORTVAL") &&
        inv.evaluateTrue >= 1,
    ],
    [
      "clbs-mini-portmstrn",
      join(CLBS_BATCH, "PORTMSTRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("PORTMSTRN") &&
        inv.procedureUsing >= 1 &&
        inv.evaluateTrue >= 1 &&
        (inv.organizationIndexed || 0) === 0,
    ],
    [
      "clbs-mini-portcomrn",
      join(CLBS_BATCH, "PORTCOMRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("PORTCOMRN") &&
        (inv.copybooks || []).map((c) => c.toUpperCase()).includes("PORTCOM") &&
        inv.evaluateTrue >= 1 &&
        (inv.organizationIndexed || 0) === 0,
    ],
    [
      "clbs-mini-idxeqnrn",
      join(CLBS_BATCH, "IDXEQNRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("IDXEQNRN") &&
        (inv.organizationIndexed || 0) >= 1 &&
        inv.unresolved.includes("indexed-file"),
    ],
    [
      "clbs-mini-idxnlnrn",
      join(CLBS_BATCH, "IDXNLNRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("IDXNLNRN") &&
        (inv.organizationIndexed || 0) >= 1 &&
        inv.unresolved.includes("indexed-file"),
    ],
    [
      "clbs-mini-idxltnrn",
      join(CLBS_BATCH, "IDXLTNRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("IDXLTNRN") &&
        (inv.organizationIndexed || 0) >= 1 &&
        inv.unresolved.includes("indexed-file"),
    ],
    [
      "clbs-mini-idxngprn",
      join(CLBS_BATCH, "IDXNGPRN.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("IDXNGPRN") &&
        (inv.organizationIndexed || 0) >= 1 &&
        inv.unresolved.includes("indexed-file"),
    ],
    [
      "clbs-mini-cobtupdt",
      join(CLBS_BATCH, "COBTUPDT.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("COBTUPDT") &&
        (inv.execSqlOps || []).includes("INSERT") &&
        (inv.execSqlOps || []).includes("UPDATE") &&
        (inv.execSqlOps || []).includes("DELETE") &&
        inv.unresolved.includes("exec-sql"),
    ],
    [
      "clbs-mini-porttest",
      join(CLBS_BATCH, "PORTTEST.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("PORTTEST") &&
        (inv.copybooks || []).map((c) => c.toUpperCase()).includes("PORTFLIO") &&
        (inv.copybooks || []).map((c) => c.toUpperCase()).includes("ERRHAND") &&
        inv.unresolved.includes("function-random"),
    ],
    [
      "clbs-mini-portvalcp",
      join(CLBS_BATCH, "PORTVALCP.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("PORTVALCP") &&
        (inv.copybooks || []).map((c) => c.toUpperCase()).includes("PORTVAL"),
    ],
    [
      "clbs-mini-sqlcpy",
      join(CLBS_BATCH, "SQLCPY00.cbl"),
      /** @param {ReturnType<typeof inventoryCobolSource>} inv */
      (inv) =>
        inv.programIds.includes("SQLCPY00") &&
        (inv.copybooks || []).map((c) => c.toUpperCase()).includes("SQLCA") &&
        (inv.execSql || 0) === 0,
    ],
  ]) {
    const src = existsSync(file) ? readFileSync(file, "utf8") : "";
    const inv = src ? inventoryCobolSource(src, file) : null;
    const ok = !!inv && assertFn(inv);
    results.push({
      id: /** @type {string} */ (id),
      ok,
      reason: ok
        ? undefined
        : inv
          ? `ids=${inv.programIds.join(",")} occurs=${inv.occurs} search=${inv.search} numericWhens=${(inv.evaluateNumericWhens || []).join(",")}`
          : "missing-fixture",
      detail: inv
        ? {
            programIds: inv.programIds,
            occurs: inv.occurs,
            search: inv.search,
            evaluateNumericWhens: inv.evaluateNumericWhens,
            evaluateTrue: inv.evaluateTrue,
          }
        : undefined,
    });
  }

  const upstreamCkpr = join(CLBS_MINI, "_upstream/CKPRST.cbl");
  const upstreamSrc = existsSync(upstreamCkpr) ? readFileSync(upstreamCkpr, "utf8") : "";
  const upstreamInv = upstreamSrc ? inventoryCobolSource(upstreamSrc, "_upstream/CKPRST.cbl") : null;
  results.push({
    id: "pattern-lift-procedure-using-upstream",
    ok: !!upstreamInv && upstreamInv.procedureUsing >= 1 && upstreamInv.evaluateTrue >= 1,
    reason: upstreamInv
      ? `using=${upstreamInv.procedureUsing} args=${(upstreamInv.procedureUsingArgs || []).join(",")} evalTrue=${upstreamInv.evaluateTrue}`
      : "missing-upstream-CKPRST",
  });

  const inqPath = join(CLBS_ONLINE, "INQONLN.cbl");
  const inqSrc = existsSync(inqPath) ? readFileSync(inqPath, "utf8") : "";
  const inqInv = inqSrc ? inventoryCobolSource(inqSrc, "online/INQONLN.cbl") : null;
  const needOps = [
    "HANDLE",
    "RECEIVE",
    "SEND",
    "LINK",
    "RETURN",
    "READ",
    "XCTL",
    "STARTBR",
    "WRITEQ",
    "READQ",
    "DELETEQ",
    "ENQ",
    "DEQ",
  ];
  const inqOps = new Set(inqInv?.execCicsOps || []);
  const inqMissing = needOps.filter((o) => !inqOps.has(o));
  results.push({
    id: "online-cics-structural-deepen",
    ok:
      !!inqInv &&
      inqMissing.length === 0 &&
      inqInv.handleCondition >= 1 &&
      inqInv.handleAid >= 1 &&
      inqInv.sectionCount >= 4 &&
      inqInv.unresolved.includes("exec-cics"),
    reason: inqInv
      ? inqMissing.length
        ? `missing=${inqMissing.join(",")}`
        : `ops=${[...inqOps].join(",")} sections=${inqInv.sectionCount}`
      : "missing-INQONLN",
    detail: inqInv
      ? { execCicsOps: inqInv.execCicsOps, sections: inqInv.sectionNames, evaluateWhens: inqInv.evaluateWhens }
      : undefined,
  });

  const cardPath = join(CLBS_ONLINE, "CARDONLN.cbl");
  const cardSrc = existsSync(cardPath) ? readFileSync(cardPath, "utf8") : "";
  const cardInv = cardSrc ? inventoryCobolSource(cardSrc, "online/CARDONLN.cbl") : null;
  results.push({
    id: "online-carddemo-structural",
    ok:
      !!cardInv &&
      cardInv.programIds.includes("CARDONLN") &&
      (cardInv.execCicsOps || []).includes("HANDLE") &&
      (cardInv.execCicsOps || []).includes("XCTL") &&
      (cardInv.execCicsOps || []).includes("GETMAIN") &&
      (cardInv.execCicsOps || []).includes("INQUIRE") &&
      cardInv.sectionCount >= 3 &&
      cardInv.procedureUsing >= 1 &&
      /\bDFHCOMMAREA\b/i.test(cardSrc) &&
      /\bCOMMAREA\s*\(\s*DFHCOMMAREA\s*\)/i.test(cardSrc),
    reason: cardInv
      ? `ops=${(cardInv.execCicsOps || []).join(",")} sections=${cardInv.sectionCount} using=${cardInv.procedureUsing}`
      : "missing-CARDONLN",
  });

  const cardCopy = resolveCobolCopybooks(cardInv?.copybooks || [], [join(CLBS_MINI, "copybook")]);
  const cardResolved = cardCopy.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  const cardUnresolved = cardCopy.filter((r) => !r.resolved).map((r) => r.name.toUpperCase());
  const aidOnDisk = existsSync(join(CLBS_MINI, "copybook", "DFHAID.cpy"));
  const bmsOnDisk = existsSync(join(CLBS_MINI, "copybook", "DFHBMSCA.cpy"));
  const extfmapOnDisk = existsSync(join(CLBS_MINI, "copybook", "EXTFMAP.cpy"));
  const aidOk = aidOnDisk
    ? cardResolved.includes("DFHAID")
    : cardUnresolved.includes("DFHAID");
  const bmsOk = bmsOnDisk
    ? cardResolved.includes("DFHBMSCA")
    : cardUnresolved.includes("DFHBMSCA");
  results.push({
    id: "online-carddemo-cotrt-db2-map-resolve",
    ok:
      !!cardInv &&
      cardResolved.includes("COTRTLI") &&
      cardResolved.includes("COTRTUP") &&
      cardResolved.includes("COADM02Y") &&
      aidOk &&
      bmsOk &&
      cardInv.unresolved.includes("copy") &&
      cardInv.unresolved.includes("exec-cics"),
    reason: cardInv
      ? `resolved=${cardResolved.filter((n) => /COTRT|COADM02Y|DFH/.test(n)).join(",")} unresolvedBms=${cardUnresolved.filter((n) => /^DFH/.test(n)).join(",")} aidDisk=${aidOnDisk} bmsDisk=${bmsOnDisk} extfmapDisk=${extfmapOnDisk}`
      : "missing-CARDONLN",
  });

  const cotrtlicPath = join(CLBS_ONLINE, "COTRTLIC.cbl");
  const cotrtlicSrc = existsSync(cotrtlicPath) ? readFileSync(cotrtlicPath, "utf8") : "";
  const cotrtlicInv = cotrtlicSrc
    ? inventoryCobolSource(cotrtlicSrc, "online/COTRTLIC.cbl")
    : null;
  const cotrtlicSqlOps = new Set(cotrtlicInv?.execSqlOps || []);
  const cotrtlicCicsOps = new Set(cotrtlicInv?.execCicsOps || []);
  const cotrtlicInc = resolveCobolCopybooks(
    (cotrtlicInv?.execSqlIncludes || []).map((n) => String(n).toUpperCase()),
    [join(CLBS_MINI, "copybook")],
  );
  const cotrtlicIncResolved = cotrtlicInc.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  results.push({
    id: "online-cotrtlic-structural",
    ok:
      !!cotrtlicInv &&
      cotrtlicInv.programIds.includes("COTRTLIC") &&
      cotrtlicSqlOps.has("DECLARE-CURSOR") &&
      cotrtlicCicsOps.has("RECEIVE") &&
      cotrtlicIncResolved.includes("CSDB2RWY") &&
      cotrtlicIncResolved.includes("DCLTRTYP") &&
      cotrtlicInv.unresolved.includes("exec-sql") &&
      cotrtlicInv.unresolved.includes("exec-cics"),
    reason: cotrtlicInv
      ? `sql=${[...cotrtlicSqlOps].join(",")} cics=${[...cotrtlicCicsOps].join(",")} inc=${cotrtlicIncResolved.join(",")}`
      : "missing-COTRTLIC",
  });

  const cotrtupcPath = join(CLBS_ONLINE, "COTRTUPC.cbl");
  const cotrtupcSrc = existsSync(cotrtupcPath) ? readFileSync(cotrtupcPath, "utf8") : "";
  const cotrtupcInv = cotrtupcSrc
    ? inventoryCobolSource(cotrtupcSrc, "online/COTRTUPC.cbl")
    : null;
  const cotrtupcSqlOps = new Set(cotrtupcInv?.execSqlOps || []);
  const cotrtupcCicsOps = new Set(cotrtupcInv?.execCicsOps || []);
  const cotrtupcInc = resolveCobolCopybooks(
    (cotrtupcInv?.execSqlIncludes || []).map((n) => String(n).toUpperCase()),
    [join(CLBS_MINI, "copybook")],
  );
  const cotrtupcIncResolved = cotrtupcInc.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  results.push({
    id: "online-cotrtupc-structural",
    ok:
      !!cotrtupcInv &&
      cotrtupcInv.programIds.includes("COTRTUPC") &&
      cotrtupcSqlOps.has("INSERT") &&
      cotrtupcCicsOps.has("ABEND") &&
      cotrtupcIncResolved.includes("DCLTRTYP") &&
      cotrtupcIncResolved.includes("DCLTRCAT") &&
      cotrtupcInv.unresolved.includes("exec-sql") &&
      cotrtupcInv.unresolved.includes("exec-cics"),
    reason: cotrtupcInv
      ? `sql=${[...cotrtupcSqlOps].join(",")} cics=${[...cotrtupcCicsOps].join(",")} inc=${cotrtupcIncResolved.join(",")}`
      : "missing-COTRTUPC",
  });

  const portPath = join(CLBS_ONLINE, "PORTONLN.cbl");
  const portSrc = existsSync(portPath) ? readFileSync(portPath, "utf8") : "";
  const portInv = portSrc ? inventoryCobolSource(portSrc, "online/PORTONLN.cbl") : null;
  const portNeed = ["HANDLE", "VERIFY", "SUSPEND", "WRITEQ", "ENQ", "XCTL", "RETURN"];
  const portOps = new Set(portInv?.execCicsOps || []);
  const portMissing = portNeed.filter((o) => !portOps.has(o));
  results.push({
    id: "online-portonln-structural",
    ok:
      !!portInv &&
      portInv.programIds.includes("PORTONLN") &&
      portMissing.length === 0 &&
      portInv.unresolved.includes("exec-cics"),
    reason: portInv
      ? portMissing.length
        ? `missing=${portMissing.join(",")}`
        : `ops=${[...portOps].join(",")} sections=${portInv.sectionCount}`
      : "missing-PORTONLN",
  });

  const copyDir = join(CLBS_MINI, "copybook");
  const inqCopy = resolveCobolCopybooks(inqInv?.copybooks || [], [copyDir]);
  const inqResolved = inqCopy.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  const inqUnresolved = inqCopy.filter((r) => !r.resolved).map((r) => r.name.toUpperCase());
  const inqExtfmapOk = extfmapOnDisk
    ? inqResolved.includes("EXTFMAP")
    : inqUnresolved.includes("EXTFMAP");
  results.push({
    id: "online-copy-resolve",
    ok:
      !!inqInv &&
      inqResolved.includes("INQCOM") &&
      inqResolved.includes("ERRHND") &&
      inqResolved.includes("INQPORT") &&
      inqExtfmapOk &&
      inqInv.unresolved.includes("copy"),
    reason: inqInv
      ? `resolved=${inqResolved.join(",")} unresolved=${inqUnresolved.join(",")} extfmapDisk=${extfmapOnDisk}`
      : "missing-INQONLN",
  });

  const sqlcpyPath = join(CLBS_BATCH, "SQLCPY00.cbl");
  const sqlcpySrc = existsSync(sqlcpyPath) ? readFileSync(sqlcpyPath, "utf8") : "";
  const sqlcpyInv = sqlcpySrc ? inventoryCobolSource(sqlcpySrc, "batch/SQLCPY00.cbl") : null;
  const sqlcpyCopy = resolveCobolCopybooks(sqlcpyInv?.copybooks || [], [copyDir]);
  const sqlcpyResolved = sqlcpyCopy.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  results.push({
    id: "batch-sqlca-copy-resolve",
    ok:
      !!sqlcpyInv &&
      sqlcpyResolved.includes("SQLCA") &&
      (sqlcpyInv.execSql || 0) === 0 &&
      sqlcpyInv.unresolved.includes("copy"),
    reason: sqlcpyInv
      ? `resolved=${sqlcpyResolved.join(",")} books=${(sqlcpyInv.copybooks || []).join(",")}`
      : "missing-SQLCPY00",
  });

  const sqlinvPath = join(CLBS_BATCH, "SQLINV00.cbl");
  const sqlinvSrc = existsSync(sqlinvPath) ? readFileSync(sqlinvPath, "utf8") : "";
  const sqlinvInv = sqlinvSrc ? inventoryCobolSource(sqlinvSrc, "batch/SQLINV00.cbl") : null;
  const sqlIncNames = (sqlinvInv?.execSqlIncludes || []).map((n) => String(n).toUpperCase());
  const sqlIncResolve = resolveCobolCopybooks(sqlIncNames, [copyDir]);
  const sqlIncResolved = sqlIncResolve.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  const sqlIncPath = sqlIncResolve.find((r) => r.resolved && String(r.name).toUpperCase() === "SQLCA")
    ?.resolved;
  const sqlCpyPathResolved = sqlcpyCopy.find(
    (r) => r.resolved && String(r.name).toUpperCase() === "SQLCA",
  )?.resolved;
  const upstreamHistldPath = join(CLBS_MINI, "_upstream/HISTLD00.cbl");
  const upstreamHistldSrc = existsSync(upstreamHistldPath)
    ? readFileSync(upstreamHistldPath, "utf8")
    : "";
  const upstreamHistldInv = upstreamHistldSrc
    ? inventoryCobolSource(upstreamHistldSrc, "_upstream/HISTLD00.cbl")
    : null;
  results.push({
    id: "batch-sqlca-dual-resolve",
    ok:
      sqlcpyResolved.includes("SQLCA") &&
      sqlIncNames.includes("SQLCA") &&
      sqlIncResolved.includes("SQLCA") &&
      (sqlinvInv?.execSqlOps || []).includes("INCLUDE") &&
      !!sqlinvInv &&
      sqlinvInv.unresolved.includes("exec-sql") &&
      !!sqlIncPath &&
      !!sqlCpyPathResolved &&
      sqlIncPath === sqlCpyPathResolved &&
      !!upstreamHistldInv &&
      (upstreamHistldInv.copybooks || []).map((c) => c.toUpperCase()).includes("SQLCA"),
    reason: `include=${sqlIncNames.join(",")} resolved=${sqlIncResolved.join(",")} same=${sqlIncPath === sqlCpyPathResolved}`,
  });

  // Pattern emit for CLBSMATH must recognize rounded-product
  const mathSrc = existsSync(join(CLBS_BATCH, "CLBSMATH.cbl"))
    ? readFileSync(join(CLBS_BATCH, "CLBSMATH.cbl"), "utf8")
    : "";
  const mathEmit = mathSrc ? emitFromCobolPatterns(mathSrc, "python", { subjectId: "clbsmath" }) : null;
  results.push({
    id: "pattern-emit-clbsmath",
    ok: !!mathEmit && mathEmit.ok === true && mathEmit.pattern === "rounded-product" && mathEmit.expected === "52.50",
    reason: mathEmit
      ? `pattern=${mathEmit.pattern} expected=${mathEmit.expected}`
      : "missing-CLBSMATH",
  });

  const structuredLift = runLift(STRUCTURED, "cobol");
  const sReport = structuredLift.report;
  const structuredOk =
    structuredLift.status === 0 &&
    (sReport.astRouteCount ?? 0) >= 2 &&
    (sReport.holeCount ?? 1) === 0;
  results.push({
    id: "structured-pattern-lift",
    ok: structuredOk,
    reason: structuredOk
      ? undefined
      : `status=${structuredLift.status} routes=${sReport.astRouteCount} holes=${sReport.holeCount}`,
    detail: {
      routeCount: sReport.routeCount,
      astRouteCount: sReport.astRouteCount,
      holeCount: sReport.holeCount,
    },
  });

  const holeLift = runLift(HOLES, "cobol");
  const hReport = holeLift.report;
  const holeSrc = existsSync(join(HOLES, "legacy-call.cob"))
    ? readFileSync(join(HOLES, "legacy-call.cob"), "utf8")
    : "";
  const unresolved = cobolUnresolvedOps(holeSrc);
  const bodyNull = cobolBodyAfter(holeSrc, 0) === null;
  const holesOk =
    holeLift.status === 0 &&
    (hReport.holeCount ?? 0) > 0 &&
    bodyNull &&
    unresolved.includes("call") &&
    unresolved.includes("accept") &&
    unresolved.includes("display");
  results.push({
    id: "honest-holes-call-accept-display",
    ok: holesOk,
    reason: holesOk
      ? undefined
      : `holes=${hReport.holeCount} unresolved=${unresolved.join(",")} bodyNull=${bodyNull}`,
    detail: { holeCount: hReport.holeCount, unresolved },
  });

  // G10085 — shaped WebIR hole attrs from inventory (not opaque handler-body alone).
  const webir = await loadWebir();
  const holeBuilder = new webir.ModuleBuilder({ sourceApp: "hub-lift:cobol-g10085" });
  const holeWr = webir.webRequest.builders(holeBuilder);
  liftPatternRoutesFile({
    webir,
    builder: holeBuilder,
    wr: holeWr,
    source: holeSrc,
    file: "legacy-call.cob",
    language: "cobol",
  });
  const holeMod = holeBuilder.finish();
  const holeNodes = [...holeMod.nodes.values()].filter(
    (n) => n && n.dialect === "data" && n.op === "hole",
  );
  const shapedHole = holeNodes.find(
    (n) =>
      n.attrs?.reason === "hub-cobol:handler-body" &&
      Array.isArray(n.attrs?.unresolved) &&
      n.attrs.unresolved.includes("call") &&
      n.attrs.unresolved.includes("accept") &&
      n.attrs.unresolved.includes("display"),
  );
  results.push({
    id: "webir-shaped-cobol-hole-attrs",
    ok: !!shapedHole,
    reason: shapedHole
      ? `unresolved=${(shapedHole.attrs.unresolved || []).join(",")}`
      : `holes=${holeNodes.length} attrs=${JSON.stringify(holeNodes[0]?.attrs || null)}`,
  });

  // G10086 — proven emit pattern lowers onto MAIN / sole entry WebIR route as literal.
  const mathPattern = mathSrc ? detectEmitPattern(mathSrc) : null;
  const mathExpected = mathPattern ? expectedFromPattern(mathPattern) : null;
  const mathBuilder = new webir.ModuleBuilder({ sourceApp: "hub-lift:cobol-g10086" });
  const mathWr = webir.webRequest.builders(mathBuilder);
  if (mathSrc) {
    liftPatternRoutesFile({
      webir,
      builder: mathBuilder,
      wr: mathWr,
      source: mathSrc,
      file: "CLBSMATH.cbl",
      language: "cobol",
    });
  }
  const mathMod = mathBuilder.finish();
  const mathLiterals = [...mathMod.nodes.values()].filter(
    (n) => n && n.dialect === "data" && n.op === "literal" && n.attrs?.value === mathExpected,
  );
  results.push({
    id: "webir-emit-pattern-literal-clbsmath",
    ok:
      !!mathSrc &&
      mathPattern?.kind === "rounded-product" &&
      mathExpected === "52.50" &&
      mathLiterals.length >= 1,
    reason: `pattern=${mathPattern?.kind} expected=${mathExpected} literals=${mathLiterals.length}`,
  });

  // G10091 — arithmetic emit patterns also lower typed data.binOp (keep expected literal).
  const mathBinOps = [...mathMod.nodes.values()].filter(
    (n) => n && n.dialect === "data" && n.op === "binop" && n.attrs?.operator === "*",
  );
  const empPath = join(CLBS_BATCH, "EMPPAYRN.cbl");
  const empSrc = existsSync(empPath) ? readFileSync(empPath, "utf8") : "";
  const empPat = empSrc ? detectEmitPattern(empSrc) : null;
  const empExp = empPat ? expectedFromPattern(empPat) : null;
  const empBuilder = new webir.ModuleBuilder({ sourceApp: "hub-lift:cobol-g10091" });
  const empWr = webir.webRequest.builders(empBuilder);
  if (empSrc) {
    liftPatternRoutesFile({
      webir,
      builder: empBuilder,
      wr: empWr,
      source: empSrc,
      file: "EMPPAYRN.cbl",
      language: "cobol",
      copybookDirs: [join(CLBS_MINI, "copybook")],
      projectDir: CLBS_MINI,
    });
  }
  const empMod = empBuilder.finish();
  const empBinOps = [...empMod.nodes.values()].filter(
    (n) => n && n.dialect === "data" && n.op === "binop" && n.attrs?.operator === "*",
  );
  const empLit = [...empMod.nodes.values()].some(
    (n) => n.dialect === "data" && n.op === "literal" && n.attrs?.value === empExp,
  );
  results.push({
    id: "webir-emit-pattern-typed-binop",
    ok:
      mathBinOps.length >= 1 &&
      empPat?.kind === "ot-weekly" &&
      empExp === "446.50" &&
      empBinOps.length >= 1 &&
      empLit,
    reason: `clbsmath*=${mathBinOps.length} emp*=${empBinOps.length} empKind=${empPat?.kind} empLit=${empLit}`,
  });

  // G10092 — seq-max / perform-varying-sum typed WebIR (operands+max int / + fold).
  const seqPath = join(CLBS_BATCH, "SEQMAX.cbl");
  const seqSrc = existsSync(seqPath) ? readFileSync(seqPath, "utf8") : "";
  const seqPat = seqSrc ? detectEmitPattern(seqSrc) : null;
  const seqExp = seqPat ? expectedFromPattern(seqPat) : null;
  const seqBuilder = new webir.ModuleBuilder({ sourceApp: "hub-lift:cobol-g10092" });
  const seqWr = webir.webRequest.builders(seqBuilder);
  if (seqSrc) {
    liftPatternRoutesFile({
      webir,
      builder: seqBuilder,
      wr: seqWr,
      source: seqSrc,
      file: "SEQMAX.cbl",
      language: "cobol",
      copybookDirs: [join(CLBS_MINI, "copybook")],
      projectDir: CLBS_MINI,
    });
  }
  const seqMod = seqBuilder.finish();
  const seqInt30 = [...seqMod.nodes.values()].filter(
    (n) => n && n.dialect === "data" && n.op === "literal" && n.attrs?.value === 30,
  );
  const seqStrLit = [...seqMod.nodes.values()].some(
    (n) => n && n.dialect === "data" && n.op === "literal" && n.attrs?.value === seqExp,
  );

  const varyPath = join(CLBS_BATCH, "VARYSUM.cbl");
  const varySrc = existsSync(varyPath) ? readFileSync(varyPath, "utf8") : "";
  const varyPat = varySrc ? detectEmitPattern(varySrc) : null;
  const varyExp = varyPat ? expectedFromPattern(varyPat) : null;
  const varyBuilder = new webir.ModuleBuilder({ sourceApp: "hub-lift:cobol-g10092-vary" });
  const varyWr = webir.webRequest.builders(varyBuilder);
  if (varySrc) {
    liftPatternRoutesFile({
      webir,
      builder: varyBuilder,
      wr: varyWr,
      source: varySrc,
      file: "VARYSUM.cbl",
      language: "cobol",
      copybookDirs: [join(CLBS_MINI, "copybook")],
      projectDir: CLBS_MINI,
    });
  }
  const varyMod = varyBuilder.finish();
  const varyPlus = [...varyMod.nodes.values()].filter(
    (n) => n && n.dialect === "data" && n.op === "binop" && n.attrs?.operator === "+",
  );
  const varyLit = [...varyMod.nodes.values()].some(
    (n) => n && n.dialect === "data" && n.op === "literal" && n.attrs?.value === varyExp,
  );
  results.push({
    id: "webir-emit-pattern-seq-max-varysum",
    ok:
      seqPat?.kind === "seq-max" &&
      seqExp === "30.00" &&
      seqInt30.length >= 1 &&
      seqStrLit &&
      varyPat?.kind === "perform-varying-sum" &&
      varyExp === "55" &&
      varyPlus.length >= 1 &&
      varyLit,
    reason: `seqKind=${seqPat?.kind} seqExp=${seqExp} seqInt30=${seqInt30.length} varyKind=${varyPat?.kind} vary+=${varyPlus.length} varyExp=${varyExp}`,
  });

  // G10093 — evaluate-phase / evaluate-func / indexed-key-read WebIR literal catalogs.
  const ckprPath = join(CLBS_BATCH, "CKPRSTRN.cbl");
  const ckprSrc = existsSync(ckprPath) ? readFileSync(ckprPath, "utf8") : "";
  const ckprPat = ckprSrc ? detectEmitPattern(ckprSrc) : null;
  const ckprExp = ckprPat ? expectedFromPattern(ckprPat) : null;
  const ckprBuilder = new webir.ModuleBuilder({ sourceApp: "hub-lift:cobol-g10093-ckpr" });
  const ckprWr = webir.webRequest.builders(ckprBuilder);
  if (ckprSrc) {
    liftPatternRoutesFile({
      webir,
      builder: ckprBuilder,
      wr: ckprWr,
      source: ckprSrc,
      file: "CKPRSTRN.cbl",
      language: "cobol",
      copybookDirs: [join(CLBS_MINI, "copybook")],
      projectDir: CLBS_MINI,
    });
  }
  const ckprMod = ckprBuilder.finish();
  const ckprEntryLit = [...ckprMod.nodes.values()].some(
    (n) =>
      n &&
      n.dialect === "data" &&
      n.op === "literal" &&
      n.attrs?.value === String(ckprPat?.meta?.entry ?? ""),
  );
  const ckprPhase20 = [...ckprMod.nodes.values()].filter(
    (n) => n && n.dialect === "data" && n.op === "literal" && n.attrs?.value === 20,
  );
  const ckprStrLit = [...ckprMod.nodes.values()].some(
    (n) => n && n.dialect === "data" && n.op === "literal" && n.attrs?.value === ckprExp,
  );

  const idxPath = join(CLBS_BATCH, "IDXPROBE.cbl");
  const idxSrc = existsSync(idxPath) ? readFileSync(idxPath, "utf8") : "";
  const idxPat = idxSrc ? detectEmitPattern(idxSrc) : null;
  const idxExp = idxPat ? expectedFromPattern(idxPat) : null;
  const idxBuilder = new webir.ModuleBuilder({ sourceApp: "hub-lift:cobol-g10093-idx" });
  const idxWr = webir.webRequest.builders(idxBuilder);
  if (idxSrc) {
    liftPatternRoutesFile({
      webir,
      builder: idxBuilder,
      wr: idxWr,
      source: idxSrc,
      file: "IDXPROBE.cbl",
      language: "cobol",
      copybookDirs: [join(CLBS_MINI, "copybook")],
      projectDir: CLBS_MINI,
    });
  }
  const idxMod = idxBuilder.finish();
  const idxFind = idxPat?.meta?.find;
  const idxFindLit = [...idxMod.nodes.values()].some(
    (n) =>
      n &&
      n.dialect === "data" &&
      n.op === "literal" &&
      n.attrs?.value === Number(idxFind),
  );
  const idxStrLit = [...idxMod.nodes.values()].some(
    (n) => n && n.dialect === "data" && n.op === "literal" && n.attrs?.value === idxExp,
  );

  const prcPath = join(CLBS_BATCH, "PRCSEQRN.cbl");
  const prcSrc = existsSync(prcPath) ? readFileSync(prcPath, "utf8") : "";
  const prcPat = prcSrc ? detectEmitPattern(prcSrc) : null;
  const prcExp = prcPat ? expectedFromPattern(prcPat) : null;
  const prcBuilder = new webir.ModuleBuilder({ sourceApp: "hub-lift:cobol-g10093-prc" });
  const prcWr = webir.webRequest.builders(prcBuilder);
  if (prcSrc) {
    liftPatternRoutesFile({
      webir,
      builder: prcBuilder,
      wr: prcWr,
      source: prcSrc,
      file: "PRCSEQRN.cbl",
      language: "cobol",
      copybookDirs: [join(CLBS_MINI, "copybook")],
      projectDir: CLBS_MINI,
    });
  }
  const prcMod = prcBuilder.finish();
  const prcFuncLit = [...prcMod.nodes.values()].some(
    (n) =>
      n &&
      n.dialect === "data" &&
      n.op === "literal" &&
      n.attrs?.value === String(prcPat?.meta?.func ?? ""),
  );
  const prcStrLit = [...prcMod.nodes.values()].some(
    (n) => n && n.dialect === "data" && n.op === "literal" && n.attrs?.value === prcExp,
  );

  results.push({
    id: "webir-emit-pattern-evaluate-indexed-literals",
    ok:
      ckprPat?.kind === "evaluate-phase" &&
      ckprExp === "20" &&
      ckprEntryLit &&
      ckprPhase20.length >= 1 &&
      ckprStrLit &&
      idxPat?.kind === "indexed-key-read" &&
      idxExp === "77.50" &&
      idxFindLit &&
      idxStrLit &&
      prcPat?.kind === "evaluate-func" &&
      prcFuncLit &&
      prcStrLit,
    reason: `ckpr=${ckprPat?.kind}/${ckprExp}/entry=${ckprEntryLit}/20=${ckprPhase20.length} idx=${idxPat?.kind}/${idxExp}/find=${idxFindLit} prc=${prcPat?.kind}/${prcExp}/func=${prcFuncLit}`,
  });

  // G10094 — indexed/file-io inventory fields on WebIR hole attrs (no runtime invent).
  const idxInv = idxSrc ? inventoryCobolSource(idxSrc, "IDXPROBE.cbl") : null;
  const idxHoleAttrs = idxInv ? buildCobolWebIrHoleAttrs(idxInv) : null;
  results.push({
    id: "webir-hole-attrs-indexed-fileio",
    ok:
      !!idxInv &&
      idxInv.organizationIndexed > 0 &&
      idxInv.recordKeys.length >= 1 &&
      idxHoleAttrs?.organizationIndexed === idxInv.organizationIndexed &&
      Array.isArray(idxHoleAttrs?.recordKeys) &&
      idxHoleAttrs.recordKeys.length >= 1 &&
      typeof idxHoleAttrs.fileIo === "number" &&
      idxHoleAttrs.fileIo > 0,
    reason: `orgIdx=${idxInv?.organizationIndexed} keys=${(idxInv?.recordKeys || []).join(",")} attrsOrg=${idxHoleAttrs?.organizationIndexed} attrsKeys=${(idxHoleAttrs?.recordKeys || []).join(",")} fileIo=${idxHoleAttrs?.fileIo}`,
  });

  // G10095 — nested-if-grade / search-table / evaluate-subject / rounded-chain WebIR catalogs.
  const nestPath = join(CLBS_BATCH, "NESTBR.cbl");
  const nestSrc = existsSync(nestPath) ? readFileSync(nestPath, "utf8") : "";
  const nestPat = nestSrc ? detectEmitPattern(nestSrc) : null;
  const nestExp = nestPat ? expectedFromPattern(nestPat) : null;
  const nestBuilder = new webir.ModuleBuilder({ sourceApp: "hub-lift:cobol-g10095-nest" });
  const nestWr = webir.webRequest.builders(nestBuilder);
  if (nestSrc) {
    liftPatternRoutesFile({
      webir,
      builder: nestBuilder,
      wr: nestWr,
      source: nestSrc,
      file: "NESTBR.cbl",
      language: "cobol",
      copybookDirs: [join(CLBS_MINI, "copybook")],
      projectDir: CLBS_MINI,
    });
  }
  const nestMod = nestBuilder.finish();
  const nestScoreLit = [...nestMod.nodes.values()].some(
    (n) => n && n.dialect === "data" && n.op === "literal" && n.attrs?.value === 75,
  );
  const nestGrade2 = [...nestMod.nodes.values()].filter(
    (n) => n && n.dialect === "data" && n.op === "literal" && n.attrs?.value === 2,
  );
  const nestStrLit = [...nestMod.nodes.values()].some(
    (n) => n && n.dialect === "data" && n.op === "literal" && n.attrs?.value === nestExp,
  );

  const srchPath = join(CLBS_BATCH, "SRCHTAB.cbl");
  const srchSrc = existsSync(srchPath) ? readFileSync(srchPath, "utf8") : "";
  const srchPat = srchSrc ? detectEmitPattern(srchSrc) : null;
  const srchExp = srchPat ? expectedFromPattern(srchPat) : null;
  const srchBuilder = new webir.ModuleBuilder({ sourceApp: "hub-lift:cobol-g10095-srch" });
  const srchWr = webir.webRequest.builders(srchBuilder);
  if (srchSrc) {
    liftPatternRoutesFile({
      webir,
      builder: srchBuilder,
      wr: srchWr,
      source: srchSrc,
      file: "SRCHTAB.cbl",
      language: "cobol",
      copybookDirs: [join(CLBS_MINI, "copybook")],
      projectDir: CLBS_MINI,
    });
  }
  const srchMod = srchBuilder.finish();
  const srchFindLit = [...srchMod.nodes.values()].some(
    (n) => n && n.dialect === "data" && n.op === "literal" && n.attrs?.value === 30,
  );
  const srchHitLit = [...srchMod.nodes.values()].some(
    (n) => n && n.dialect === "data" && n.op === "literal" && n.attrs?.value === 350,
  );
  const srchStrLit = [...srchMod.nodes.values()].some(
    (n) => n && n.dialect === "data" && n.op === "literal" && n.attrs?.value === srchExp,
  );

  const evalPath = join(CLBS_BATCH, "EVALMANY.cbl");
  const evalSrc = existsSync(evalPath) ? readFileSync(evalPath, "utf8") : "";
  const evalPat = evalSrc ? detectEmitPattern(evalSrc) : null;
  const evalExp = evalPat ? expectedFromPattern(evalPat) : null;
  const evalBuilder = new webir.ModuleBuilder({ sourceApp: "hub-lift:cobol-g10095-eval" });
  const evalWr = webir.webRequest.builders(evalBuilder);
  if (evalSrc) {
    liftPatternRoutesFile({
      webir,
      builder: evalBuilder,
      wr: evalWr,
      source: evalSrc,
      file: "EVALMANY.cbl",
      language: "cobol",
      copybookDirs: [join(CLBS_MINI, "copybook")],
      projectDir: CLBS_MINI,
    });
  }
  const evalMod = evalBuilder.finish();
  const evalSubjLit = [...evalMod.nodes.values()].some(
    (n) => n && n.dialect === "data" && n.op === "literal" && n.attrs?.value === 2,
  );
  const evalHitLit = [...evalMod.nodes.values()].some(
    (n) => n && n.dialect === "data" && n.op === "literal" && n.attrs?.value === 25,
  );
  const evalStrLit = [...evalMod.nodes.values()].some(
    (n) => n && n.dialect === "data" && n.op === "literal" && n.attrs?.value === evalExp,
  );

  const feePath = join(CLBS_BATCH, "CARDFEEIN.cbl");
  const feeSrc = existsSync(feePath) ? readFileSync(feePath, "utf8") : "";
  const feePat = feeSrc ? detectEmitPattern(feeSrc) : null;
  const feeExp = feePat ? expectedFromPattern(feePat) : null;
  const feeBuilder = new webir.ModuleBuilder({ sourceApp: "hub-lift:cobol-g10095-fee" });
  const feeWr = webir.webRequest.builders(feeBuilder);
  if (feeSrc) {
    liftPatternRoutesFile({
      webir,
      builder: feeBuilder,
      wr: feeWr,
      source: feeSrc,
      file: "CARDFEEIN.cbl",
      language: "cobol",
      copybookDirs: [join(CLBS_MINI, "copybook")],
      projectDir: CLBS_MINI,
    });
  }
  const feeMod = feeBuilder.finish();
  const feeBalLit = [...feeMod.nodes.values()].some(
    (n) => n && n.dialect === "data" && n.op === "literal" && n.attrs?.value === 1000,
  );
  const feeResultLit = [...feeMod.nodes.values()].some(
    (n) => n && n.dialect === "data" && n.op === "literal" && n.attrs?.value === 44.44,
  );
  const feeStepLit = [...feeMod.nodes.values()].some(
    (n) => n && n.dialect === "data" && n.op === "literal" && n.attrs?.value === "WS-TOTAL",
  );
  const feeStrLit = [...feeMod.nodes.values()].some(
    (n) => n && n.dialect === "data" && n.op === "literal" && n.attrs?.value === feeExp,
  );

  results.push({
    id: "webir-emit-pattern-control-catalog-literals",
    ok:
      nestPat?.kind === "nested-if-grade" &&
      nestExp === "2" &&
      nestScoreLit &&
      nestGrade2.length >= 1 &&
      nestStrLit &&
      srchPat?.kind === "search-table" &&
      srchExp === "350" &&
      srchFindLit &&
      srchHitLit &&
      srchStrLit &&
      evalPat?.kind === "evaluate-subject" &&
      evalExp === "25" &&
      evalSubjLit &&
      evalHitLit &&
      evalStrLit &&
      feePat?.kind === "rounded-chain" &&
      feeExp === "44.44" &&
      feeBalLit &&
      feeResultLit &&
      feeStepLit &&
      feeStrLit,
    reason: `nest=${nestPat?.kind}/${nestExp}/score=${nestScoreLit}/g2=${nestGrade2.length} srch=${srchPat?.kind}/${srchExp}/find=${srchFindLit} eval=${evalPat?.kind}/${evalExp}/hit=${evalHitLit} fee=${feePat?.kind}/${feeExp}/bal=${feeBalLit}/res=${feeResultLit}`,
  });

  // G10096 — seq-ctl-func-sum / seq-key-* / entry-alt / bill-pipeline WebIR catalogs.
  const liftOne = (file, sourceApp) => {
    const path = join(CLBS_BATCH, file);
    const src = existsSync(path) ? readFileSync(path, "utf8") : "";
    const pat = src ? detectEmitPattern(src) : null;
    const exp = pat ? expectedFromPattern(pat) : null;
    const builder = new webir.ModuleBuilder({ sourceApp });
    const wr = webir.webRequest.builders(builder);
    if (src) {
      liftPatternRoutesFile({
        webir,
        builder,
        wr,
        source: src,
        file,
        language: "cobol",
        copybookDirs: [join(CLBS_MINI, "copybook")],
        projectDir: CLBS_MINI,
      });
    }
    const mod = builder.finish();
    const lits = [...mod.nodes.values()].filter(
      (n) => n && n.dialect === "data" && n.op === "literal",
    );
    const has = (v) => lits.some((n) => n.attrs?.value === v);
    return { pat, exp, has };
  };

  const port = liftOne("PORTCOMRN.cbl", "hub-lift:cobol-g10096-port");
  const key = liftOne("IDXKEYRN.cbl", "hub-lift:cobol-g10096-key");
  const upd = liftOne("IDXUPDRN.cbl", "hub-lift:cobol-g10096-upd");
  const rng = liftOne("IDXRNGRN.cbl", "hub-lift:cobol-g10096-rng");
  const ent = liftOne("ENTRYRN.cbl", "hub-lift:cobol-g10096-ent");
  const bill = liftOne("CARDBILL.cbl", "hub-lift:cobol-g10096-bill");

  results.push({
    id: "webir-emit-pattern-seq-key-ctl-bill",
    ok:
      port.pat?.kind === "seq-ctl-func-sum" &&
      port.exp === "120" &&
      port.has("CREA") &&
      port.has(15) &&
      port.has(120) &&
      port.has(port.exp) &&
      key.pat?.kind === "seq-key-scan" &&
      key.exp === "77.50" &&
      key.has(42) &&
      key.has(77.5) &&
      key.has(key.exp) &&
      upd.pat?.kind === "seq-key-update" &&
      upd.exp === "82.50" &&
      upd.has(5) &&
      upd.has(upd.exp) &&
      rng.pat?.kind === "seq-key-range" &&
      rng.exp === "70.00" &&
      rng.has(42) &&
      rng.has(rng.exp) &&
      ent.pat?.kind === "entry-alt" &&
      ent.exp === "55" &&
      ent.has("ALTPHASE") &&
      ent.has(55) &&
      ent.has(ent.exp) &&
      bill.pat?.kind === "bill-pipeline" &&
      bill.exp === "69.44" &&
      bill.has(1000) &&
      bill.has(69.44) &&
      bill.has(bill.exp),
    reason: `port=${port.pat?.kind}/${port.exp} key=${key.pat?.kind}/${key.exp} upd=${upd.pat?.kind}/${upd.exp} rng=${rng.pat?.kind}/${rng.exp} ent=${ent.pat?.kind}/${ent.exp} bill=${bill.pat?.kind}/${bill.exp}`,
  });

  // G10097 — card-pay / card-status / card-account / card-fee-schedule WebIR catalogs.
  const pay = liftOne("CARDPAY.cbl", "hub-lift:cobol-g10097-pay");
  const stat = liftOne("CARDSTAT.cbl", "hub-lift:cobol-g10097-stat");
  const accf = liftOne("CARDACCF.cbl", "hub-lift:cobol-g10097-accf");
  const schd = liftOne("CARDSCHD.cbl", "hub-lift:cobol-g10097-schd");
  results.push({
    id: "webir-emit-pattern-card-fee-catalogs",
    ok:
      pay.pat?.kind === "card-pay-option" &&
      pay.exp === "125.00" &&
      pay.has("P") &&
      pay.has(1000) &&
      pay.has(125) &&
      pay.has(pay.exp) &&
      stat.pat?.kind === "card-status-multi-rate" &&
      stat.exp === "80.00" &&
      stat.has("D") &&
      stat.has(0.055) &&
      stat.has(80) &&
      stat.has(stat.exp) &&
      accf.pat?.kind === "card-account-fee-table" &&
      accf.exp === "100.00" &&
      accf.has("A") &&
      accf.has("D") &&
      accf.has(100) &&
      accf.has(accf.exp) &&
      schd.pat?.kind === "card-fee-schedule" &&
      schd.exp === "39.00" &&
      schd.has("P") &&
      schd.has("F") &&
      schd.has(800) &&
      schd.has(39) &&
      schd.has(schd.exp),
    reason: `pay=${pay.pat?.kind}/${pay.exp} stat=${stat.pat?.kind}/${stat.exp} accf=${accf.pat?.kind}/${accf.exp} schd=${schd.pat?.kind}/${schd.exp}`,
  });

  // G10113 — no-z/OS CardDemo/bank COMPUTE peels (monthly interest / tran-type fee / withdraw).
  const intc = liftOne("CBACT04RN.cbl", "hub-lift:cobol-g10113-int");
  const tran = liftOne("CARDTRANRN.cbl", "hub-lift:cobol-g10113-tran");
  const wdrw = liftOne("BANKWDRWRN.cbl", "hub-lift:cobol-g10113-wdrw");
  results.push({
    id: "webir-emit-pattern-no-zos-card-bank",
    ok:
      intc.pat?.kind === "monthly-interest" &&
      intc.exp === "1.25" &&
      intc.has(1000) &&
      intc.has(1.5) &&
      intc.has(1200) &&
      intc.has(1.25) &&
      intc.has(intc.exp) &&
      tran.pat?.kind === "card-tran-type-fee" &&
      tran.exp === "2.50" &&
      tran.has("01") &&
      tran.has(100) &&
      tran.has(0.025) &&
      tran.has(2.5) &&
      tran.has(tran.exp) &&
      wdrw.pat?.kind === "bank-withdraw" &&
      wdrw.exp === "155.00" &&
      wdrw.has(200) &&
      wdrw.has(45) &&
      wdrw.has(155) &&
      wdrw.has(wdrw.exp),
    reason: `intc=${intc.pat?.kind}/${intc.exp} tran=${tran.pat?.kind}/${tran.exp} wdrw=${wdrw.pat?.kind}/${wdrw.exp}`,
  });

  // G10092b — licensed DFHAID/DFHBMSCA/EXTFMAP expand when operator drop present (never invent).
  const propDirs = [join(CLBS_MINI, "copybook")];
  const propExpand = expandCobolCopybooks(
    "COPY DFHAID. COPY DFHBMSCA. COPY EXTFMAP. COPY DFHATTR.",
    propDirs,
  );
  const dfhaidOnDisk = existsSync(join(CLBS_MINI, "copybook", "DFHAID.cpy"));
  const dfhbmscaOnDisk = existsSync(join(CLBS_MINI, "copybook", "DFHBMSCA.cpy"));
  const dfhattrOnDisk = existsSync(join(CLBS_MINI, "copybook", "DFHATTR.cpy"));
  results.push({
    id: "cobol-licensed-aid-expand-or-skip",
    ok:
      (!dfhaidOnDisk ? propExpand.skipped.includes("DFHAID") : propExpand.expanded.includes("DFHAID")) &&
      (!dfhbmscaOnDisk
        ? propExpand.skipped.includes("DFHBMSCA")
        : propExpand.expanded.includes("DFHBMSCA")) &&
      (!extfmapOnDisk
        ? propExpand.skipped.includes("EXTFMAP") && !propExpand.expanded.includes("EXTFMAP")
        : propExpand.expanded.includes("EXTFMAP")) &&
      (!dfhattrOnDisk
        ? propExpand.skipped.includes("DFHATTR") && !propExpand.expanded.includes("DFHATTR")
        : propExpand.expanded.includes("DFHATTR")),
    reason: `aidDisk=${dfhaidOnDisk} bmsDisk=${dfhbmscaOnDisk} extfmapDisk=${extfmapOnDisk} dfhattrDisk=${dfhattrOnDisk} expanded=${propExpand.expanded.join(",")} skipped=${propExpand.skipped.join(",")}`,
  });

  // G10087 — COPY expand for resolved in-repo books; DFHAID/CMQ* stay skipped when absent.
  const copyDirs = inferCobolCopybookDirs(
    join(CLBS_BATCH, "CKPRSTDN.cbl"),
    CLBS_MINI,
  );
  const ckprstdnSrc = existsSync(join(CLBS_BATCH, "CKPRSTDN.cbl"))
    ? readFileSync(join(CLBS_BATCH, "CKPRSTDN.cbl"), "utf8")
    : "";
  const ckprExpand = ckprstdnSrc
    ? expandCobolCopybooks(ckprstdnSrc, copyDirs)
    : null;
  const cosgnPathForExpand = join(CLBS_MINI, "online/COSGN00C.cbl");
  const cosgnSrcForExpand = existsSync(cosgnPathForExpand)
    ? readFileSync(cosgnPathForExpand, "utf8")
    : "";
  const cosgnExpand = cosgnSrcForExpand
    ? expandCobolCopybooks(cosgnSrcForExpand, [
        join(CLBS_MINI, "copybook"),
        join(CLBS_MINI, "_upstream"),
      ])
    : null;
  results.push({
    id: "cobol-copy-expand-resolved",
    ok:
      !!ckprExpand &&
      ckprExpand.expanded.includes("CKPRST") &&
      /\bCK-STATUS\b/.test(ckprExpand.source) &&
      ckprExpand.missing.length === 0 &&
      !!cosgnExpand &&
      (aidOnDisk
        ? cosgnExpand.expanded.includes("DFHAID")
        : cosgnExpand.skipped.includes("DFHAID") && !cosgnExpand.expanded.includes("DFHAID")) &&
      (bmsOnDisk
        ? cosgnExpand.expanded.includes("DFHBMSCA")
        : cosgnExpand.skipped.includes("DFHBMSCA") && !cosgnExpand.expanded.includes("DFHBMSCA")),
    reason: ckprExpand
      ? `expanded=${ckprExpand.expanded.join(",")} cosgnExpanded=${(cosgnExpand?.expanded || []).join(",")} skipped=${(cosgnExpand?.skipped || []).join(",")} missing=${ckprExpand.missing.join(",")} aidDisk=${aidOnDisk}`
      : "missing-CKPRSTDN",
  });

  // G10088 — widen emit→WebIR literals across proven pattern kinds (not CLBSMATH alone).
  const emitWidenSubjects = [
    { file: "CKPRSTRN.cbl", kind: "evaluate-phase", expected: "20" },
    { file: "SEQSUM.cbl", kind: "seq-sum", expected: "35.75" },
    { file: "EMPPAYRN.cbl", kind: "ot-weekly", expected: "446.50" },
    { file: "CKPRSTDN.cbl", kind: "literal", expected: "150" },
    { file: "PORTFLIODN.cbl", kind: "literal", expected: "66" },
  ];
  /** @type {string[]} */
  const emitWidenOk = [];
  /** @type {string[]} */
  const emitWidenFail = [];
  for (const sub of emitWidenSubjects) {
    const p = join(CLBS_BATCH, sub.file);
    const src = existsSync(p) ? readFileSync(p, "utf8") : "";
    if (!src) {
      emitWidenFail.push(`${sub.file}:missing`);
      continue;
    }
    const pat = detectEmitPattern(src) || detectEmitPattern(expandCobolCopybooks(src, copyDirs).source);
    const exp = pat ? expectedFromPattern(pat) : null;
    const b = new webir.ModuleBuilder({ sourceApp: `hub-lift:cobol-g10088:${sub.file}` });
    const wr = webir.webRequest.builders(b);
    liftPatternRoutesFile({
      webir,
      builder: b,
      wr,
      source: src,
      file: sub.file,
      language: "cobol",
      copybookDirs: copyDirs,
      projectDir: CLBS_MINI,
    });
    const mod = b.finish();
    const litHit = [...mod.nodes.values()].some(
      (n) => n.dialect === "data" && n.op === "literal" && n.attrs?.value === sub.expected,
    );
    if (pat?.kind === sub.kind && exp === sub.expected && litHit) {
      emitWidenOk.push(`${sub.file}:${sub.kind}`);
    } else {
      emitWidenFail.push(
        `${sub.file}:kind=${pat?.kind}/exp=${exp}/lit=${litHit}`,
      );
    }
  }
  results.push({
    id: "webir-emit-pattern-literal-widen",
    ok: emitWidenFail.length === 0 && emitWidenOk.length === emitWidenSubjects.length,
    reason: `ok=${emitWidenOk.join(",")} fail=${emitWidenFail.join(",")}`,
  });

  // Sanity: buildCobolWebIrHoleAttrs exports catalog keys for online-shaped inventory.
  const cosgnPath = join(ROOT, "fixtures/hub-cobol-clbs-mini/online/COSGN00C.cbl");
  const cosgnSrc = existsSync(cosgnPath) ? readFileSync(cosgnPath, "utf8") : "";
  const cosgnInv = cosgnSrc ? inventoryCobolSource(cosgnSrc, "COSGN00C.cbl") : null;
  const cosgnAttrs = cosgnInv ? buildCobolWebIrHoleAttrs(cosgnInv) : null;
  results.push({
    id: "webir-hole-attrs-online-catalog",
    ok:
      !!cosgnAttrs &&
      Array.isArray(cosgnAttrs.unresolved) &&
      cosgnAttrs.unresolved.includes("exec-cics") &&
      Array.isArray(cosgnAttrs.execCicsOps) &&
      cosgnAttrs.execCicsOps.includes("SEND-MAP"),
    reason: cosgnAttrs
      ? `unresolved=${(cosgnAttrs.unresolved || []).join(",")} ops=${(cosgnAttrs.execCicsOps || []).join(",")}`
      : "missing-COSGN00C",
  });

  // G10098 — control/online inventory fields on WebIR hole attrs + indexed limit + SQL INCLUDE expand.
  const cardOnlnPath = join(ROOT, "fixtures/hub-cobol-clbs-mini/online/CARDONLN.cbl");
  const cardOnlnSrc = existsSync(cardOnlnPath) ? readFileSync(cardOnlnPath, "utf8") : "";
  const cardOnlnInv = cardOnlnSrc ? inventoryCobolSource(cardOnlnSrc, "CARDONLN.cbl") : null;
  const cardOnlnAttrs = cardOnlnInv ? buildCobolWebIrHoleAttrs(cardOnlnInv) : null;
  const srchCtrlInv = inventoryCobolSource(
    existsSync(join(CLBS_BATCH, "SRCHTAB.cbl"))
      ? readFileSync(join(CLBS_BATCH, "SRCHTAB.cbl"), "utf8")
      : "",
    "SRCHTAB.cbl",
  );
  const srchCtrlAttrs = buildCobolWebIrHoleAttrs(srchCtrlInv);
  const entCtrlInv = inventoryCobolSource(
    existsSync(join(CLBS_BATCH, "ENTRYRN.cbl"))
      ? readFileSync(join(CLBS_BATCH, "ENTRYRN.cbl"), "utf8")
      : "",
    "ENTRYRN.cbl",
  );
  const entCtrlAttrs = buildCobolWebIrHoleAttrs(entCtrlInv);
  results.push({
    id: "webir-hole-attrs-control-surface",
    ok:
      !!cardOnlnAttrs &&
      Number(cardOnlnAttrs.handleCondition) >= 1 &&
      Number(cardOnlnAttrs.handleAid) >= 1 &&
      Number(cosgnAttrs?.respClauses) >= 1 &&
      Array.isArray(cosgnAttrs?.procedureUsingArgs) &&
      cosgnAttrs.procedureUsingArgs.includes("DFHCOMMAREA") &&
      Number(srchCtrlAttrs.occurs) >= 1 &&
      Number(srchCtrlAttrs.search) >= 1 &&
      Array.isArray(entCtrlAttrs.entryNames) &&
      entCtrlAttrs.entryNames.includes("ALTPHASE"),
    reason: `handleC=${cardOnlnAttrs?.handleCondition} handleA=${cardOnlnAttrs?.handleAid} resp=${cosgnAttrs?.respClauses} using=${(cosgnAttrs?.procedureUsingArgs || []).join(",")} occurs=${srchCtrlAttrs?.occurs} search=${srchCtrlAttrs?.search} entry=${(entCtrlAttrs?.entryNames || []).join(",")}`,
  });

  const eqn = liftOne("IDXEQNRN.cbl", "hub-lift:cobol-g10098-eqn");
  const eqp = liftOne("IDXEQPRN.cbl", "hub-lift:cobol-g10098-eqp");
  results.push({
    id: "webir-emit-pattern-indexed-limit",
    ok:
      eqn.pat?.kind === "indexed-start-equal-next" &&
      eqn.pat?.meta?.limit === 3 &&
      eqn.has(3) &&
      eqn.has(eqn.exp) &&
      eqp.pat?.kind === "indexed-start-equal-prev" &&
      eqp.pat?.meta?.limit === 2 &&
      eqp.has(2) &&
      eqp.has(eqp.exp),
    reason: `eqn=${eqn.pat?.kind}/limit=${eqn.pat?.meta?.limit}/has3=${eqn.has(3)} eqp=${eqp.pat?.kind}/limit=${eqp.pat?.meta?.limit}/has2=${eqp.has(2)}`,
  });

  const sqlinvExpandPath = join(CLBS_BATCH, "SQLINV00.cbl");
  const sqlinvExpandSrc = existsSync(sqlinvExpandPath)
    ? readFileSync(sqlinvExpandPath, "utf8")
    : "";
  const sqlinvExpand = sqlinvExpandSrc
    ? expandCobolCopybooks(sqlinvExpandSrc, [join(CLBS_MINI, "copybook")])
    : null;
  results.push({
    id: "cobol-sql-include-expand-resolved",
    ok:
      !!sqlinvExpand &&
      sqlinvExpand.expanded.includes("SQLCA") &&
      /\*>\s*BEGIN-COPY\s+SQLCA\b/i.test(sqlinvExpand.source) &&
      /\b01\s+SQLCA\b/i.test(sqlinvExpand.source) &&
      !/\bEXEC\s+SQL\s+INCLUDE\s+SQLCA\s+END-EXEC\b/i.test(sqlinvExpand.source) &&
      sqlinvExpand.missing.length === 0,
    reason: sqlinvExpand
      ? `expanded=${sqlinvExpand.expanded.join(",")} missing=${sqlinvExpand.missing.join(",")}`
      : "missing-SQLINV00",
  });

  // G10099 — CICS FILE/QUEUE literal catalogs + BMS crosswalk on hole attrs.
  const inqOnlnPath = join(CLBS_ONLINE, "INQONLN.cbl");
  const inqSrcG99 = existsSync(inqOnlnPath) ? readFileSync(inqOnlnPath, "utf8") : "";
  const inqInvG99 = inqSrcG99 ? inventoryCobolSource(inqSrcG99, "INQONLN.cbl") : null;
  const cardFilesInv = cardOnlnInv;
  const portOnlnPath = join(CLBS_ONLINE, "PORTONLN.cbl");
  const portSrcG99 = existsSync(portOnlnPath) ? readFileSync(portOnlnPath, "utf8") : "";
  const portInvG99 = portSrcG99 ? inventoryCobolSource(portSrcG99, "PORTONLN.cbl") : null;
  const corptOnlnPath = join(CLBS_ONLINE, "CORPT00C.cbl");
  const corptSrcG99 = existsSync(corptOnlnPath) ? readFileSync(corptOnlnPath, "utf8") : "";
  const corptInvG99 = corptSrcG99 ? inventoryCobolSource(corptSrcG99, "CORPT00C.cbl") : null;
  const cardFileAttrs = cardFilesInv ? buildCobolWebIrHoleAttrs(cardFilesInv) : null;
  const inqFileAttrs = inqInvG99 ? buildCobolWebIrHoleAttrs(inqInvG99) : null;
  const portQAttrs = portInvG99 ? buildCobolWebIrHoleAttrs(portInvG99) : null;
  const corptQAttrs = corptInvG99 ? buildCobolWebIrHoleAttrs(corptInvG99) : null;
  results.push({
    id: "webir-hole-attrs-cics-file-queue",
    ok:
      !!cardFileAttrs &&
      Array.isArray(cardFileAttrs.execCicsFiles) &&
      cardFileAttrs.execCicsFiles.includes("ACCTDAT") &&
      cardFileAttrs.execCicsFiles.includes("TRANSACT") &&
      !!inqFileAttrs &&
      Array.isArray(inqFileAttrs.execCicsFiles) &&
      inqFileAttrs.execCicsFiles.includes("PORTFILE") &&
      inqFileAttrs.execCicsFiles.includes("HISTFILE") &&
      Array.isArray(inqFileAttrs.execCicsQueues) &&
      inqFileAttrs.execCicsQueues.includes("INQTMP") &&
      Array.isArray(inqFileAttrs.execCicsTsQueues) &&
      inqFileAttrs.execCicsTsQueues.includes("INQTMP") &&
      !!portQAttrs &&
      Array.isArray(portQAttrs.execCicsQueues) &&
      portQAttrs.execCicsQueues.includes("PORTTMP") &&
      !!corptQAttrs &&
      Array.isArray(corptQAttrs.execCicsQueues) &&
      corptQAttrs.execCicsQueues.includes("JOBS") &&
      Array.isArray(corptQAttrs.execCicsTdQueues) &&
      corptQAttrs.execCicsTdQueues.includes("JOBS"),
    reason: `cardFiles=${(cardFileAttrs?.execCicsFiles || []).join(",")} inqTs=${(inqFileAttrs?.execCicsTsQueues || []).join(",")} portQ=${(portQAttrs?.execCicsQueues || []).join(",")} corptTd=${(corptQAttrs?.execCicsTdQueues || []).join(",")}`,
  });

  // G10100 — SELECT ASSIGN + CALL/ACCEPT/DISPLAY catalogs + LINK/XCTL crosswalk + residual P0 gate.
  const cbactPath = join(CLBS_BATCH, "CBACT01C.cbl");
  const cbactSrc = existsSync(cbactPath) ? readFileSync(cbactPath, "utf8") : "";
  const cbactInv = cbactSrc ? inventoryCobolSource(cbactSrc, "CBACT01C.cbl") : null;
  const cbactAttrs = cbactInv ? buildCobolWebIrHoleAttrs(cbactInv) : null;
  const cbpaupPath = join(CLBS_MINI, "_upstream/CBPAUP0C.cbl");
  const cbpaupSrc = existsSync(cbpaupPath) ? readFileSync(cbpaupPath, "utf8") : "";
  const cbpaupInv = cbpaupSrc ? inventoryCobolSource(cbpaupSrc, "CBPAUP0C.cbl") : null;
  const cbpaupAttrs = cbpaupInv ? buildCobolWebIrHoleAttrs(cbpaupInv) : null;
  const coacctPath = join(CLBS_MINI, "_upstream/COACCT01.cbl");
  const coacctSrc = existsSync(coacctPath) ? readFileSync(coacctPath, "utf8") : "";
  const coacctInv = coacctSrc ? inventoryCobolSource(coacctSrc, "COACCT01.cbl") : null;
  const coacctAttrs = coacctInv ? buildCobolWebIrHoleAttrs(coacctInv) : null;
  results.push({
    id: "webir-hole-attrs-select-call-accept",
    ok:
      !!cbactAttrs &&
      Array.isArray(cbactAttrs.assignDdNames) &&
      cbactAttrs.assignDdNames.includes("ACCTFILE") &&
      Array.isArray(cbactAttrs.selectAssign) &&
      cbactAttrs.selectAssign.some((s) => s?.assign === "ACCTFILE") &&
      !!cbpaupAttrs &&
      Array.isArray(cbpaupAttrs.acceptFrom) &&
      cbpaupAttrs.acceptFrom.includes("DATE") &&
      cbpaupAttrs.acceptFrom.includes("SYSIN") &&
      Array.isArray(cbpaupAttrs.displayLiterals) &&
      cbpaupAttrs.displayLiterals.length >= 1 &&
      !!coacctAttrs &&
      Array.isArray(coacctAttrs.callTargets) &&
      coacctAttrs.callTargets.includes("MQOPEN"),
    reason: `assign=${(cbactAttrs?.assignDdNames || []).join(",")} accept=${(cbpaupAttrs?.acceptFrom || []).join(",")} dispN=${(cbpaupAttrs?.displayLiterals || []).length} calls=${(coacctAttrs?.callTargets || []).slice(0, 6).join(",")}`,
  });

  /** @type {string[]} */
  const treeProgramIds = [];
  for (const dir of [CLBS_ONLINE, join(CLBS_MINI, "_upstream"), CLBS_BATCH]) {
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir).filter((n) => /\.cbl$/i.test(n))) {
      const invP = inventoryCobolSource(readFileSync(join(dir, name), "utf8"), name);
      treeProgramIds.push(...(invP.programIds || []));
    }
  }
  const cardLinkXwalk = crosswalkOnlineCicsPrograms(
    {
      link: cardOnlnInv?.execCicsLinkPrograms || [],
      xctl: cardOnlnInv?.execCicsXctlPrograms || [],
    },
    treeProgramIds,
  );
  const corptLinkXwalk = crosswalkOnlineCicsPrograms(
    {
      link: corptInvG99?.execCicsLinkPrograms || [],
      xctl: corptInvG99?.execCicsXctlPrograms || [],
    },
    treeProgramIds,
  );
  const cardLinkAttrs = cardOnlnInv
    ? buildCobolWebIrHoleAttrs(cardOnlnInv, cardLinkXwalk)
    : null;
  const corptLinkAttrs = corptInvG99
    ? buildCobolWebIrHoleAttrs(corptInvG99, corptLinkXwalk)
    : null;
  results.push({
    id: "webir-hole-attrs-cics-link-crosswalk",
    ok:
      !!cardLinkAttrs &&
      Array.isArray(cardLinkAttrs.cicsLinkMatched) &&
      cardLinkAttrs.cicsLinkMatched.includes("CORPT00C") &&
      cardLinkAttrs.cicsLinkMatched.includes("COTRN00C") &&
      Array.isArray(cardLinkAttrs.cicsLinkHole) &&
      !!corptLinkAttrs &&
      Array.isArray(corptLinkAttrs.cicsXctlMatched) &&
      corptLinkAttrs.cicsXctlMatched.includes("COMEN01C"),
    reason: `cardLinkOk=${(cardLinkAttrs?.cicsLinkMatched || []).slice(0, 8).join(",")} cardLinkHoleN=${(cardLinkAttrs?.cicsLinkHole || []).length} corptXctl=${(corptLinkAttrs?.cicsXctlMatched || []).join(",")}`,
  });

  const idxAlt = liftOne("IDXALTRN.cbl", "hub-lift:cobol-g10100-idxalt");
  const idxDel = liftOne("IDXDELRN.cbl", "hub-lift:cobol-g10100-idxdel");
  const idxRw = liftOne("IDXSTRWR.cbl", "hub-lift:cobol-g10100-idxrw");
  results.push({
    id: "webir-emit-pattern-indexed-family-widen",
    ok:
      idxAlt.pat?.kind === "indexed-alt-key-read" &&
      idxAlt.has(idxAlt.exp) &&
      idxDel.pat?.kind === "indexed-delete" &&
      idxDel.has(idxDel.exp) &&
      idxRw.pat?.kind === "indexed-start-rewrite" &&
      idxRw.has(idxRw.exp),
    reason: `alt=${idxAlt.pat?.kind}/${idxAlt.exp} del=${idxDel.pat?.kind}/${idxDel.exp} rw=${idxRw.pat?.kind}/${idxRw.exp}`,
  });

  const upstreamBmsDir = join(CLBS_MINI, "_upstream");
  /** @type {string[]} */
  const bmsMaps = [];
  /** @type {string[]} */
  const bmsMapsets = [];
  if (existsSync(upstreamBmsDir)) {
    for (const name of readdirSync(upstreamBmsDir).filter((n) => /\.bms$/i.test(n))) {
      const invB = inventoryBmsSource(
        readFileSync(join(upstreamBmsDir, name), "utf8"),
        name,
      );
      bmsMaps.push(...(invB.maps || []));
      bmsMapsets.push(...(invB.mapsets || []));
    }
  }
  const inqXwalk = crosswalkOnlineBmsMaps(
    {
      maps: inqInvG99?.execCicsMaps || [],
      mapsets: inqInvG99?.execCicsMapsets || [],
    },
    { maps: bmsMaps, mapsets: bmsMapsets },
  );
  const inqXwalkAttrs = inqInvG99
    ? buildCobolWebIrHoleAttrs(inqInvG99, inqXwalk)
    : null;
  const cosgnXwalk = crosswalkOnlineBmsMaps(
    {
      maps: cosgnInv?.execCicsMaps || [],
      mapsets: cosgnInv?.execCicsMapsets || [],
    },
    { maps: bmsMaps, mapsets: bmsMapsets },
  );
  const cosgnXwalkAttrs = cosgnInv
    ? buildCobolWebIrHoleAttrs(cosgnInv, cosgnXwalk)
    : null;
  results.push({
    id: "webir-hole-attrs-bms-crosswalk",
    ok:
      !!inqXwalkAttrs &&
      Array.isArray(inqXwalkAttrs.bmsMapHole) &&
      inqXwalkAttrs.bmsMapHole.includes("INQMAP") &&
      inqXwalkAttrs.bmsMapHole.includes("INQMNU") &&
      !!cosgnXwalkAttrs &&
      Array.isArray(cosgnXwalkAttrs.bmsMapMatched) &&
      (cosgnXwalkAttrs.bmsMapMatched.includes("COSGN0A") ||
        cosgnXwalkAttrs.bmsMapMatched.includes("COSGN00")) &&
      Array.isArray(cosgnXwalkAttrs.bmsMapsetMatched) &&
      cosgnXwalkAttrs.bmsMapsetMatched.length >= 1,
    reason: `inqHole=${(inqXwalkAttrs?.bmsMapHole || []).join(",")} cosgnMatch=${(cosgnXwalkAttrs?.bmsMapMatched || []).join(",")} cosgnSet=${(cosgnXwalkAttrs?.bmsMapsetMatched || []).join(",")}`,
  });

  // G10089–G10090: COBOL site-inventory adapter + residual ledger (inventory-first).
  const clbsAdapter = detectOriginAdapter(CLBS_MINI);
  const residual = buildCobolResidualLedger(CLBS_MINI);
  const residualIds = new Set((residual.items || []).map((i) => i.id));
  results.push({
    id: "cobol-site-inventory-adapter",
    ok: clbsAdapter?.name === "cobol",
    reason: `adapter=${clbsAdapter?.name ?? "none"}`,
  });
  results.push({
    id: "cobol-residual-ledger",
    ok:
      residual?.kind === "chrysalis.cobol.residual.v1" &&
      residualIds.has("copy:DFHAID") &&
      residualIds.has("op:exec-cics") &&
      (residual.summary?.byPriority?.P0 ?? 0) >= 1 &&
      (residual.summary?.byPriority?.P1 ?? 0) >= 1,
    reason: residual
      ? `items=${residual.summary?.itemCount} P0=${residual.summary?.byPriority?.P0} P1=${residual.summary?.byPriority?.P1} ids=${[...residualIds].slice(0, 12).join(",")}`
      : "missing-ledger",
  });
  const residualP0Open = (residual.items || []).filter(
    (i) => i.priority === "P0" && i.status === "open",
  );
  const residualP0Absent = (residual.items || []).filter(
    (i) => i.priority === "P0" && i.status === "absent",
  );
  const residualMissingWithFiles = (residual.items || []).filter(
    (i) =>
      String(i.id).startsWith("missing-copy:") &&
      Array.isArray(i.files) &&
      i.files.length >= 1,
  );
  const extfmapSole =
    (residualP0Open.length === 1 &&
      residualP0Open[0]?.id === "copy:EXTFMAP") ||
    (residualP0Open.length === 0 &&
      residualP0Absent.length === 1 &&
      residualP0Absent[0]?.id === "copy:EXTFMAP");
  results.push({
    id: "cobol-residual-p0-extfmap-only",
    ok:
      extfmapSole &&
      residualIds.has("copy:DFHAID") &&
      (residual.items || []).find((i) => i.id === "copy:DFHAID")?.status === "closed" &&
      residualMissingWithFiles.length >= 1,
    reason: `p0Open=${residualP0Open.map((i) => i.id).join(",")} p0Absent=${residualP0Absent.map((i) => i.id).join(",")} missingWithFiles=${residualMissingWithFiles.length}`,
  });

  // G10101 — HANDLE CONDITION names + STRING/OPEN catalogs + JCL PGM↔PROGRAM-ID crosswalk.
  const coactupPath = join(CLBS_ONLINE, "COACTUPC.cbl");
  const coactupSrc = existsSync(coactupPath) ? readFileSync(coactupPath, "utf8") : "";
  const coactupInv = coactupSrc ? inventoryCobolSource(coactupSrc, "COACTUPC.cbl") : null;
  const coactupAttrs = coactupInv ? buildCobolWebIrHoleAttrs(coactupInv) : null;
  const copausPath = join(CLBS_MINI, "_upstream/COPAUS0C.cbl");
  const copausSrc = existsSync(copausPath) ? readFileSync(copausPath, "utf8") : "";
  const copausInv = copausSrc ? inventoryCobolSource(copausSrc, "COPAUS0C.cbl") : null;
  const copausAttrs = copausInv ? buildCobolWebIrHoleAttrs(copausInv) : null;
  results.push({
    id: "webir-hole-attrs-handle-string-open",
    ok:
      !!coactupAttrs &&
      Array.isArray(coactupAttrs.handleConditionNames) &&
      coactupAttrs.handleConditionNames.includes("ERROR") &&
      coactupAttrs.handleConditionNames.includes("NOTFND") &&
      Array.isArray(coactupAttrs.handleConditionTargets) &&
      coactupAttrs.handleConditionTargets.some(
        (t) => t?.condition === "ERROR" && t?.paragraph === "P900-ABEND",
      ) &&
      !!cbactAttrs &&
      Array.isArray(cbactAttrs.openModes) &&
      cbactAttrs.openModes.includes("INPUT") &&
      cbactAttrs.openModes.includes("OUTPUT") &&
      !!copausAttrs &&
      Number(copausAttrs.stringOps) >= 1,
    reason: `handle=${(coactupAttrs?.handleConditionNames || []).join(",")} open=${(cbactAttrs?.openModes || []).join(",")} stringOps=${copausAttrs?.stringOps}`,
  });

  /** @type {string[]} */
  const allJclPgms = [];
  const upstreamJclDirG101 = join(CLBS_MINI, "_upstream");
  if (existsSync(upstreamJclDirG101)) {
    for (const name of readdirSync(upstreamJclDirG101).filter((n) =>
      /\.jcl$/i.test(n),
    )) {
      allJclPgms.push(
        ...parseJclExecPrograms(
          readFileSync(join(upstreamJclDirG101, name), "utf8"),
        ),
      );
    }
  }
  const jclXwalk = crosswalkJclPrograms(allJclPgms, treeProgramIds);
  const jclAttrs = buildCobolWebIrHoleAttrs(
    { unresolved: [] },
    jclXwalk,
  );
  results.push({
    id: "webir-hole-attrs-jcl-pgm-crosswalk",
    ok:
      Array.isArray(jclAttrs.jclPgmMatched) &&
      jclAttrs.jclPgmMatched.includes("PORTADD") &&
      jclAttrs.jclPgmMatched.includes("CBEXPORT") &&
      Array.isArray(jclAttrs.jclPgmHole) &&
      jclAttrs.jclPgmHole.includes("IDCAMS") &&
      jclAttrs.jclPgmHole.includes("IKJEFT01"),
    reason: `matched=${(jclAttrs.jclPgmMatched || []).slice(0, 8).join(",")} hole=${(jclAttrs.jclPgmHole || []).join(",")}`,
  });

  // G10102 — HANDLE AID/ABEND + ORGANIZATION/FD/INVALID KEY catalogs.
  const cardAidAttrs = cardOnlnInv ? buildCobolWebIrHoleAttrs(cardOnlnInv) : null;
  const idxProbePath = join(CLBS_BATCH, "IDXPROBE.cbl");
  const idxProbeSrc = existsSync(idxProbePath) ? readFileSync(idxProbePath, "utf8") : "";
  const idxProbeInv = idxProbeSrc
    ? inventoryCobolSource(idxProbeSrc, "IDXPROBE.cbl")
    : null;
  const idxProbeAttrs = idxProbeInv ? buildCobolWebIrHoleAttrs(idxProbeInv) : null;
  const cbactOrgAttrs = cbactInv ? buildCobolWebIrHoleAttrs(cbactInv) : null;
  results.push({
    id: "webir-hole-attrs-handle-aid-org-fd",
    ok:
      !!cardAidAttrs &&
      Array.isArray(cardAidAttrs.handleAidNames) &&
      cardAidAttrs.handleAidNames.includes("ENTER") &&
      cardAidAttrs.handleAidNames.includes("PF3") &&
      Array.isArray(cardAidAttrs.handleAidTargets) &&
      cardAidAttrs.handleAidTargets.some(
        (t) => t?.aid === "ENTER" && t?.paragraph === "P100-PROCESS",
      ) &&
      Array.isArray(cardAidAttrs.handleAbendLabels) &&
      cardAidAttrs.handleAbendLabels.includes("P900-ABEND") &&
      !!idxProbeAttrs &&
      Array.isArray(idxProbeAttrs.organizations) &&
      idxProbeAttrs.organizations.includes("INDEXED") &&
      Array.isArray(idxProbeAttrs.fdNames) &&
      idxProbeAttrs.fdNames.includes("IDX-FILE") &&
      Number(idxProbeAttrs.invalidKey) >= 1 &&
      !!cbactOrgAttrs &&
      Array.isArray(cbactOrgAttrs.organizations) &&
      (cbactOrgAttrs.organizations.includes("INDEXED") ||
        cbactOrgAttrs.organizations.includes("SEQUENTIAL")),
    reason: `aid=${(cardAidAttrs?.handleAidNames || []).join(",")} abend=${(cardAidAttrs?.handleAbendLabels || []).join(",")} org=${(idxProbeAttrs?.organizations || []).join(",")} fd=${(idxProbeAttrs?.fdNames || []).join(",")} invKey=${idxProbeAttrs?.invalidKey}`,
  });

  // G10103 — SQL cursor names + JCL DD↔ASSIGN crosswalk.
  const cotrtlicG103Path = join(CLBS_ONLINE, "COTRTLIC.cbl");
  const cotrtlicG103Src = existsSync(cotrtlicG103Path)
    ? readFileSync(cotrtlicG103Path, "utf8")
    : "";
  const cotrtlicG103Inv = cotrtlicG103Src
    ? inventoryCobolSource(cotrtlicG103Src, "COTRTLIC.cbl")
    : null;
  const cotrtlicAttrs = cotrtlicG103Inv
    ? buildCobolWebIrHoleAttrs(cotrtlicG103Inv)
    : null;
  const sqlinvG103Path = join(CLBS_BATCH, "SQLINV00.cbl");
  const sqlinvG103Src = existsSync(sqlinvG103Path)
    ? readFileSync(sqlinvG103Path, "utf8")
    : "";
  const sqlinvG103Inv = sqlinvG103Src
    ? inventoryCobolSource(sqlinvG103Src, "SQLINV00.cbl")
    : null;
  const sqlinvAttrs = sqlinvG103Inv
    ? buildCobolWebIrHoleAttrs(sqlinvG103Inv)
    : null;
  /** @type {string[]} */
  const allAssignDds = [];
  for (const dir of [CLBS_ONLINE, join(CLBS_MINI, "_upstream"), CLBS_BATCH]) {
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir).filter((n) => /\.cbl$/i.test(n))) {
      const invA = inventoryCobolSource(
        readFileSync(join(dir, name), "utf8"),
        name,
      );
      allAssignDds.push(...(invA.assignDdNames || []));
    }
  }
  /** @type {string[]} */
  const allJclDds = [];
  if (existsSync(upstreamJclDirG101)) {
    for (const name of readdirSync(upstreamJclDirG101).filter((n) =>
      /\.jcl$/i.test(n),
    )) {
      allJclDds.push(
        ...parseJclDdNames(readFileSync(join(upstreamJclDirG101, name), "utf8")),
      );
    }
  }
  const jclDdXwalk = crosswalkJclDdAssign(allJclDds, allAssignDds);
  const jclDdAttrs = buildCobolWebIrHoleAttrs({ unresolved: [] }, jclDdXwalk);
  results.push({
    id: "webir-hole-attrs-sql-cursor-jcl-dd",
    ok:
      !!cotrtlicAttrs &&
      Array.isArray(cotrtlicAttrs.sqlCursorNames) &&
      cotrtlicAttrs.sqlCursorNames.includes("C-TR-TYPE-FORWARD") &&
      !!sqlinvAttrs &&
      Array.isArray(sqlinvAttrs.sqlCursorNames) &&
      sqlinvAttrs.sqlCursorNames.includes("CUR1") &&
      Array.isArray(jclDdAttrs.jclDdMatched) &&
      jclDdAttrs.jclDdMatched.includes("ACCTFILE") &&
      jclDdAttrs.jclDdMatched.includes("PORTFILE") &&
      Array.isArray(jclDdAttrs.jclDdHole) &&
      jclDdAttrs.jclDdHole.length >= 1,
    reason: `cursors=${(cotrtlicAttrs?.sqlCursorNames || []).join(",")}+${(sqlinvAttrs?.sqlCursorNames || []).join(",")} ddOk=${(jclDdAttrs.jclDdMatched || []).slice(0, 6).join(",")} ddHoleN=${(jclDdAttrs.jclDdHole || []).length}`,
  });

  // G10104 — CICS ASSIGN options + EIB/COMMAREA symbol catalog.
  const cardAssignAttrs = cardOnlnInv
    ? buildCobolWebIrHoleAttrs(cardOnlnInv)
    : null;
  const cosgnAssignPath = join(CLBS_ONLINE, "COSGN00C.cbl");
  const cosgnAssignSrc = existsSync(cosgnAssignPath)
    ? readFileSync(cosgnAssignPath, "utf8")
    : "";
  const cosgnAssignInv = cosgnAssignSrc
    ? inventoryCobolSource(cosgnAssignSrc, "COSGN00C.cbl")
    : null;
  const cosgnAssignAttrs = cosgnAssignInv
    ? buildCobolWebIrHoleAttrs(cosgnAssignInv)
    : null;
  results.push({
    id: "webir-hole-attrs-cics-assign-eib",
    ok:
      !!cardAssignAttrs &&
      Array.isArray(cardAssignAttrs.cicsAssignOptions) &&
      cardAssignAttrs.cicsAssignOptions.includes("APPLID") &&
      Array.isArray(cardAssignAttrs.cicsEibSymbols) &&
      cardAssignAttrs.cicsEibSymbols.includes("DFHCOMMAREA") &&
      !!cosgnAssignAttrs &&
      Array.isArray(cosgnAssignAttrs.cicsAssignOptions) &&
      cosgnAssignAttrs.cicsAssignOptions.includes("APPLID") &&
      Array.isArray(cosgnAssignAttrs.cicsEibSymbols) &&
      (cosgnAssignAttrs.cicsEibSymbols.includes("EIBCALEN") ||
        cosgnAssignAttrs.cicsEibSymbols.includes("DFHCOMMAREA")),
    reason: `cardAssign=${(cardAssignAttrs?.cicsAssignOptions || []).join(",")} cardEib=${(cardAssignAttrs?.cicsEibSymbols || []).join(",")} cosgnAssign=${(cosgnAssignAttrs?.cicsAssignOptions || []).join(",")} cosgnEib=${(cosgnAssignAttrs?.cicsEibSymbols || []).join(",")}`,
  });

  // G10105 — procedure/data-division + USAGE exhaust catalogs.
  const coacctG105Path = join(CLBS_MINI, "_upstream/COACCT01.cbl");
  const coacctG105Src = existsSync(coacctG105Path)
    ? readFileSync(coacctG105Path, "utf8")
    : "";
  const coacctG105Inv = coacctG105Src
    ? inventoryCobolSource(coacctG105Src, "COACCT01.cbl")
    : null;
  const coacctG105Attrs = coacctG105Inv
    ? buildCobolWebIrHoleAttrs(coacctG105Inv)
    : null;
  const bchctlPath = join(CLBS_BATCH, "BCHCTLRN.cbl");
  const bchctlSrc = existsSync(bchctlPath) ? readFileSync(bchctlPath, "utf8") : "";
  const bchctlInv = bchctlSrc ? inventoryCobolSource(bchctlSrc, "BCHCTLRN.cbl") : null;
  const bchctlAttrs = bchctlInv ? buildCobolWebIrHoleAttrs(bchctlInv) : null;
  results.push({
    id: "webir-hole-attrs-procedure-data-usage",
    ok:
      !!coacctG105Attrs &&
      Number(coacctG105Attrs.initializeOps) >= 1 &&
      Number(coacctG105Attrs.setToTrue) >= 1 &&
      Number(coacctG105Attrs.redefines) >= 1 &&
      Array.isArray(coacctG105Attrs.usageTokens) &&
      coacctG105Attrs.usageTokens.includes("COMP-3") &&
      Number(coacctG105Attrs.goback) >= 1 &&
      !!bchctlAttrs &&
      Number(bchctlAttrs.initializeOps) >= 1,
    reason: `init=${coacctG105Attrs?.initializeOps} setTrue=${coacctG105Attrs?.setToTrue} redef=${coacctG105Attrs?.redefines} usage=${(coacctG105Attrs?.usageTokens || []).join(",")} goback=${coacctG105Attrs?.goback} bchInit=${bchctlAttrs?.initializeOps}`,
  });

  // G10106 — CICS INTO/FROM + inventory-peels-exhausted stamp.
  const cardIntoAttrs = cardOnlnInv
    ? buildCobolWebIrHoleAttrs(cardOnlnInv)
    : null;
  results.push({
    id: "webir-hole-attrs-cics-into-from",
    ok:
      !!cardIntoAttrs &&
      Array.isArray(cardIntoAttrs.cicsIntoAreas) &&
      cardIntoAttrs.cicsIntoAreas.includes("DFHCOMMAREA") &&
      Array.isArray(cardIntoAttrs.cicsFromAreas) &&
      cardIntoAttrs.cicsFromAreas.includes("DFHCOMMAREA") &&
      Number(cardIntoAttrs.lengthOf) >= 1,
    reason: `into=${(cardIntoAttrs?.cicsIntoAreas || []).join(",")} from=${(cardIntoAttrs?.cicsFromAreas || []).join(",")} lengthOf=${cardIntoAttrs?.lengthOf}`,
  });

  // G10112 — CICS control/time/storage/sync option catalogs (does not reopen exhaust stamp).
  const cardCtrlAttrs = cardOnlnInv
    ? buildCobolWebIrHoleAttrs(cardOnlnInv)
    : null;
  const inqCtrlPath = join(CLBS_ONLINE, "INQONLN.cbl");
  const inqCtrlSrc = existsSync(inqCtrlPath) ? readFileSync(inqCtrlPath, "utf8") : "";
  const inqCtrlInv = inqCtrlSrc
    ? inventoryCobolSource(inqCtrlSrc, "INQONLN.cbl")
    : null;
  const inqCtrlAttrs = inqCtrlInv ? buildCobolWebIrHoleAttrs(inqCtrlInv) : null;
  const codateCtrlPath = join(CLBS_MINI, "_upstream/CODATE01.cbl");
  const codateCtrlSrc = existsSync(codateCtrlPath)
    ? readFileSync(codateCtrlPath, "utf8")
    : "";
  const codateCtrlInv = codateCtrlSrc
    ? inventoryCobolSource(codateCtrlSrc, "CODATE01.cbl")
    : null;
  const codateCtrlAttrs = codateCtrlInv
    ? buildCobolWebIrHoleAttrs(codateCtrlInv)
    : null;
  results.push({
    id: "webir-hole-attrs-cics-control-options",
    ok:
      !!cardCtrlAttrs &&
      Array.isArray(cardCtrlAttrs.cicsReturnTransids) &&
      cardCtrlAttrs.cicsReturnTransids.includes("CB00") &&
      Array.isArray(cardCtrlAttrs.cicsReturnOptions) &&
      cardCtrlAttrs.cicsReturnOptions.includes("TRANSID") &&
      cardCtrlAttrs.cicsReturnOptions.includes("COMMAREA") &&
      Array.isArray(cardCtrlAttrs.cicsFormtimeOptions) &&
      cardCtrlAttrs.cicsFormtimeOptions.includes("ABSTIME") &&
      cardCtrlAttrs.cicsFormtimeOptions.includes("YYYYMMDD") &&
      Array.isArray(cardCtrlAttrs.cicsAsktimeOptions) &&
      cardCtrlAttrs.cicsAsktimeOptions.includes("ABSTIME") &&
      Array.isArray(cardCtrlAttrs.cicsGetmainOptions) &&
      cardCtrlAttrs.cicsGetmainOptions.includes("SET") &&
      Array.isArray(cardCtrlAttrs.cicsFreemainOptions) &&
      cardCtrlAttrs.cicsFreemainOptions.includes("DATA") &&
      Array.isArray(cardCtrlAttrs.cicsDelayOptions) &&
      cardCtrlAttrs.cicsDelayOptions.includes("INTERVAL") &&
      Array.isArray(cardCtrlAttrs.cicsInquireFiles) &&
      cardCtrlAttrs.cicsInquireFiles.includes("ACCTDAT") &&
      Array.isArray(cardCtrlAttrs.cicsAbendAbcodes) &&
      cardCtrlAttrs.cicsAbendAbcodes.includes("CDE1") &&
      Number(cardCtrlAttrs.cicsSyncpoint) >= 1 &&
      Number(cardCtrlAttrs.cicsReturnOps) >= 1 &&
      !!inqCtrlAttrs &&
      Array.isArray(inqCtrlAttrs.cicsEnqResources) &&
      inqCtrlAttrs.cicsEnqResources.length >= 1 &&
      Array.isArray(inqCtrlAttrs.cicsDeqResources) &&
      inqCtrlAttrs.cicsDeqResources.length >= 1 &&
      !!codateCtrlAttrs &&
      Array.isArray(codateCtrlAttrs.cicsRetrieveInto) &&
      codateCtrlAttrs.cicsRetrieveInto.includes("MQTM") &&
      Array.isArray(codateCtrlAttrs.cicsFormtimeOptions) &&
      codateCtrlAttrs.cicsFormtimeOptions.includes("MMDDYYYY") &&
      codateCtrlAttrs.cicsFormtimeOptions.includes("TIMESEP"),
    reason: `retTid=${(cardCtrlAttrs?.cicsReturnTransids || []).join(",")} form=${(cardCtrlAttrs?.cicsFormtimeOptions || []).join(",")} abend=${(cardCtrlAttrs?.cicsAbendAbcodes || []).join(",")} sync=${cardCtrlAttrs?.cicsSyncpoint} enq=${(inqCtrlAttrs?.cicsEnqResources || []).join(",")} retrieve=${(codateCtrlAttrs?.cicsRetrieveInto || []).join(",")}`,
  });

  // G10121 — OCCURS DEPENDING ON layout catalog (new artifact class; does not reopen G10106 exhaust).
  const odoFixDir = join(ROOT, "fixtures/hub-cobol-layout-odo");
  const odoSimplePath = join(odoFixDir, "OccursDepending1.cbl");
  const odoComplexPath = join(odoFixDir, "OccursDepending.cbl");
  const odoSimpleSrc = existsSync(odoSimplePath) ? readFileSync(odoSimplePath, "utf8") : "";
  const odoComplexSrc = existsSync(odoComplexPath) ? readFileSync(odoComplexPath, "utf8") : "";
  const odoSimpleInv = odoSimpleSrc
    ? inventoryCobolSource(odoSimpleSrc, "OccursDepending1.cbl")
    : null;
  const odoComplexInv = odoComplexSrc
    ? inventoryCobolSource(odoComplexSrc, "OccursDepending.cbl")
    : null;
  const odoSimpleAttrs = odoSimpleInv ? buildCobolWebIrHoleAttrs(odoSimpleInv) : null;
  const odoComplexAttrs = odoComplexInv ? buildCobolWebIrHoleAttrs(odoComplexInv) : null;
  results.push({
    id: "webir-hole-attrs-occurs-depending",
    ok:
      !!odoSimpleAttrs &&
      Number(odoSimpleAttrs.odo) >= 2 &&
      Array.isArray(odoSimpleAttrs.dependingOnNames) &&
      odoSimpleAttrs.dependingOnNames.includes("MONTHS") &&
      odoSimpleAttrs.dependingOnNames.includes("WEEK-NO") &&
      !!odoComplexAttrs &&
      Number(odoComplexAttrs.odo) >= 2 &&
      Number(odoComplexAttrs.redefines) >= 1 &&
      Array.isArray(odoComplexAttrs.dependingOnNames) &&
      odoComplexAttrs.dependingOnNames.includes("LEVEL-COUNT") &&
      odoComplexAttrs.dependingOnNames.includes("MONTHS"),
    reason: `simpleOdo=${odoSimpleAttrs?.odo} deps=${(odoSimpleAttrs?.dependingOnNames || []).join(",")} complexOdo=${odoComplexAttrs?.odo} complexRedef=${odoComplexAttrs?.redefines} complexDeps=${(odoComplexAttrs?.dependingOnNames || []).join(",")}`,
  });

  // G10122 — Level-66 RENAMES layout catalog (does not reopen G10106 exhaust).
  const renFixDir = join(ROOT, "fixtures/hub-cobol-layout-renames");
  const renRedefPath = join(renFixDir, "renames_r4_redefines.cpy");
  const renOdoPath = join(renFixDir, "renames_r5_odo.cpy");
  const renRedefSrc = existsSync(renRedefPath) ? readFileSync(renRedefPath, "utf8") : "";
  const renOdoSrc = existsSync(renOdoPath) ? readFileSync(renOdoPath, "utf8") : "";
  const renRedefInv = renRedefSrc
    ? inventoryCobolSource(renRedefSrc, "renames_r4_redefines.cpy")
    : null;
  const renOdoInv = renOdoSrc ? inventoryCobolSource(renOdoSrc, "renames_r5_odo.cpy") : null;
  const renRedefAttrs = renRedefInv ? buildCobolWebIrHoleAttrs(renRedefInv) : null;
  const renOdoAttrs = renOdoInv ? buildCobolWebIrHoleAttrs(renOdoInv) : null;
  results.push({
    id: "webir-hole-attrs-renames",
    ok:
      !!renRedefAttrs &&
      Number(renRedefAttrs.renames) >= 1 &&
      Array.isArray(renRedefAttrs.renamesNames) &&
      renRedefAttrs.renamesNames.includes("PAYMENT-INFO") &&
      Number(renRedefAttrs.redefines) >= 1 &&
      !!renOdoAttrs &&
      Number(renOdoAttrs.renames) >= 1 &&
      renOdoAttrs.renamesNames.includes("ORDER-ITEMS") &&
      Number(renOdoAttrs.odo) >= 1 &&
      Array.isArray(renOdoAttrs.dependingOnNames) &&
      renOdoAttrs.dependingOnNames.includes("ITEM-COUNT"),
    reason: `redefRen=${renRedefAttrs?.renames} names=${(renRedefAttrs?.renamesNames || []).join(",")} redef=${renRedefAttrs?.redefines} odoRen=${renOdoAttrs?.renames} odoNames=${(renOdoAttrs?.renamesNames || []).join(",")} odo=${renOdoAttrs?.odo} deps=${(renOdoAttrs?.dependingOnNames || []).join(",")}`,
  });

  /** Required exhaust surface keys on a rich online hole-attr object. */
  const exhaustKeys = [
    "execCicsOps",
    "execCicsFiles",
    "execCicsTdQueues",
    "execCicsTsQueues",
    "handleConditionNames",
    "handleAidNames",
    "handleAbendLabels",
    "cicsAssignOptions",
    "cicsEibSymbols",
    "cicsIntoAreas",
    "cicsFromAreas",
    "selectAssign",
    "callTargets",
    "acceptFrom",
    "displayLiterals",
    "organizations",
    "fdNames",
    "sqlCursorNames",
    "initializeOps",
    "setToTrue",
    "usageTokens",
    "jclPgmMatched",
    "jclDdMatched",
  ];
  const exhaustProbe = {
    ...(cardIntoAttrs || {}),
    ...(coacctG105Attrs || {}),
    ...(jclAttrs || {}),
    ...(jclDdAttrs || {}),
    ...(cotrtlicAttrs || {}),
    ...(cbactAttrs || {}),
    ...(cbpaupAttrs || {}),
    ...(coacctAttrs || {}),
    ...(inqFileAttrs || {}),
    ...(corptQAttrs || {}),
    ...(portQAttrs || {}),
  };
  const missingExhaust = exhaustKeys.filter((k) => {
    const v = exhaustProbe[k];
    if (Array.isArray(v)) return v.length < 1;
    if (typeof v === "number") return !(v > 0);
    return v == null;
  });
  results.push({
    id: "cobol-inventory-peels-exhausted",
    ok: missingExhaust.length === 0 && extfmapSole,
    reason:
      missingExhaust.length === 0
        ? `exhausted keys=${exhaustKeys.length} p0Open=${residualP0Open.map((i) => i.id).join(",")} p0Absent=${residualP0Absent.map((i) => i.id).join(",")}`
        : `missing=${missingExhaust.join(",")}`,
  });

  // G10111 — CardDemo CSD + DCLGEN structural catalogs (new artifact class; peels stay exhausted).
  const crddemomInv = existsSync(join(upstreamBmsDir, "CRDDEMOM.csd"))
    ? inventoryCsdSource(
        readFileSync(join(upstreamBmsDir, "CRDDEMOM.csd"), "utf8"),
        "CRDDEMOM.csd",
      )
    : null;
  const crddemo2Inv = existsSync(join(upstreamBmsDir, "CRDDEMO2.csd"))
    ? inventoryCsdSource(
        readFileSync(join(upstreamBmsDir, "CRDDEMO2.csd"), "utf8"),
        "CRDDEMO2.csd",
      )
    : null;
  const authDclInv = existsSync(join(CLBS_MINI, "copybook", "AUTHFRDS.dcl"))
    ? inventoryDclgenSource(
        readFileSync(join(CLBS_MINI, "copybook", "AUTHFRDS.dcl"), "utf8"),
        "AUTHFRDS.dcl",
      )
    : existsSync(join(upstreamBmsDir, "AUTHFRDS.dcl"))
      ? inventoryDclgenSource(
          readFileSync(join(upstreamBmsDir, "AUTHFRDS.dcl"), "utf8"),
          "AUTHFRDS.dcl",
        )
      : null;
  const dclTypInv = existsSync(join(upstreamBmsDir, "DCLTRTYP.dcl"))
    ? inventoryDclgenSource(
        readFileSync(join(upstreamBmsDir, "DCLTRTYP.dcl"), "utf8"),
        "DCLTRTYP.dcl",
      )
    : null;
  let siteCsd = 0;
  let siteDcl = 0;
  try {
    const { inventoryOrigin } = await import("../lib/site-inventory/cobol.mjs");
    const site = inventoryOrigin(CLBS_MINI);
    siteCsd = (site.csdInventories || []).length;
    siteDcl = (site.dclgenInventories || []).length;
  } catch {
    siteCsd = 0;
    siteDcl = 0;
  }
  const csdAllPrograms = [
    ...(crddemomInv?.programs || []),
    ...(crddemo2Inv?.programs || []),
  ];
  const csdAllMapsets = [
    ...(crddemomInv?.mapsets || []),
    ...(crddemo2Inv?.mapsets || []),
  ];
  const coacctSrcPath = existsSync(join(upstreamBmsDir, "COACCT01.cbl"))
    ? join(upstreamBmsDir, "COACCT01.cbl")
    : null;
  const coacctPid = coacctSrcPath
    ? inventoryCobolSource(readFileSync(coacctSrcPath, "utf8"), "COACCT01.cbl")
        .programIds
    : [];
  const copauSrc = ["COPAUA0C", "COPAUS0C", "COPAUS1C", "COPAUS2C", "CODATE01"]
    .map((n) => join(upstreamBmsDir, `${n}.cbl`))
    .filter((p) => existsSync(p))
    .flatMap((p) => inventoryCobolSource(readFileSync(p, "utf8"), p).programIds);
  const csdProgX = crosswalkCsdPrograms(csdAllPrograms, [
    ...coacctPid,
    ...copauSrc,
  ]);
  const csdMapX = crosswalkCsdMapsets(csdAllMapsets, bmsMapsets);
  results.push({
    id: "carddemo-csd-dclgen-structural",
    ok:
      !!crddemomInv &&
      crddemomInv.programs.includes("COACCT01") &&
      (crddemomInv.transactionPrograms || []).some(
        (l) => l.transaction === "CDRA" && l.program === "COACCT01",
      ) &&
      !!crddemo2Inv &&
      crddemo2Inv.mapsets.includes("COPAU00") &&
      (crddemo2Inv.db2Entries || []).length >= 1 &&
      csdProgX.csdProgramMatched.includes("COACCT01") &&
      csdProgX.csdProgramHole.length === 0 &&
      csdMapX.csdMapsetMatched.includes("COPAU00") &&
      !!authDclInv &&
      (authDclInv.columns || []).includes("CARD_NUM") &&
      (authDclInv.columnCount || 0) >= 20 &&
      !!dclTypInv &&
      (dclTypInv.columns || []).includes("TR_TYPE") &&
      siteCsd >= 2 &&
      siteDcl >= 2,
    reason: `csdProg=${csdProgX.csdProgramMatched.join(",")} map=${csdMapX.csdMapsetMatched.join(",")} authCols=${authDclInv?.columnCount ?? 0} siteCsd=${siteCsd} siteDcl=${siteDcl}`,
  });

  const targets = [...BEST_FIT_TARGETS, ...CONTROL_TARGETS];
  for (const emitTarget of targets) {
    for (const id of suiteIdsFor(emitTarget)) {
      const suites = resolveGoldSuites(id);
      if (!suites.length) {
        results.push({ id, ok: false, reason: "suite-missing" });
        continue;
      }
      const r = await runGoldVerifySuite(suites[0]);
      results.push({
        id,
        ok: r.ok === true,
        reason: r.ok === true ? undefined : r.reason ?? "verify-failed",
      });
    }
  }

  for (const id of ["cobol-structured-hono-full", "cobol-middleware-hono-full"]) {
    const suites = resolveGoldSuites(id);
    if (!suites.length) {
      results.push({ id: `trace:${id}`, ok: false, reason: "suite-missing" });
      continue;
    }
    try {
      const r = await runTraceReplaySuite(suites[0]);
      results.push({
        id: `trace:${id}`,
        ok: r.ok === true || r.skipped === true,
        reason:
          r.ok === true || r.skipped === true
            ? r.skipped
              ? `skipped:${r.reason ?? "toolchain"}`
              : undefined
            : r.reason ?? "trace-failed",
        detail: { skipped: r.skipped === true, correctness: r.correctness },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const sqliteMissing =
        msg.includes("ERR_UNKNOWN_BUILTIN_MODULE") && msg.includes("node:sqlite");
      results.push({
        id: `trace:${id}`,
        ok: sqliteMissing ? true : false,
        reason: sqliteMissing
          ? "skipped:no-node-sqlite"
          : msg,
        detail: sqliteMissing
          ? { skipped: true, correctness: null }
          : undefined,
      });
    }
  }

  const failed = results.filter((r) => !r.ok);
  const ok = failed.length === 0;
  progress.end("COBOL pattern-lift best-fit prove", ok, t0);

  return {
    kind: "chrysalis.hub.cobol-best-fit-smoke",
    schemaVersion: 2,
    ok,
    lane,
    bestFitTargets: BEST_FIT_TARGETS,
    controlTargets: CONTROL_TARGETS,
    suiteCount: results.length,
    passed: results.filter((r) => r.ok).length,
    failed: failed.slice(0, 30),
    results,
    note:
      "COBOL pattern-lift depth: PROCEDURE paragraphs + honest CALL/ACCEPT/DISPLAY holes + best-fit emit/trace",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runCobolBestFitSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cobol-best-fit-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
