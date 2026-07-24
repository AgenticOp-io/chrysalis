#!/usr/bin/env node
/**
 * Run public COBOL prove/demo corpora through Chrysalis inventory + pattern-lift + optional cobc.
 *
 * Corpora (LegacyCodeBench dataset sources + CLBS):
 *   aws-carddemo, ibm-cobol-fun, cobol-course, dscobol-projects,
 *   gnucobol-examples, az-legacy-engineering, rocket-bank, CLBS
 *
 * Does NOT claim LegacyCodeBench leaderboard scores — Chrysalis inventory/lift/cobc only.
 *
 * Env:
 *   CHRYSALIS_COBOL_CORPORA_ROOT — parent dir of clones (default: ../chrysalis-cobol-corpora or $HOME/chrysalis-cobol-corpora)
 *   CHRYSALIS_COBOL_CLBS_ROOT — CLBS clone
 *   CHRYSALIS_SKIP_COBOL_CLONE=1 — inventory only, do not git clone
 *   CHRYSALIS_COBOL_COBC — cobc path
 *
 * Gate: hub:cobol-external-prove-smoke
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { inventoryCobolSource, parseCobolRoutes } from "./cobol-pattern-lift.mjs";
import { emitFromCobolPatterns } from "./cobol-pattern-emit.mjs";
import { resolveHubPython } from "./shared.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const LIFT = join(ROOT, "scripts/hub-ingest/lift-to-webir.mjs");
const MINI_BATCH = join(ROOT, "fixtures/hub-cobol-clbs-mini/batch");
const CURATED_ROOT = join(ROOT, "fixtures/hub-cobol-external-curated");

/** Gnu-friendly corpora expected to yield at least one cobc syntax-ok probe when present. */
const GNU_FRIENDLY_CORPUS_IDS = new Set([
  "gnucobol-examples",
  "ibm-cobol-fun",
  "cobol-course",
  "dscobol-projects",
]);

/**
 * Enterprise / CICS-heavy corpora — cobc green via in-repo curated probes only
 * (upstream trees stay honest holes: CICS/VSAM/JSON/COPY).
 */
const ENTERPRISE_CURATED_CORPUS_IDS = new Set([
  "aws-carddemo",
  "az-legacy-engineering",
  "rocket-bank",
]);

/**
 * Gnu-friendly corpora that prefer in-repo curated probes first so
 * cobcViaCurated=true strengthens honesty when upstream COPY/fixed-form
 * fails (COURSEPROBE / DSCOBPROBE). Still ≠ claim that full clones compile.
 */
const GNU_CURATED_FIRST_CORPUS_IDS = new Set([
  "cobol-course",
  "dscobol-projects",
]);

/** Prefer these relative paths when present in a corpus clone (curated / known-good). */
const COBC_PROBE_PREFER = {
  "gnucobol-examples": ["package/src/banking.cbl"],
  "cobol-course": [
    "COBOL Programming Course #4 - Testing/Labs/cbl/EMPPAY.CBL",
    "COBOL Programming Course #4 - Testing/Labs/cbl/DEPTPAY.CBL",
  ],
  "dscobol-projects": ["Mainframe/MVS/herc03/cbl/hello.cbl"],
};

/** In-repo emit-ref contracts (Python run + Java/C# EXPECTED tags). */
const EMIT_REF_SUBJECTS = [
  {
    id: "clbsmath",
    expected: join(MINI_BATCH, "expected.txt"),
    py: join(MINI_BATCH, "reference_emit.py"),
    java: join(MINI_BATCH, "reference_emit.java"),
    csharp: join(MINI_BATCH, "reference_emit.cs"),
  },
  {
    id: "ckprstrn",
    expected: join(MINI_BATCH, "expected-ckprstrn.txt"),
    py: join(MINI_BATCH, "reference_emit_ckprstrn.py"),
    java: join(MINI_BATCH, "reference_emit_ckprstrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_ckprstrn.cs"),
  },
  {
    id: "deptpay",
    expected: join(MINI_BATCH, "expected-deptpay.txt"),
    py: join(MINI_BATCH, "reference_emit_deptpay.py"),
    java: join(MINI_BATCH, "reference_emit_deptpay.java"),
    csharp: join(MINI_BATCH, "reference_emit_deptpay.cs"),
  },
  {
    id: "emppayrn",
    expected: join(MINI_BATCH, "expected-emppayrn.txt"),
    py: join(MINI_BATCH, "reference_emit_emppayrn.py"),
    java: join(MINI_BATCH, "reference_emit_emppayrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_emppayrn.cs"),
  },
  {
    id: "seqsum",
    expected: join(MINI_BATCH, "expected-seqsum.txt"),
    py: join(MINI_BATCH, "reference_emit_seqsum.py"),
    java: join(MINI_BATCH, "reference_emit_seqsum.java"),
    csharp: join(MINI_BATCH, "reference_emit_seqsum.cs"),
  },
  {
    id: "cardintrn",
    expected: join(MINI_BATCH, "expected-cardintrn.txt"),
    py: join(MINI_BATCH, "reference_emit_cardintrn.py"),
    java: join(MINI_BATCH, "reference_emit_cardintrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_cardintrn.cs"),
  },
  {
    id: "varysum",
    expected: join(MINI_BATCH, "expected-varysum.txt"),
    py: join(MINI_BATCH, "reference_emit_varysum.py"),
    java: join(MINI_BATCH, "reference_emit_varysum.java"),
    csharp: join(MINI_BATCH, "reference_emit_varysum.cs"),
  },
  {
    id: "nestbr",
    expected: join(MINI_BATCH, "expected-nestbr.txt"),
    py: join(MINI_BATCH, "reference_emit_nestbr.py"),
    java: join(MINI_BATCH, "reference_emit_nestbr.java"),
    csharp: join(MINI_BATCH, "reference_emit_nestbr.cs"),
  },
  {
    id: "srchtab",
    expected: join(MINI_BATCH, "expected-srchtab.txt"),
    py: join(MINI_BATCH, "reference_emit_srchtab.py"),
    java: join(MINI_BATCH, "reference_emit_srchtab.java"),
    csharp: join(MINI_BATCH, "reference_emit_srchtab.cs"),
  },
  {
    id: "evalmany",
    expected: join(MINI_BATCH, "expected-evalmany.txt"),
    py: join(MINI_BATCH, "reference_emit_evalmany.py"),
    java: join(MINI_BATCH, "reference_emit_evalmany.java"),
    csharp: join(MINI_BATCH, "reference_emit_evalmany.cs"),
  },
  {
    id: "cardfeein",
    expected: join(MINI_BATCH, "expected-cardfeein.txt"),
    py: join(MINI_BATCH, "reference_emit_cardfeein.py"),
    java: join(MINI_BATCH, "reference_emit_cardfeein.java"),
    csharp: join(MINI_BATCH, "reference_emit_cardfeein.cs"),
  },
  {
    id: "ckprusrn",
    expected: join(MINI_BATCH, "expected-ckprusrn.txt"),
    py: join(MINI_BATCH, "reference_emit_ckprusrn.py"),
    java: join(MINI_BATCH, "reference_emit_ckprusrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_ckprusrn.cs"),
  },
  {
    id: "seqmax",
    expected: join(MINI_BATCH, "expected-seqmax.txt"),
    py: join(MINI_BATCH, "reference_emit_seqmax.py"),
    java: join(MINI_BATCH, "reference_emit_seqmax.java"),
    csharp: join(MINI_BATCH, "reference_emit_seqmax.cs"),
  },
  {
    id: "entryrn",
    expected: join(MINI_BATCH, "expected-entryrn.txt"),
    py: join(MINI_BATCH, "reference_emit_entryrn.py"),
    java: join(MINI_BATCH, "reference_emit_entryrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_entryrn.cs"),
  },
  {
    id: "idxkeyrn",
    expected: join(MINI_BATCH, "expected-idxkeyrn.txt"),
    py: join(MINI_BATCH, "reference_emit_idxkeyrn.py"),
    java: join(MINI_BATCH, "reference_emit_idxkeyrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_idxkeyrn.cs"),
  },
  {
    id: "cardbill",
    expected: join(MINI_BATCH, "expected-cardbill.txt"),
    py: join(MINI_BATCH, "reference_emit_cardbill.py"),
    java: join(MINI_BATCH, "reference_emit_cardbill.java"),
    csharp: join(MINI_BATCH, "reference_emit_cardbill.cs"),
  },
  {
    id: "idxupdrn",
    expected: join(MINI_BATCH, "expected-idxupdrn.txt"),
    py: join(MINI_BATCH, "reference_emit_idxupdrn.py"),
    java: join(MINI_BATCH, "reference_emit_idxupdrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_idxupdrn.cs"),
  },
  {
    id: "cardpay",
    expected: join(MINI_BATCH, "expected-cardpay.txt"),
    py: join(MINI_BATCH, "reference_emit_cardpay.py"),
    java: join(MINI_BATCH, "reference_emit_cardpay.java"),
    csharp: join(MINI_BATCH, "reference_emit_cardpay.cs"),
  },
  {
    id: "idxrngrn",
    expected: join(MINI_BATCH, "expected-idxrngrn.txt"),
    py: join(MINI_BATCH, "reference_emit_idxrngrn.py"),
    java: join(MINI_BATCH, "reference_emit_idxrngrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_idxrngrn.cs"),
  },
  {
    id: "cardstat",
    expected: join(MINI_BATCH, "expected-cardstat.txt"),
    py: join(MINI_BATCH, "reference_emit_cardstat.py"),
    java: join(MINI_BATCH, "reference_emit_cardstat.java"),
    csharp: join(MINI_BATCH, "reference_emit_cardstat.cs"),
  },
  {
    id: "histldrn",
    expected: join(MINI_BATCH, "expected-histldrn.txt"),
    py: join(MINI_BATCH, "reference_emit_histldrn.py"),
    java: join(MINI_BATCH, "reference_emit_histldrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_histldrn.cs"),
  },
  {
    id: "idxprobe",
    expected: join(MINI_BATCH, "expected-idxprobe.txt"),
    py: join(MINI_BATCH, "reference_emit_idxprobe.py"),
    java: join(MINI_BATCH, "reference_emit_idxprobe.java"),
    csharp: join(MINI_BATCH, "reference_emit_idxprobe.cs"),
  },
  {
    id: "cardaccf",
    expected: join(MINI_BATCH, "expected-cardaccf.txt"),
    py: join(MINI_BATCH, "reference_emit_cardaccf.py"),
    java: join(MINI_BATCH, "reference_emit_cardaccf.java"),
    csharp: join(MINI_BATCH, "reference_emit_cardaccf.cs"),
  },
  {
    id: "rptposrn",
    expected: join(MINI_BATCH, "expected-rptposrn.txt"),
    py: join(MINI_BATCH, "reference_emit_rptposrn.py"),
    java: join(MINI_BATCH, "reference_emit_rptposrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_rptposrn.cs"),
  },
  {
    id: "idxaltrn",
    expected: join(MINI_BATCH, "expected-idxaltrn.txt"),
    py: join(MINI_BATCH, "reference_emit_idxaltrn.py"),
    java: join(MINI_BATCH, "reference_emit_idxaltrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_idxaltrn.cs"),
  },
  {
    id: "cardschd",
    expected: join(MINI_BATCH, "expected-cardschd.txt"),
    py: join(MINI_BATCH, "reference_emit_cardschd.py"),
    java: join(MINI_BATCH, "reference_emit_cardschd.java"),
    csharp: join(MINI_BATCH, "reference_emit_cardschd.cs"),
  },
  {
    id: "rptaurn",
    expected: join(MINI_BATCH, "expected-rptaurn.txt"),
    py: join(MINI_BATCH, "reference_emit_rptaurn.py"),
    java: join(MINI_BATCH, "reference_emit_rptaurn.java"),
    csharp: join(MINI_BATCH, "reference_emit_rptaurn.cs"),
  },
  {
    id: "idxstrwr",
    expected: join(MINI_BATCH, "expected-idxstrwr.txt"),
    py: join(MINI_BATCH, "reference_emit_idxstrwr.py"),
    java: join(MINI_BATCH, "reference_emit_idxstrwr.java"),
    csharp: join(MINI_BATCH, "reference_emit_idxstrwr.cs"),
  },
  {
    id: "rptstarn",
    expected: join(MINI_BATCH, "expected-rptstarn.txt"),
    py: join(MINI_BATCH, "reference_emit_rptstarn.py"),
    java: join(MINI_BATCH, "reference_emit_rptstarn.java"),
    csharp: join(MINI_BATCH, "reference_emit_rptstarn.cs"),
  },
  {
    id: "prcseqrn",
    expected: join(MINI_BATCH, "expected-prcseqrn.txt"),
    py: join(MINI_BATCH, "reference_emit_prcseqrn.py"),
    java: join(MINI_BATCH, "reference_emit_prcseqrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_prcseqrn.cs"),
  },
  {
    id: "idxdelrn",
    expected: join(MINI_BATCH, "expected-idxdelrn.txt"),
    py: join(MINI_BATCH, "reference_emit_idxdelrn.py"),
    java: join(MINI_BATCH, "reference_emit_idxdelrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_idxdelrn.cs"),
  },
  {
    id: "idxaltrw",
    expected: join(MINI_BATCH, "expected-idxaltrw.txt"),
    py: join(MINI_BATCH, "reference_emit_idxaltrw.py"),
    java: join(MINI_BATCH, "reference_emit_idxaltrw.java"),
    csharp: join(MINI_BATCH, "reference_emit_idxaltrw.cs"),
  },
  {
    id: "rtnanarn",
    expected: join(MINI_BATCH, "expected-rtnanarn.txt"),
    py: join(MINI_BATCH, "reference_emit_rtnanarn.py"),
    java: join(MINI_BATCH, "reference_emit_rtnanarn.java"),
    csharp: join(MINI_BATCH, "reference_emit_rtnanarn.cs"),
  },
  {
    id: "bchctlrn",
    expected: join(MINI_BATCH, "expected-bchctlrn.txt"),
    py: join(MINI_BATCH, "reference_emit_bchctlrn.py"),
    java: join(MINI_BATCH, "reference_emit_bchctlrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_bchctlrn.cs"),
  },
  {
    id: "posupdrn",
    expected: join(MINI_BATCH, "expected-posupdrn.txt"),
    py: join(MINI_BATCH, "reference_emit_posupdrn.py"),
    java: join(MINI_BATCH, "reference_emit_posupdrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_posupdrn.cs"),
  },
  {
    id: "rcvprcrn",
    expected: join(MINI_BATCH, "expected-rcvprcrn.txt"),
    py: join(MINI_BATCH, "reference_emit_rcvprcrn.py"),
    java: join(MINI_BATCH, "reference_emit_rcvprcrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_rcvprcrn.cs"),
  },
  {
    id: "rtncdern",
    expected: join(MINI_BATCH, "expected-rtncdern.txt"),
    py: join(MINI_BATCH, "reference_emit_rtncdern.py"),
    java: join(MINI_BATCH, "reference_emit_rtncdern.java"),
    csharp: join(MINI_BATCH, "reference_emit_rtncdern.cs"),
  },
  {
    id: "utlmntrn",
    expected: join(MINI_BATCH, "expected-utlmntrn.txt"),
    py: join(MINI_BATCH, "reference_emit_utlmntrn.py"),
    java: join(MINI_BATCH, "reference_emit_utlmntrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_utlmntrn.cs"),
  },
  {
    id: "utlvalrn",
    expected: join(MINI_BATCH, "expected-utlvalrn.txt"),
    py: join(MINI_BATCH, "reference_emit_utlvalrn.py"),
    java: join(MINI_BATCH, "reference_emit_utlvalrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_utlvalrn.cs"),
  },
  {
    id: "idxgtnrn",
    expected: join(MINI_BATCH, "expected-idxgtnrn.txt"),
    py: join(MINI_BATCH, "reference_emit_idxgtnrn.py"),
    java: join(MINI_BATCH, "reference_emit_idxgtnrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_idxgtnrn.cs"),
  },
  {
    id: "utlmonrn",
    expected: join(MINI_BATCH, "expected-utlmonrn.txt"),
    py: join(MINI_BATCH, "reference_emit_utlmonrn.py"),
    java: join(MINI_BATCH, "reference_emit_utlmonrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_utlmonrn.cs"),
  },
  {
    id: "tstvalrn",
    expected: join(MINI_BATCH, "expected-tstvalrn.txt"),
    py: join(MINI_BATCH, "reference_emit_tstvalrn.py"),
    java: join(MINI_BATCH, "reference_emit_tstvalrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_tstvalrn.cs"),
  },
  {
    id: "portvalrn",
    expected: join(MINI_BATCH, "expected-portvalrn.txt"),
    py: join(MINI_BATCH, "reference_emit_portvalrn.py"),
    java: join(MINI_BATCH, "reference_emit_portvalrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_portvalrn.cs"),
  },
  {
    id: "idxnlprn",
    expected: join(MINI_BATCH, "expected-idxnlprn.txt"),
    py: join(MINI_BATCH, "reference_emit_idxnlprn.py"),
    java: join(MINI_BATCH, "reference_emit_idxnlprn.java"),
    csharp: join(MINI_BATCH, "reference_emit_idxnlprn.cs"),
  },
  {
    id: "utlmntls",
    expected: join(MINI_BATCH, "expected-utlmntls.txt"),
    py: join(MINI_BATCH, "reference_emit_utlmntls.py"),
    java: join(MINI_BATCH, "reference_emit_utlmntls.java"),
    csharp: join(MINI_BATCH, "reference_emit_utlmntls.cs"),
  },
  {
    id: "tstgenrn",
    expected: join(MINI_BATCH, "expected-tstgenrn.txt"),
    py: join(MINI_BATCH, "reference_emit_tstgenrn.py"),
    java: join(MINI_BATCH, "reference_emit_tstgenrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_tstgenrn.cs"),
  },
  {
    id: "portaddrn",
    expected: join(MINI_BATCH, "expected-portaddrn.txt"),
    py: join(MINI_BATCH, "reference_emit_portaddrn.py"),
    java: join(MINI_BATCH, "reference_emit_portaddrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_portaddrn.cs"),
  },
  {
    id: "portupdrn",
    expected: join(MINI_BATCH, "expected-portupdrn.txt"),
    py: join(MINI_BATCH, "reference_emit_portupdrn.py"),
    java: join(MINI_BATCH, "reference_emit_portupdrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_portupdrn.cs"),
  },
  {
    id: "idxltprn",
    expected: join(MINI_BATCH, "expected-idxltprn.txt"),
    py: join(MINI_BATCH, "reference_emit_idxltprn.py"),
    java: join(MINI_BATCH, "reference_emit_idxltprn.java"),
    csharp: join(MINI_BATCH, "reference_emit_idxltprn.cs"),
  },
  {
    id: "portdelrn",
    expected: join(MINI_BATCH, "expected-portdelrn.txt"),
    py: join(MINI_BATCH, "reference_emit_portdelrn.py"),
    java: join(MINI_BATCH, "reference_emit_portdelrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_portdelrn.cs"),
  },
  {
    id: "portreadrn",
    expected: join(MINI_BATCH, "expected-portreadrn.txt"),
    py: join(MINI_BATCH, "reference_emit_portreadrn.py"),
    java: join(MINI_BATCH, "reference_emit_portreadrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_portreadrn.cs"),
  },
  {
    id: "porttranrn",
    expected: join(MINI_BATCH, "expected-porttranrn.txt"),
    py: join(MINI_BATCH, "reference_emit_porttranrn.py"),
    java: join(MINI_BATCH, "reference_emit_porttranrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_porttranrn.cs"),
  },
  {
    id: "idxeqprn",
    expected: join(MINI_BATCH, "expected-idxeqprn.txt"),
    py: join(MINI_BATCH, "reference_emit_idxeqprn.py"),
    java: join(MINI_BATCH, "reference_emit_idxeqprn.java"),
    csharp: join(MINI_BATCH, "reference_emit_idxeqprn.cs"),
  },
  {
    id: "portvaldn",
    expected: join(MINI_BATCH, "expected-portvaldn.txt"),
    py: join(MINI_BATCH, "reference_emit_portvaldn.py"),
    java: join(MINI_BATCH, "reference_emit_portvaldn.java"),
    csharp: join(MINI_BATCH, "reference_emit_portvaldn.cs"),
  },
  {
    id: "idxngtrn",
    expected: join(MINI_BATCH, "expected-idxngtrn.txt"),
    py: join(MINI_BATCH, "reference_emit_idxngtrn.py"),
    java: join(MINI_BATCH, "reference_emit_idxngtrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_idxngtrn.cs"),
  },
  {
    id: "portmstrn",
    expected: join(MINI_BATCH, "expected-portmstrn.txt"),
    py: join(MINI_BATCH, "reference_emit_portmstrn.py"),
    java: join(MINI_BATCH, "reference_emit_portmstrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_portmstrn.cs"),
  },
  {
    id: "portcomrn",
    expected: join(MINI_BATCH, "expected-portcomrn.txt"),
    py: join(MINI_BATCH, "reference_emit_portcomrn.py"),
    java: join(MINI_BATCH, "reference_emit_portcomrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_portcomrn.cs"),
  },
  {
    id: "idxeqnrn",
    expected: join(MINI_BATCH, "expected-idxeqnrn.txt"),
    py: join(MINI_BATCH, "reference_emit_idxeqnrn.py"),
    java: join(MINI_BATCH, "reference_emit_idxeqnrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_idxeqnrn.cs"),
  },
  {
    id: "idxnlnrn",
    expected: join(MINI_BATCH, "expected-idxnlnrn.txt"),
    py: join(MINI_BATCH, "reference_emit_idxnlnrn.py"),
    java: join(MINI_BATCH, "reference_emit_idxnlnrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_idxnlnrn.cs"),
  },
  {
    id: "idxltnrn",
    expected: join(MINI_BATCH, "expected-idxltnrn.txt"),
    py: join(MINI_BATCH, "reference_emit_idxltnrn.py"),
    java: join(MINI_BATCH, "reference_emit_idxltnrn.java"),
    csharp: join(MINI_BATCH, "reference_emit_idxltnrn.cs"),
  },
  {
    id: "idxngprn",
    expected: join(MINI_BATCH, "expected-idxngprn.txt"),
    py: join(MINI_BATCH, "reference_emit_idxngprn.py"),
    java: join(MINI_BATCH, "reference_emit_idxngprn.java"),
    csharp: join(MINI_BATCH, "reference_emit_idxngprn.cs"),
  },
];

/** @type {Array<{ id: string, url: string, dir: string, subpath?: string, shallow?: boolean }>} */
const CORPORA = [
  {
    id: "clbs",
    url: "https://github.com/sentientsergio/COBOL-Legacy-Benchmark-Suite.git",
    dir: "COBOL-Legacy-Benchmark-Suite",
  },
  {
    id: "aws-carddemo",
    url: "https://github.com/aws-samples/aws-mainframe-modernization-carddemo.git",
    dir: "aws-carddemo",
  },
  {
    id: "ibm-cobol-fun",
    url: "https://github.com/IBM/cobol-is-fun.git",
    dir: "ibm-cobol-fun",
  },
  {
    id: "cobol-course",
    url: "https://github.com/openmainframeproject/cobol-programming-course.git",
    dir: "cobol-course",
  },
  {
    id: "dscobol-projects",
    url: "https://github.com/dscobol/Cobol-Projects.git",
    dir: "dscobol-projects",
  },
  {
    id: "gnucobol-examples",
    url: "https://github.com/OlegKunitsyn/gnucobol-examples.git",
    dir: "gnucobol-examples",
  },
  {
    id: "az-legacy-engineering",
    url: "https://github.com/bhbandam/AZ-Legacy-Engineering.git",
    dir: "az-legacy-engineering",
  },
  {
    id: "rocket-bank",
    url: "https://github.com/RocketSoftwareCOBOLandMainframe/BankDemo.git",
    dir: "rocket-bank",
  },
];

/**
 * @param {string} dir
 * @param {string[]} exts
 */
function walkCobolFiles(dir, exts = [".cbl", ".cob", ".cpy", ".CBL", ".COB", ".CPY"]) {
  if (!existsSync(dir)) return [];
  /** @type {string[]} */
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur) break;
    let names;
    try {
      names = readdirSync(cur);
    } catch {
      continue;
    }
    for (const name of names) {
      if (name === ".git" || name === "node_modules") continue;
      const p = join(cur, name);
      let st;
      try {
        st = statSync(p);
      } catch {
        continue;
      }
      if (st.isDirectory()) stack.push(p);
      else if (exts.some((e) => name.endsWith(e))) out.push(p);
    }
  }
  return out.sort();
}

function defaultCorporaRoot() {
  if (process.env.CHRYSALIS_COBOL_CORPORA_ROOT) {
    return resolve(process.env.CHRYSALIS_COBOL_CORPORA_ROOT);
  }
  const sibling = resolve(ROOT, "..", "chrysalis-cobol-corpora");
  const home = process.env.HOME || process.env.USERPROFILE;
  if (home) {
    const h = join(home, "chrysalis-cobol-corpora");
    if (existsSync(h)) return h;
  }
  return sibling;
}

/**
 * @param {string} url
 * @param {string} dest
 */
function ensureClone(url, dest) {
  if (existsSync(join(dest, ".git"))) {
    return { ok: true, skipped: true };
  }
  if (process.env.CHRYSALIS_SKIP_COBOL_CLONE === "1") {
    return { ok: existsSync(dest), skipped: true, reason: "CHRYSALIS_SKIP_COBOL_CLONE" };
  }
  mkdirSync(dirname(dest), { recursive: true });
  const r = spawnSync("git", ["clone", "--depth", "1", url, dest], {
    encoding: "utf8",
    timeout: 300_000,
  });
  return {
    ok: r.status === 0 && existsSync(dest),
    skipped: false,
    reason: r.status === 0 ? undefined : (r.stderr || r.stdout || "").slice(0, 400),
  };
}

/**
 * @param {string[]} files
 * @param {string} root
 */
function sampleInventory(files, root) {
  const sampleFiles = files.slice(0, 24);
  const samples = sampleFiles.map((f) => {
    let src = "";
    try {
      src = readFileSync(f, "utf8");
    } catch {
      src = "";
    }
    const rel = f.replace(root, "").replace(/^[\\/]/, "");
    return inventoryCobolSource(src, rel);
  });
  const programIds = [...new Set(samples.flatMap((s) => s.programIds))];
  return {
    sampleCount: samples.length,
    programIds: programIds.slice(0, 40),
    copybooks: [...new Set(samples.flatMap((s) => s.copybooks))].slice(0, 40),
    execCics: samples.reduce((n, s) => n + s.execCics, 0),
    execSql: samples.reduce((n, s) => n + s.execSql, 0),
    performs: samples.reduce((n, s) => n + s.performs.length, 0),
    computes: samples.reduce((n, s) => n + s.computes, 0),
    fileIo: samples.reduce((n, s) => n + s.fileIo, 0),
    routeCount: samples.reduce((n, s) => n + s.routeCount, 0),
    evaluateTrue: samples.reduce((n, s) => n + (s.evaluateTrue || 0), 0),
    procedureUsing: samples.reduce((n, s) => n + (s.procedureUsing || 0), 0),
    entryCount: samples.reduce((n, s) => n + (s.entryCount || 0), 0),
    sectionCount: samples.reduce((n, s) => n + (s.sectionCount || 0), 0),
  };
}

/**
 * Try pattern-lift on first program-looking .cbl (not copybook).
 * @param {string[]} files
 */
function tryPatternLift(files) {
  const cand = files.find((f) => {
    const lower = f.toLowerCase();
    return lower.endsWith(".cbl") || lower.endsWith(".cob");
  });
  if (!cand || !existsSync(LIFT)) {
    return { ok: true, skipped: true, reason: "no-candidate-or-lift" };
  }
  // lift expects a fixture dir — use parent as one-file fixture via temp not available;
  // instead parse routes in-process (same as pattern-lift lane).
  let src = "";
  try {
    src = readFileSync(cand, "utf8");
  } catch {
    return { ok: false, reason: "read-failed" };
  }
  const inv = inventoryCobolSource(src, cand);
  const routes = parseCobolRoutes(src);
  return {
    ok: inv.programIds.length > 0 || routes.length > 0 || inv.looksLikeCopybook,
    file: cand,
    programIds: inv.programIds,
    routeCount: routes.length,
    unresolved: inv.unresolved.slice(0, 12),
    execCics: inv.execCics,
    execSql: inv.execSql,
  };
}

/**
 * cobc syntax/compile probe — try preferred paths, then ranked small programs,
 * then in-repo curated samples for gnu-friendly corpora.
 * @param {string[]} files
 * @param {{ corpusId?: string, corpusRoot?: string }} [opts]
 */
function tryCobcProbe(files, opts = {}) {
  const cobcBin = process.env.CHRYSALIS_COBOL_COBC || "cobc";
  const which = spawnSync(cobcBin, ["--version"], { encoding: "utf8" });
  if (which.status !== 0) {
    return { ok: true, skipped: true, reason: "no-cobc" };
  }

  /** @type {string[]} */
  const candidates = [];
  const prefer = opts.corpusId ? COBC_PROBE_PREFER[opts.corpusId] : undefined;
  if (prefer && opts.corpusRoot) {
    for (const rel of prefer) {
      const p = join(opts.corpusRoot, rel);
      if (existsSync(p)) candidates.push(p);
    }
  }

  const ranked = [...files]
    .filter((f) => /\.(cbl|cob)$/i.test(f))
    .map((f) => {
      let n = 0;
      try {
        n = readFileSync(f, "utf8").split(/\n/).length;
      } catch {
        n = 99999;
      }
      const lower = f.replace(/\\/g, "/").toLowerCase();
      // Prefer src/ programs over tests/ that COPY with relative paths.
      let rankBoost = 0;
      if (lower.includes("/tests/")) rankBoost += 1000;
      if (lower.includes("/test/")) rankBoost += 1000;
      if (lower.includes("/src/")) rankBoost -= 50;
      return { f, n, score: n + rankBoost };
    })
    .filter((x) => x.n > 5 && x.n < 250)
    .sort((a, b) => a.score - b.score);

  for (const x of ranked) {
    if (!candidates.includes(x.f)) candidates.push(x.f);
  }

  // Curated probes: enterprise + gnu curated-first prefer curated first
  // (cobcViaCurated honesty); other gnu-friendly append curated as fallback.
  if (
    opts.corpusId &&
    (GNU_FRIENDLY_CORPUS_IDS.has(opts.corpusId) ||
      ENTERPRISE_CURATED_CORPUS_IDS.has(opts.corpusId))
  ) {
    const curatedDir = join(CURATED_ROOT, opts.corpusId);
    const curatedFiles = walkCobolFiles(curatedDir);
    if (
      (ENTERPRISE_CURATED_CORPUS_IDS.has(opts.corpusId) ||
        GNU_CURATED_FIRST_CORPUS_IDS.has(opts.corpusId)) &&
      curatedFiles.length > 0
    ) {
      const rest = candidates.filter((f) => !curatedFiles.includes(f));
      candidates.length = 0;
      candidates.push(...curatedFiles, ...rest);
    } else {
      for (const f of curatedFiles) {
        if (!candidates.includes(f)) candidates.push(f);
      }
    }
  }

  if (candidates.length === 0) {
    return { ok: true, skipped: true, reason: "no-small-program" };
  }

  /** @type {Array<{ file: string, ok: boolean, reason?: string }>} */
  const attempts = [];
  for (const target of candidates.slice(0, 12)) {
    let n = 0;
    try {
      n = readFileSync(target, "utf8").split(/\n/).length;
    } catch {
      continue;
    }
    const r = spawnSync(cobcBin, ["-fsyntax-only", "-free", target], {
      encoding: "utf8",
      timeout: 60_000,
    });
    let r2 = r;
    if (r.status !== 0) {
      r2 = spawnSync(cobcBin, ["-fsyntax-only", target], {
        encoding: "utf8",
        timeout: 60_000,
      });
    }
    const ok = r2.status === 0;
    attempts.push({
      file: target,
      ok,
      reason: ok ? undefined : (r2.stderr || r2.stdout || "").slice(0, 200),
    });
    if (ok) {
      const curated = target.replace(/\\/g, "/").includes("/hub-cobol-external-curated/");
      return {
        ok: true,
        skipped: false,
        file: target,
        lines: n,
        curated,
        attempts: attempts.length,
      };
    }
  }

  return {
    ok: false,
    skipped: false,
    file: attempts[0]?.file,
    reason: attempts.map((a) => `${a.file.split(/[/\\]/).pop()}:${(a.reason || "fail").slice(0, 80)}`).join(" | ").slice(0, 400),
    attempts: attempts.length,
  };
}

export async function runCobolExternalProveSmoke() {
  const progress = createSmokeProgress("cobol-external-prove");
  const t0 = progress.start("COBOL external prove corpora");

  const corporaRoot = defaultCorporaRoot();
  mkdirSync(corporaRoot, { recursive: true });

  /** @type {Array<Record<string, unknown>>} */
  const corpora = [];
  /** @type {Array<{ id: string, ok: boolean, reason?: string }>} */
  const checks = [];

  // CLBS may live outside corpora root
  const clbsEnv = process.env.CHRYSALIS_COBOL_CLBS_ROOT
    ? resolve(process.env.CHRYSALIS_COBOL_CLBS_ROOT)
    : existsSync(resolve(ROOT, "..", "COBOL-Legacy-Benchmark-Suite"))
      ? resolve(ROOT, "..", "COBOL-Legacy-Benchmark-Suite")
      : existsSync(join(process.env.HOME || "", "COBOL-Legacy-Benchmark-Suite"))
        ? join(process.env.HOME || "", "COBOL-Legacy-Benchmark-Suite")
        : null;

  for (const c of CORPORA) {
    let dest =
      c.id === "clbs" && clbsEnv
        ? clbsEnv
        : join(corporaRoot, c.dir);

    const clone =
      c.id === "clbs" && existsSync(dest)
        ? { ok: true, skipped: true }
        : ensureClone(c.url, dest);

    if (!clone.ok && !existsSync(dest)) {
      corpora.push({
        id: c.id,
        url: c.url,
        present: false,
        clone,
      });
      checks.push({
        id: `corpus-${c.id}`,
        ok: false,
        reason: clone.reason || "missing",
      });
      continue;
    }

    const scanRoot = c.subpath ? join(dest, c.subpath) : dest;
    const files = walkCobolFiles(scanRoot);
    const inv = sampleInventory(files, dest);
    const lift = tryPatternLift(files);
    const cobc = tryCobcProbe(files, { corpusId: c.id, corpusRoot: dest });

    const structuralOk = files.length > 0 && (inv.programIds.length > 0 || inv.copybooks.length > 0 || inv.routeCount > 0);
    const row = {
      id: c.id,
      url: c.url,
      root: dest,
      present: true,
      fileCount: files.length,
      inventory: inv,
      patternLift: lift,
      cobcProbe: cobc,
      structuralOk,
    };
    corpora.push(row);

    checks.push({
      id: `corpus-${c.id}-present`,
      ok: files.length > 0,
      reason: files.length > 0 ? undefined : "zero-cobol-files",
    });
    checks.push({
      id: `corpus-${c.id}-inventory`,
      ok: structuralOk,
      reason: structuralOk
        ? undefined
        : `ids=${inv.programIds.length} routes=${inv.routeCount} files=${files.length}`,
    });
  }

  // In-repo CLBS mini + best-fit still required as Chrysalis control
  const miniBatch = join(MINI_BATCH, "CLBSMATH.cbl");
  checks.push({
    id: "in-repo-clbs-mini",
    ok: existsSync(miniBatch),
  });

  const idxvsamPath = join(MINI_BATCH, "IDXVSAM.cbl");
  const idxvsamSrc = existsSync(idxvsamPath) ? readFileSync(idxvsamPath, "utf8") : "";
  const idxvsamInv = idxvsamSrc
    ? inventoryCobolSource(idxvsamSrc, "batch/IDXVSAM.cbl")
    : null;
  checks.push({
    id: "clbs-mini-idxvsam-indexed-holes",
    ok:
      !!idxvsamInv &&
      idxvsamInv.organizationIndexed >= 1 &&
      (idxvsamInv.alternateRecordKeys || []).includes("IDX-ALT-KEY") &&
      idxvsamInv.unresolved.includes("indexed-file") &&
      idxvsamInv.unresolved.includes("alternate-record-key") &&
      idxvsamInv.unresolved.includes("invalid-key"),
    reason: idxvsamInv
      ? `unresolved=${idxvsamInv.unresolved.join(",")} alt=${(idxvsamInv.alternateRecordKeys || []).join(",")}`
      : "missing-IDXVSAM",
  });
  const idxupdrnPath = join(MINI_BATCH, "IDXUPDRN.cbl");
  const idxupdrnSrc = existsSync(idxupdrnPath) ? readFileSync(idxupdrnPath, "utf8") : "";
  const idxupdrnInv = idxupdrnSrc
    ? inventoryCobolSource(idxupdrnSrc, "batch/IDXUPDRN.cbl")
    : null;
  checks.push({
    id: "clbs-mini-idxupdrn-seq-parallel",
    ok:
      !!idxupdrnInv &&
      idxupdrnInv.programIds.includes("IDXUPDRN") &&
      idxupdrnInv.fileIo >= 1 &&
      (idxupdrnInv.organizationIndexed || 0) === 0 &&
      /\bADD\s+WS-DELTA\s+TO\s+DATA-AMT\b/i.test(idxupdrnSrc),
    reason: idxupdrnInv
      ? `fileIo=${idxupdrnInv.fileIo} indexed=${idxupdrnInv.organizationIndexed}`
      : "missing-IDXUPDRN",
  });
  const portPath = join(ROOT, "fixtures/hub-cobol-clbs-mini/online/PORTONLN.cbl");
  const portSrc = existsSync(portPath) ? readFileSync(portPath, "utf8") : "";
  const portInv = portSrc ? inventoryCobolSource(portSrc, "online/PORTONLN.cbl") : null;
  checks.push({
    id: "clbs-mini-portonln-cics-holes",
    ok:
      !!portInv &&
      portInv.programIds.includes("PORTONLN") &&
      (portInv.execCicsOps || []).includes("VERIFY") &&
      (portInv.execCicsOps || []).includes("WRITEQ") &&
      portInv.unresolved.includes("exec-cics"),
    reason: portInv
      ? `ops=${(portInv.execCicsOps || []).join(",")}`
      : "missing-PORTONLN",
  });

  /** Emit-ref + generated-pattern emit contracts — not LCB scores. */
  const py = resolveHubPython();
  /** @type {Array<{ id: string, ok: boolean, reason?: string, pattern?: string }>} */
  const emitRefs = [];
  /** @type {Array<{ id: string, ok: boolean, reason?: string, pattern?: string }>} */
  const emitGenerated = [];
  for (const s of EMIT_REF_SUBJECTS) {
    const cobPath = join(MINI_BATCH, {
      clbsmath: "CLBSMATH.cbl",
      ckprstrn: "CKPRSTRN.cbl",
      deptpay: "DEPTPAY.cbl",
      emppayrn: "EMPPAYRN.cbl",
      seqsum: "SEQSUM.cbl",
      cardintrn: "CARDINTRN.cbl",
      varysum: "VARYSUM.cbl",
      nestbr: "NESTBR.cbl",
      srchtab: "SRCHTAB.cbl",
      evalmany: "EVALMANY.cbl",
      cardfeein: "CARDFEEIN.cbl",
      ckprusrn: "CKPRUSRN.cbl",
      seqmax: "SEQMAX.cbl",
      entryrn: "ENTRYRN.cbl",
      idxkeyrn: "IDXKEYRN.cbl",
      cardbill: "CARDBILL.cbl",
      idxupdrn: "IDXUPDRN.cbl",
      cardpay: "CARDPAY.cbl",
      idxrngrn: "IDXRNGRN.cbl",
      cardstat: "CARDSTAT.cbl",
      histldrn: "HISTLDRN.cbl",
      idxprobe: "IDXPROBE.cbl",
      cardaccf: "CARDACCF.cbl",
      rptposrn: "RPTPOSRN.cbl",
      idxaltrn: "IDXALTRN.cbl",
      cardschd: "CARDSCHD.cbl",
      rptaurn: "RPTAUDRN.cbl",
      idxstrwr: "IDXSTRWR.cbl",
      rptstarn: "RPTSTARN.cbl",
      prcseqrn: "PRCSEQRN.cbl",
      idxdelrn: "IDXDELRN.cbl",
      idxaltrw: "IDXALTRW.cbl",
      rtnanarn: "RTNANARN.cbl",
      bchctlrn: "BCHCTLRN.cbl",
      posupdrn: "POSUPDRN.cbl",
      rcvprcrn: "RCVPRCRN.cbl",
      rtncdern: "RTNCDERN.cbl",
      utlmntrn: "UTLMNTRN.cbl",
      utlvalrn: "UTLVALRN.cbl",
      idxgtnrn: "IDXGTNRN.cbl",
      utlmonrn: "UTLMONRN.cbl",
      tstvalrn: "TSTVALRN.cbl",
      portvalrn: "PORTVALRN.cbl",
      idxnlprn: "IDXNLPRN.cbl",
      utlmntls: "UTLMNTLS.cbl",
      tstgenrn: "TSTGENRN.cbl",
      portaddrn: "PORTADDRN.cbl",
      portupdrn: "PORTUPDRN.cbl",
      idxltprn: "IDXLTPRN.cbl",
      portdelrn: "PORTDELRN.cbl",
      portreadrn: "PORTREADRN.cbl",
      porttranrn: "PORTTRANRN.cbl",
      idxeqprn: "IDXEQPRN.cbl",
      portvaldn: "PORTVALDN.cbl",
      idxngtrn: "IDXNGTRN.cbl",
      portmstrn: "PORTMSTRN.cbl",
      portcomrn: "PORTCOMRN.cbl",
      idxeqnrn: "IDXEQNRN.cbl",
      idxnlnrn: "IDXNLNRN.cbl",
      idxltnrn: "IDXLTNRN.cbl",
      idxngprn: "IDXNGPRN.cbl",
    }[s.id] || "");
    if (!existsSync(s.expected) || !existsSync(s.py) || !existsSync(cobPath)) {
      emitRefs.push({ id: s.id, ok: false, reason: "missing-files" });
      emitGenerated.push({ id: s.id, ok: false, reason: "missing-files" });
      continue;
    }
    const expected = readFileSync(s.expected, "utf8").trim();
    const pyRun = spawnSync(py, [s.py], { cwd: ROOT, encoding: "utf8" });
    const pyOut = (pyRun.stdout || "").trim();
    if (pyRun.status !== 0 || pyOut !== expected) {
      emitRefs.push({
        id: s.id,
        ok: false,
        reason: `py-mismatch status=${pyRun.status} out=${JSON.stringify(pyOut)}`,
      });
    } else {
      let tagOk = true;
      let tagReason;
      for (const [lang, script] of [
        ["java", s.java],
        ["csharp", s.csharp],
      ]) {
        if (!existsSync(script)) {
          tagOk = false;
          tagReason = `missing-${lang}`;
          break;
        }
        const body = readFileSync(script, "utf8");
        const tagged = /EXPECTED:\s*([0-9.]+)/.exec(body);
        if ((tagged?.[1] || "").trim() !== expected) {
          tagOk = false;
          tagReason = `${lang}-tag-mismatch`;
          break;
        }
      }
      emitRefs.push({ id: s.id, ok: tagOk, reason: tagReason });
    }

    const cobSrc = readFileSync(cobPath, "utf8");
    const genPy = emitFromCobolPatterns(cobSrc, "python", { subjectId: s.id });
    if (!genPy.ok || !genPy.code) {
      emitGenerated.push({ id: s.id, ok: false, reason: genPy.reason || "emit-failed" });
      continue;
    }
    const genDir = join(ROOT, "generated", "_cobol-pattern-emit");
    mkdirSync(genDir, { recursive: true });
    const genPyPath = join(genDir, `${s.id}.py`);
    writeFileSync(genPyPath, genPy.code);
    const genRun = spawnSync(py, [genPyPath], { cwd: ROOT, encoding: "utf8" });
    const genOut = (genRun.stdout || "").trim();
    if (genRun.status !== 0 || genOut !== expected || genPy.expected !== expected) {
      emitGenerated.push({
        id: s.id,
        ok: false,
        pattern: genPy.pattern,
        reason: `gen-py-mismatch out=${JSON.stringify(genOut)} expected=${JSON.stringify(expected)}`,
      });
      continue;
    }
    let genTagOk = true;
    let genTagReason;
    for (const lang of /** @type {const} */ (["java", "csharp"])) {
      const gen = emitFromCobolPatterns(cobSrc, lang, { subjectId: s.id });
      if (!gen.ok || !gen.code) {
        genTagOk = false;
        genTagReason = `${lang}-emit-failed`;
        break;
      }
      writeFileSync(join(genDir, `${s.id}.${lang === "csharp" ? "cs" : "java"}`), gen.code);
      const tagged = /EXPECTED:\s*([0-9.]+)/.exec(gen.code);
      if ((tagged?.[1] || "").trim() !== expected) {
        genTagOk = false;
        genTagReason = `${lang}-gen-tag-mismatch`;
        break;
      }
    }
    emitGenerated.push({
      id: s.id,
      ok: genTagOk,
      pattern: genPy.pattern,
      reason: genTagReason,
    });
  }
  const emitRefsOk = emitRefs.every((r) => r.ok);
  checks.push({
    id: "emit-ref-contracts",
    ok: emitRefsOk,
    reason: emitRefsOk
      ? undefined
      : emitRefs
          .filter((r) => !r.ok)
          .map((r) => `${r.id}:${r.reason}`)
          .join(","),
  });
  const emitGenOk = emitGenerated.every((r) => r.ok);
  checks.push({
    id: "emit-generated-contracts",
    ok: emitGenOk,
    reason: emitGenOk
      ? undefined
      : emitGenerated
          .filter((r) => !r.ok)
          .map((r) => `${r.id}:${r.reason}`)
          .join(","),
  });

  const clbsProve = spawnSync(
    process.execPath,
    [join(ROOT, "scripts/hub-ingest/hub-cobol-clbs-prove-smoke.mjs")],
    {
      cwd: ROOT,
      encoding: "utf8",
      env: {
        ...process.env,
        CHRYSALIS_COBOL_CLBS_ROOT: clbsEnv || process.env.CHRYSALIS_COBOL_CLBS_ROOT || "",
      },
      timeout: 180_000,
    },
  );
  let clbsProveOk = clbsProve.status === 0;
  let clbsProveDetail = undefined;
  try {
    const repPath = join(ROOT, "reports/cobol/clbs-prove.json");
    if (existsSync(repPath)) {
      const rep = JSON.parse(readFileSync(repPath, "utf8"));
      clbsProveOk = rep.ok === true;
      clbsProveDetail = {
        overallPercent: rep.scores?.overallPercent,
        behavioral: rep.scores?.behavioralFidelity?.weighted,
        behavioralGreen: rep.behavioralGreen,
        behavioralSubjects: rep.behavioralSubjects,
      };
    }
  } catch {
    /* ignore */
  }
  checks.push({
    id: "clbs-prove-smoke",
    ok: clbsProveOk,
    reason: clbsProveOk ? undefined : (clbsProve.stderr || clbsProve.stdout || "").slice(0, 400),
  });

  const present = corpora.filter((c) => c.present && (/** @type {number} */ (c.fileCount) || 0) > 0);
  checks.push({
    id: "at-least-three-external-corpora",
    ok: present.length >= 3,
    reason: present.length >= 3 ? undefined : `present=${present.length}`,
  });

  // Raise cobc bar: ≥2 gnu-friendly corpora with successful syntax probe (honest skip if no cobc).
  const cobcWhich = spawnSync(
    process.env.CHRYSALIS_COBOL_COBC || "cobc",
    ["--version"],
    { encoding: "utf8" },
  );
  const cobcAvailable = cobcWhich.status === 0;
  const cobcOkRows = corpora.filter(
    (c) =>
      GNU_FRIENDLY_CORPUS_IDS.has(/** @type {string} */ (c.id)) &&
      c.present &&
      c.cobcProbe &&
      /** @type {{ ok?: boolean, skipped?: boolean }} */ (c.cobcProbe).ok === true &&
      /** @type {{ skipped?: boolean }} */ (c.cobcProbe).skipped !== true,
  );
  const cobcBarOk = !cobcAvailable || cobcOkRows.length >= 2;
  checks.push({
    id: "cobc-bar-gnu-friendly",
    ok: cobcBarOk,
    reason: cobcAvailable
      ? cobcBarOk
        ? `cobcOk=${cobcOkRows.map((c) => c.id).join(",")}`
        : `need>=2 gnu-friendly cobc ok, got=${cobcOkRows.length}`
      : "skipped-no-cobc",
  });

  const enterpriseOkRows = corpora.filter(
    (c) =>
      ENTERPRISE_CURATED_CORPUS_IDS.has(/** @type {string} */ (c.id)) &&
      c.present &&
      c.cobcProbe &&
      /** @type {{ ok?: boolean, skipped?: boolean, curated?: boolean }} */ (c.cobcProbe).ok ===
        true &&
      /** @type {{ skipped?: boolean }} */ (c.cobcProbe).skipped !== true &&
      /** @type {{ curated?: boolean }} */ (c.cobcProbe).curated === true,
  );
  const enterpriseBarOk = !cobcAvailable || enterpriseOkRows.length >= 2;
  checks.push({
    id: "cobc-bar-enterprise-curated",
    ok: enterpriseBarOk,
    reason: cobcAvailable
      ? enterpriseBarOk
        ? `cobcViaCurated=${enterpriseOkRows.map((c) => c.id).join(",")}`
        : `need>=2 enterprise cobcViaCurated=true, got=${enterpriseOkRows.length}`
      : "skipped-no-cobc",
  });

  /** Fail enterprise claim if curated probe fixtures are missing on disk. */
  /** @type {string[]} */
  const enterpriseCuratedMissing = [];
  for (const id of ENTERPRISE_CURATED_CORPUS_IDS) {
    const curatedFiles = walkCobolFiles(join(CURATED_ROOT, id));
    if (curatedFiles.length === 0) enterpriseCuratedMissing.push(id);
  }
  const curatedFixturesOk = !cobcAvailable || enterpriseCuratedMissing.length === 0;
  checks.push({
    id: "enterprise-curated-fixtures-present",
    ok: curatedFixturesOk,
    reason: curatedFixturesOk
      ? undefined
      : `missing-curated-probes:${enterpriseCuratedMissing.join(",")}`,
  });

  /**
   * Honesty: enterprise bar green requires cobcViaCurated=true and curated
   * fixtures present (upstream CICS/VSAM/JSON must not silently green the bar).
   */
  checks.push({
    id: "enterprise-cobc-curated-provenance",
    ok: !cobcAvailable || (curatedFixturesOk && enterpriseBarOk),
    reason: cobcAvailable
      ? curatedFixturesOk && enterpriseBarOk
        ? `cobcViaCurated=${enterpriseOkRows.map((c) => c.id).join(",")}`
        : `need enterprise cobcViaCurated + curated fixtures; barOk=${enterpriseBarOk} missing=${enterpriseCuratedMissing.join(",") || "none"}`
      : "skipped-no-cobc",
  });

  const failed = checks.filter((c) => !c.ok);
  const ok = failed.length === 0;
  progress.end("COBOL external prove corpora", ok, t0);

  /** Honest scoreboard — inventory/lift/cobc only; never LCB leaderboard. */
  const scoreboard = corpora.map((c) => {
    const inv = /** @type {Record<string, unknown>} */ (c.inventory || {});
    const cobc = /** @type {Record<string, unknown>} */ (c.cobcProbe || {});
    const lift = /** @type {Record<string, unknown>} */ (c.patternLift || {});
    return {
      id: c.id,
      files: c.fileCount,
      programIds: Array.isArray(inv.programIds) ? inv.programIds.length : 0,
      cics: inv.execCics ?? 0,
      sql: inv.execSql ?? 0,
      evaluateTrue: inv.evaluateTrue ?? 0,
      procedureUsing: inv.procedureUsing ?? 0,
      liftOk: lift.ok === true,
      cobcOk: cobc.ok === true && cobc.skipped !== true,
      cobcSkipped: cobc.skipped === true,
      cobcViaCurated: cobc.curated === true,
      structuralOk: c.structuralOk === true,
    };
  });

  const report = {
    kind: "chrysalis.hub.cobol-external-prove-smoke",
    schemaVersion: 2,
    ok,
    note: "Inventory + pattern-lift + cobc bar + emit-ref contracts — not LegacyCodeBench leaderboard scores",
    corporaRoot,
    clbsRoot: clbsEnv,
    clbsProve: clbsProveDetail,
    emitRefContracts: emitRefs,
    emitGeneratedContracts: emitGenerated,
    cobcBar: {
      available: cobcAvailable,
      gnuFriendlyOk: cobcOkRows.map((c) => c.id),
      enterpriseCuratedOk: enterpriseOkRows.map((c) => c.id),
      cobcViaCurated: corpora
        .filter(
          (c) =>
            c.cobcProbe &&
            /** @type {{ curated?: boolean }} */ (c.cobcProbe).curated === true &&
            /** @type {{ ok?: boolean }} */ (c.cobcProbe).ok === true,
        )
        .map((c) => c.id),
      requiredMin: 2,
      enterpriseRequiredMin: 2,
      note: "Enterprise bar requires cobcViaCurated=true (≥2) and curated fixtures present — not a claim that full upstream trees compile under GnuCOBOL",
    },
    scoreboard,
    corpora,
    checks,
    failed: failed.slice(0, 30),
    generatedAt: new Date().toISOString(),
  };

  const outDir = join(ROOT, "reports/cobol");
  try {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "external-prove.json"), `${JSON.stringify(report, null, 2)}\n`);
  } catch {
    /* ignore */
  }

  return report;
}

async function main() {
  const r = await runCobolExternalProveSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cobol-external-prove-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
