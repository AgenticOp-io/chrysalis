#!/usr/bin/env node
/**
 * CLBS-aligned COBOL modernization prove (LegacyCodeBench-shaped 3-track score).
 *
 * Tracks: Structural Completeness 30% · Documentation Quality 20% · Behavioral Fidelity 50%
 * Corpus guide: https://github.com/sentientsergio/COBOL-Legacy-Benchmark-Suite
 * Gate: hub:cobol-clbs-prove-smoke
 *
 * Env:
 *   CHRYSALIS_COBOL_CLBS_ROOT — optional local CLBS clone (inventory extra files)
 *   CHRYSALIS_COBOL_COBC — optional path to cobc (GnuCOBOL)
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import {
  inventoryBmsSource,
  inventoryCobolSource,
  parseCobolRoutes,
  resolveCobolCopybooks,
} from "./cobol-pattern-lift.mjs";
import { emitFromCobolPatterns } from "./cobol-pattern-emit.mjs";
import { resolveHubPython } from "./shared.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const MINI = join(ROOT, "fixtures/hub-cobol-clbs-mini");

const COPYBOOK_DIR = join(MINI, "copybook");
const DFHAID_ON_DISK = existsSync(join(COPYBOOK_DIR, "DFHAID.cpy"));
const DFHBMSCA_ON_DISK = existsSync(join(COPYBOOK_DIR, "DFHBMSCA.cpy"));
const EXTFMAP_ON_DISK = existsSync(join(COPYBOOK_DIR, "EXTFMAP.cpy"));
const DFHATTR_ON_DISK = existsSync(join(COPYBOOK_DIR, "DFHATTR.cpy"));
/** Licensed IBM/MQ drop: resolved when on disk; otherwise honest unresolved hole. */
function aidCopyOk(name, resolvedNames, unresolvedNames) {
  const upper = String(name || "").toUpperCase();
  const onDisk =
    upper === "DFHAID"
      ? DFHAID_ON_DISK
      : upper === "DFHBMSCA"
        ? DFHBMSCA_ON_DISK
        : upper === "EXTFMAP"
          ? EXTFMAP_ON_DISK
          : upper === "DFHATTR"
            ? DFHATTR_ON_DISK
            : upper.startsWith("CMQ")
              ? existsSync(join(COPYBOOK_DIR, `${upper}.cpy`))
              : false;
  if (onDisk) return (resolvedNames || []).includes(upper);
  return (unresolvedNames || []).includes(upper);
}
const ONLINE = join(MINI, "online/INQONLN.cbl");
const CARDONLN = join(MINI, "online/CARDONLN.cbl");
const PORTONLN = join(MINI, "online/PORTONLN.cbl");
const BATCH = join(MINI, "batch/CLBSMATH.cbl");
const EXPECTED = join(MINI, "batch/expected.txt");
const REF_PY = join(MINI, "batch/reference_emit.py");
const UPSTREAM_CKPRST = join(MINI, "_upstream/CKPRST.cbl");
const CKPRSTRN = join(MINI, "batch/CKPRSTRN.cbl");
const DEPTPAY = join(MINI, "batch/DEPTPAY.cbl");
const EMPPAYRN = join(MINI, "batch/EMPPAYRN.cbl");
const SEQSUM = join(MINI, "batch/SEQSUM.cbl");

/** Behavioral subjects: cobc∥ + python + java/csharp EXPECTED tags */
const BEHAVIORAL_SUBJECTS = [
  {
    id: "clbsmath",
    cob: BATCH,
    expected: EXPECTED,
    py: REF_PY,
    java: join(MINI, "batch/reference_emit.java"),
    csharp: join(MINI, "batch/reference_emit.cs"),
  },
  {
    id: "ckprstrn",
    cob: CKPRSTRN,
    expected: join(MINI, "batch/expected-ckprstrn.txt"),
    py: join(MINI, "batch/reference_emit_ckprstrn.py"),
    java: join(MINI, "batch/reference_emit_ckprstrn.java"),
    csharp: join(MINI, "batch/reference_emit_ckprstrn.cs"),
  },
  {
    id: "deptpay",
    cob: DEPTPAY,
    expected: join(MINI, "batch/expected-deptpay.txt"),
    py: join(MINI, "batch/reference_emit_deptpay.py"),
    java: join(MINI, "batch/reference_emit_deptpay.java"),
    csharp: join(MINI, "batch/reference_emit_deptpay.cs"),
  },
  {
    id: "emppayrn",
    cob: EMPPAYRN,
    expected: join(MINI, "batch/expected-emppayrn.txt"),
    py: join(MINI, "batch/reference_emit_emppayrn.py"),
    java: join(MINI, "batch/reference_emit_emppayrn.java"),
    csharp: join(MINI, "batch/reference_emit_emppayrn.cs"),
  },
  {
    id: "seqsum",
    cob: SEQSUM,
    expected: join(MINI, "batch/expected-seqsum.txt"),
    py: join(MINI, "batch/reference_emit_seqsum.py"),
    java: join(MINI, "batch/reference_emit_seqsum.java"),
    csharp: join(MINI, "batch/reference_emit_seqsum.cs"),
  },
  {
    id: "cardintrn",
    cob: join(MINI, "batch/CARDINTRN.cbl"),
    expected: join(MINI, "batch/expected-cardintrn.txt"),
    py: join(MINI, "batch/reference_emit_cardintrn.py"),
    java: join(MINI, "batch/reference_emit_cardintrn.java"),
    csharp: join(MINI, "batch/reference_emit_cardintrn.cs"),
  },
  {
    id: "varysum",
    cob: join(MINI, "batch/VARYSUM.cbl"),
    expected: join(MINI, "batch/expected-varysum.txt"),
    py: join(MINI, "batch/reference_emit_varysum.py"),
    java: join(MINI, "batch/reference_emit_varysum.java"),
    csharp: join(MINI, "batch/reference_emit_varysum.cs"),
  },
  {
    id: "nestbr",
    cob: join(MINI, "batch/NESTBR.cbl"),
    expected: join(MINI, "batch/expected-nestbr.txt"),
    py: join(MINI, "batch/reference_emit_nestbr.py"),
    java: join(MINI, "batch/reference_emit_nestbr.java"),
    csharp: join(MINI, "batch/reference_emit_nestbr.cs"),
  },
  {
    id: "srchtab",
    cob: join(MINI, "batch/SRCHTAB.cbl"),
    expected: join(MINI, "batch/expected-srchtab.txt"),
    py: join(MINI, "batch/reference_emit_srchtab.py"),
    java: join(MINI, "batch/reference_emit_srchtab.java"),
    csharp: join(MINI, "batch/reference_emit_srchtab.cs"),
  },
  {
    id: "evalmany",
    cob: join(MINI, "batch/EVALMANY.cbl"),
    expected: join(MINI, "batch/expected-evalmany.txt"),
    py: join(MINI, "batch/reference_emit_evalmany.py"),
    java: join(MINI, "batch/reference_emit_evalmany.java"),
    csharp: join(MINI, "batch/reference_emit_evalmany.cs"),
  },
  {
    id: "cardfeein",
    cob: join(MINI, "batch/CARDFEEIN.cbl"),
    expected: join(MINI, "batch/expected-cardfeein.txt"),
    py: join(MINI, "batch/reference_emit_cardfeein.py"),
    java: join(MINI, "batch/reference_emit_cardfeein.java"),
    csharp: join(MINI, "batch/reference_emit_cardfeein.cs"),
  },
  {
    id: "ckprusrn",
    cob: join(MINI, "batch/CKPRUSRN.cbl"),
    expected: join(MINI, "batch/expected-ckprusrn.txt"),
    py: join(MINI, "batch/reference_emit_ckprusrn.py"),
    java: join(MINI, "batch/reference_emit_ckprusrn.java"),
    csharp: join(MINI, "batch/reference_emit_ckprusrn.cs"),
  },
  {
    id: "seqmax",
    cob: join(MINI, "batch/SEQMAX.cbl"),
    expected: join(MINI, "batch/expected-seqmax.txt"),
    py: join(MINI, "batch/reference_emit_seqmax.py"),
    java: join(MINI, "batch/reference_emit_seqmax.java"),
    csharp: join(MINI, "batch/reference_emit_seqmax.cs"),
  },
  {
    id: "entryrn",
    cob: join(MINI, "batch/ENTRYRN.cbl"),
    expected: join(MINI, "batch/expected-entryrn.txt"),
    py: join(MINI, "batch/reference_emit_entryrn.py"),
    java: join(MINI, "batch/reference_emit_entryrn.java"),
    csharp: join(MINI, "batch/reference_emit_entryrn.cs"),
  },
  {
    id: "idxkeyrn",
    cob: join(MINI, "batch/IDXKEYRN.cbl"),
    expected: join(MINI, "batch/expected-idxkeyrn.txt"),
    py: join(MINI, "batch/reference_emit_idxkeyrn.py"),
    java: join(MINI, "batch/reference_emit_idxkeyrn.java"),
    csharp: join(MINI, "batch/reference_emit_idxkeyrn.cs"),
  },
  {
    id: "cardbill",
    cob: join(MINI, "batch/CARDBILL.cbl"),
    expected: join(MINI, "batch/expected-cardbill.txt"),
    py: join(MINI, "batch/reference_emit_cardbill.py"),
    java: join(MINI, "batch/reference_emit_cardbill.java"),
    csharp: join(MINI, "batch/reference_emit_cardbill.cs"),
  },
  {
    id: "idxupdrn",
    cob: join(MINI, "batch/IDXUPDRN.cbl"),
    expected: join(MINI, "batch/expected-idxupdrn.txt"),
    py: join(MINI, "batch/reference_emit_idxupdrn.py"),
    java: join(MINI, "batch/reference_emit_idxupdrn.java"),
    csharp: join(MINI, "batch/reference_emit_idxupdrn.cs"),
  },
  {
    id: "cardpay",
    cob: join(MINI, "batch/CARDPAY.cbl"),
    expected: join(MINI, "batch/expected-cardpay.txt"),
    py: join(MINI, "batch/reference_emit_cardpay.py"),
    java: join(MINI, "batch/reference_emit_cardpay.java"),
    csharp: join(MINI, "batch/reference_emit_cardpay.cs"),
  },
  {
    id: "idxrngrn",
    cob: join(MINI, "batch/IDXRNGRN.cbl"),
    expected: join(MINI, "batch/expected-idxrngrn.txt"),
    py: join(MINI, "batch/reference_emit_idxrngrn.py"),
    java: join(MINI, "batch/reference_emit_idxrngrn.java"),
    csharp: join(MINI, "batch/reference_emit_idxrngrn.cs"),
  },
  {
    id: "cardstat",
    cob: join(MINI, "batch/CARDSTAT.cbl"),
    expected: join(MINI, "batch/expected-cardstat.txt"),
    py: join(MINI, "batch/reference_emit_cardstat.py"),
    java: join(MINI, "batch/reference_emit_cardstat.java"),
    csharp: join(MINI, "batch/reference_emit_cardstat.cs"),
  },
  {
    id: "histldrn",
    cob: join(MINI, "batch/HISTLDRN.cbl"),
    expected: join(MINI, "batch/expected-histldrn.txt"),
    py: join(MINI, "batch/reference_emit_histldrn.py"),
    java: join(MINI, "batch/reference_emit_histldrn.java"),
    csharp: join(MINI, "batch/reference_emit_histldrn.cs"),
  },
  {
    id: "idxprobe",
    cob: join(MINI, "batch/IDXPROBE.cbl"),
    expected: join(MINI, "batch/expected-idxprobe.txt"),
    py: join(MINI, "batch/reference_emit_idxprobe.py"),
    java: join(MINI, "batch/reference_emit_idxprobe.java"),
    csharp: join(MINI, "batch/reference_emit_idxprobe.cs"),
  },
  {
    id: "cardaccf",
    cob: join(MINI, "batch/CARDACCF.cbl"),
    expected: join(MINI, "batch/expected-cardaccf.txt"),
    py: join(MINI, "batch/reference_emit_cardaccf.py"),
    java: join(MINI, "batch/reference_emit_cardaccf.java"),
    csharp: join(MINI, "batch/reference_emit_cardaccf.cs"),
  },
  {
    id: "rptposrn",
    cob: join(MINI, "batch/RPTPOSRN.cbl"),
    expected: join(MINI, "batch/expected-rptposrn.txt"),
    py: join(MINI, "batch/reference_emit_rptposrn.py"),
    java: join(MINI, "batch/reference_emit_rptposrn.java"),
    csharp: join(MINI, "batch/reference_emit_rptposrn.cs"),
  },
  {
    id: "idxaltrn",
    cob: join(MINI, "batch/IDXALTRN.cbl"),
    expected: join(MINI, "batch/expected-idxaltrn.txt"),
    py: join(MINI, "batch/reference_emit_idxaltrn.py"),
    java: join(MINI, "batch/reference_emit_idxaltrn.java"),
    csharp: join(MINI, "batch/reference_emit_idxaltrn.cs"),
  },
  {
    id: "cardschd",
    cob: join(MINI, "batch/CARDSCHD.cbl"),
    expected: join(MINI, "batch/expected-cardschd.txt"),
    py: join(MINI, "batch/reference_emit_cardschd.py"),
    java: join(MINI, "batch/reference_emit_cardschd.java"),
    csharp: join(MINI, "batch/reference_emit_cardschd.cs"),
  },
  {
    id: "rptaurn",
    cob: join(MINI, "batch/RPTAUDRN.cbl"),
    expected: join(MINI, "batch/expected-rptaurn.txt"),
    py: join(MINI, "batch/reference_emit_rptaurn.py"),
    java: join(MINI, "batch/reference_emit_rptaurn.java"),
    csharp: join(MINI, "batch/reference_emit_rptaurn.cs"),
  },
  {
    id: "idxstrwr",
    cob: join(MINI, "batch/IDXSTRWR.cbl"),
    expected: join(MINI, "batch/expected-idxstrwr.txt"),
    py: join(MINI, "batch/reference_emit_idxstrwr.py"),
    java: join(MINI, "batch/reference_emit_idxstrwr.java"),
    csharp: join(MINI, "batch/reference_emit_idxstrwr.cs"),
  },
  {
    id: "rptstarn",
    cob: join(MINI, "batch/RPTSTARN.cbl"),
    expected: join(MINI, "batch/expected-rptstarn.txt"),
    py: join(MINI, "batch/reference_emit_rptstarn.py"),
    java: join(MINI, "batch/reference_emit_rptstarn.java"),
    csharp: join(MINI, "batch/reference_emit_rptstarn.cs"),
  },
  {
    id: "prcseqrn",
    cob: join(MINI, "batch/PRCSEQRN.cbl"),
    expected: join(MINI, "batch/expected-prcseqrn.txt"),
    py: join(MINI, "batch/reference_emit_prcseqrn.py"),
    java: join(MINI, "batch/reference_emit_prcseqrn.java"),
    csharp: join(MINI, "batch/reference_emit_prcseqrn.cs"),
  },
  {
    id: "idxdelrn",
    cob: join(MINI, "batch/IDXDELRN.cbl"),
    expected: join(MINI, "batch/expected-idxdelrn.txt"),
    py: join(MINI, "batch/reference_emit_idxdelrn.py"),
    java: join(MINI, "batch/reference_emit_idxdelrn.java"),
    csharp: join(MINI, "batch/reference_emit_idxdelrn.cs"),
  },
  {
    id: "idxaltrw",
    cob: join(MINI, "batch/IDXALTRW.cbl"),
    expected: join(MINI, "batch/expected-idxaltrw.txt"),
    py: join(MINI, "batch/reference_emit_idxaltrw.py"),
    java: join(MINI, "batch/reference_emit_idxaltrw.java"),
    csharp: join(MINI, "batch/reference_emit_idxaltrw.cs"),
  },
  {
    id: "rtnanarn",
    cob: join(MINI, "batch/RTNANARN.cbl"),
    expected: join(MINI, "batch/expected-rtnanarn.txt"),
    py: join(MINI, "batch/reference_emit_rtnanarn.py"),
    java: join(MINI, "batch/reference_emit_rtnanarn.java"),
    csharp: join(MINI, "batch/reference_emit_rtnanarn.cs"),
  },
  {
    id: "bchctlrn",
    cob: join(MINI, "batch/BCHCTLRN.cbl"),
    expected: join(MINI, "batch/expected-bchctlrn.txt"),
    py: join(MINI, "batch/reference_emit_bchctlrn.py"),
    java: join(MINI, "batch/reference_emit_bchctlrn.java"),
    csharp: join(MINI, "batch/reference_emit_bchctlrn.cs"),
  },
  {
    id: "posupdrn",
    cob: join(MINI, "batch/POSUPDRN.cbl"),
    expected: join(MINI, "batch/expected-posupdrn.txt"),
    py: join(MINI, "batch/reference_emit_posupdrn.py"),
    java: join(MINI, "batch/reference_emit_posupdrn.java"),
    csharp: join(MINI, "batch/reference_emit_posupdrn.cs"),
  },
  {
    id: "rcvprcrn",
    cob: join(MINI, "batch/RCVPRCRN.cbl"),
    expected: join(MINI, "batch/expected-rcvprcrn.txt"),
    py: join(MINI, "batch/reference_emit_rcvprcrn.py"),
    java: join(MINI, "batch/reference_emit_rcvprcrn.java"),
    csharp: join(MINI, "batch/reference_emit_rcvprcrn.cs"),
  },
  {
    id: "rtncdern",
    cob: join(MINI, "batch/RTNCDERN.cbl"),
    expected: join(MINI, "batch/expected-rtncdern.txt"),
    py: join(MINI, "batch/reference_emit_rtncdern.py"),
    java: join(MINI, "batch/reference_emit_rtncdern.java"),
    csharp: join(MINI, "batch/reference_emit_rtncdern.cs"),
  },
  {
    id: "utlmntrn",
    cob: join(MINI, "batch/UTLMNTRN.cbl"),
    expected: join(MINI, "batch/expected-utlmntrn.txt"),
    py: join(MINI, "batch/reference_emit_utlmntrn.py"),
    java: join(MINI, "batch/reference_emit_utlmntrn.java"),
    csharp: join(MINI, "batch/reference_emit_utlmntrn.cs"),
  },
  {
    id: "utlvalrn",
    cob: join(MINI, "batch/UTLVALRN.cbl"),
    expected: join(MINI, "batch/expected-utlvalrn.txt"),
    py: join(MINI, "batch/reference_emit_utlvalrn.py"),
    java: join(MINI, "batch/reference_emit_utlvalrn.java"),
    csharp: join(MINI, "batch/reference_emit_utlvalrn.cs"),
  },
  {
    id: "idxgtnrn",
    cob: join(MINI, "batch/IDXGTNRN.cbl"),
    expected: join(MINI, "batch/expected-idxgtnrn.txt"),
    py: join(MINI, "batch/reference_emit_idxgtnrn.py"),
    java: join(MINI, "batch/reference_emit_idxgtnrn.java"),
    csharp: join(MINI, "batch/reference_emit_idxgtnrn.cs"),
  },
  {
    id: "utlmonrn",
    cob: join(MINI, "batch/UTLMONRN.cbl"),
    expected: join(MINI, "batch/expected-utlmonrn.txt"),
    py: join(MINI, "batch/reference_emit_utlmonrn.py"),
    java: join(MINI, "batch/reference_emit_utlmonrn.java"),
    csharp: join(MINI, "batch/reference_emit_utlmonrn.cs"),
  },
  {
    id: "tstvalrn",
    cob: join(MINI, "batch/TSTVALRN.cbl"),
    expected: join(MINI, "batch/expected-tstvalrn.txt"),
    py: join(MINI, "batch/reference_emit_tstvalrn.py"),
    java: join(MINI, "batch/reference_emit_tstvalrn.java"),
    csharp: join(MINI, "batch/reference_emit_tstvalrn.cs"),
  },
  {
    id: "portvalrn",
    cob: join(MINI, "batch/PORTVALRN.cbl"),
    expected: join(MINI, "batch/expected-portvalrn.txt"),
    py: join(MINI, "batch/reference_emit_portvalrn.py"),
    java: join(MINI, "batch/reference_emit_portvalrn.java"),
    csharp: join(MINI, "batch/reference_emit_portvalrn.cs"),
  },
  {
    id: "idxnlprn",
    cob: join(MINI, "batch/IDXNLPRN.cbl"),
    expected: join(MINI, "batch/expected-idxnlprn.txt"),
    py: join(MINI, "batch/reference_emit_idxnlprn.py"),
    java: join(MINI, "batch/reference_emit_idxnlprn.java"),
    csharp: join(MINI, "batch/reference_emit_idxnlprn.cs"),
  },
  {
    id: "utlmntls",
    cob: join(MINI, "batch/UTLMNTLS.cbl"),
    expected: join(MINI, "batch/expected-utlmntls.txt"),
    py: join(MINI, "batch/reference_emit_utlmntls.py"),
    java: join(MINI, "batch/reference_emit_utlmntls.java"),
    csharp: join(MINI, "batch/reference_emit_utlmntls.cs"),
  },
  {
    id: "tstgenrn",
    cob: join(MINI, "batch/TSTGENRN.cbl"),
    expected: join(MINI, "batch/expected-tstgenrn.txt"),
    py: join(MINI, "batch/reference_emit_tstgenrn.py"),
    java: join(MINI, "batch/reference_emit_tstgenrn.java"),
    csharp: join(MINI, "batch/reference_emit_tstgenrn.cs"),
  },
  {
    id: "portaddrn",
    cob: join(MINI, "batch/PORTADDRN.cbl"),
    expected: join(MINI, "batch/expected-portaddrn.txt"),
    py: join(MINI, "batch/reference_emit_portaddrn.py"),
    java: join(MINI, "batch/reference_emit_portaddrn.java"),
    csharp: join(MINI, "batch/reference_emit_portaddrn.cs"),
  },
  {
    id: "portupdrn",
    cob: join(MINI, "batch/PORTUPDRN.cbl"),
    expected: join(MINI, "batch/expected-portupdrn.txt"),
    py: join(MINI, "batch/reference_emit_portupdrn.py"),
    java: join(MINI, "batch/reference_emit_portupdrn.java"),
    csharp: join(MINI, "batch/reference_emit_portupdrn.cs"),
  },
  {
    id: "idxltprn",
    cob: join(MINI, "batch/IDXLTPRN.cbl"),
    expected: join(MINI, "batch/expected-idxltprn.txt"),
    py: join(MINI, "batch/reference_emit_idxltprn.py"),
    java: join(MINI, "batch/reference_emit_idxltprn.java"),
    csharp: join(MINI, "batch/reference_emit_idxltprn.cs"),
  },
  {
    id: "portdelrn",
    cob: join(MINI, "batch/PORTDELRN.cbl"),
    expected: join(MINI, "batch/expected-portdelrn.txt"),
    py: join(MINI, "batch/reference_emit_portdelrn.py"),
    java: join(MINI, "batch/reference_emit_portdelrn.java"),
    csharp: join(MINI, "batch/reference_emit_portdelrn.cs"),
  },
  {
    id: "portreadrn",
    cob: join(MINI, "batch/PORTREADRN.cbl"),
    expected: join(MINI, "batch/expected-portreadrn.txt"),
    py: join(MINI, "batch/reference_emit_portreadrn.py"),
    java: join(MINI, "batch/reference_emit_portreadrn.java"),
    csharp: join(MINI, "batch/reference_emit_portreadrn.cs"),
  },
  {
    id: "porttranrn",
    cob: join(MINI, "batch/PORTTRANRN.cbl"),
    expected: join(MINI, "batch/expected-porttranrn.txt"),
    py: join(MINI, "batch/reference_emit_porttranrn.py"),
    java: join(MINI, "batch/reference_emit_porttranrn.java"),
    csharp: join(MINI, "batch/reference_emit_porttranrn.cs"),
  },
  {
    id: "idxeqprn",
    cob: join(MINI, "batch/IDXEQPRN.cbl"),
    expected: join(MINI, "batch/expected-idxeqprn.txt"),
    py: join(MINI, "batch/reference_emit_idxeqprn.py"),
    java: join(MINI, "batch/reference_emit_idxeqprn.java"),
    csharp: join(MINI, "batch/reference_emit_idxeqprn.cs"),
  },
  {
    id: "portvaldn",
    cob: join(MINI, "batch/PORTVALDN.cbl"),
    expected: join(MINI, "batch/expected-portvaldn.txt"),
    py: join(MINI, "batch/reference_emit_portvaldn.py"),
    java: join(MINI, "batch/reference_emit_portvaldn.java"),
    csharp: join(MINI, "batch/reference_emit_portvaldn.cs"),
    copyInclude: join(MINI, "copybook"),
  },
  {
    id: "idxngtrn",
    cob: join(MINI, "batch/IDXNGTRN.cbl"),
    expected: join(MINI, "batch/expected-idxngtrn.txt"),
    py: join(MINI, "batch/reference_emit_idxngtrn.py"),
    java: join(MINI, "batch/reference_emit_idxngtrn.java"),
    csharp: join(MINI, "batch/reference_emit_idxngtrn.cs"),
  },
  {
    id: "portmstrn",
    cob: join(MINI, "batch/PORTMSTRN.cbl"),
    expected: join(MINI, "batch/expected-portmstrn.txt"),
    py: join(MINI, "batch/reference_emit_portmstrn.py"),
    java: join(MINI, "batch/reference_emit_portmstrn.java"),
    csharp: join(MINI, "batch/reference_emit_portmstrn.cs"),
  },
  {
    id: "portcomrn",
    cob: join(MINI, "batch/PORTCOMRN.cbl"),
    expected: join(MINI, "batch/expected-portcomrn.txt"),
    py: join(MINI, "batch/reference_emit_portcomrn.py"),
    java: join(MINI, "batch/reference_emit_portcomrn.java"),
    csharp: join(MINI, "batch/reference_emit_portcomrn.cs"),
    copyInclude: join(MINI, "copybook"),
  },
  {
    id: "idxeqnrn",
    cob: join(MINI, "batch/IDXEQNRN.cbl"),
    expected: join(MINI, "batch/expected-idxeqnrn.txt"),
    py: join(MINI, "batch/reference_emit_idxeqnrn.py"),
    java: join(MINI, "batch/reference_emit_idxeqnrn.java"),
    csharp: join(MINI, "batch/reference_emit_idxeqnrn.cs"),
  },
  {
    id: "idxnlnrn",
    cob: join(MINI, "batch/IDXNLNRN.cbl"),
    expected: join(MINI, "batch/expected-idxnlnrn.txt"),
    py: join(MINI, "batch/reference_emit_idxnlnrn.py"),
    java: join(MINI, "batch/reference_emit_idxnlnrn.java"),
    csharp: join(MINI, "batch/reference_emit_idxnlnrn.cs"),
  },
  {
    id: "idxltnrn",
    cob: join(MINI, "batch/IDXLTNRN.cbl"),
    expected: join(MINI, "batch/expected-idxltnrn.txt"),
    py: join(MINI, "batch/reference_emit_idxltnrn.py"),
    java: join(MINI, "batch/reference_emit_idxltnrn.java"),
    csharp: join(MINI, "batch/reference_emit_idxltnrn.cs"),
  },
  {
    id: "idxngprn",
    cob: join(MINI, "batch/IDXNGPRN.cbl"),
    expected: join(MINI, "batch/expected-idxngprn.txt"),
    py: join(MINI, "batch/reference_emit_idxngprn.py"),
    java: join(MINI, "batch/reference_emit_idxngprn.java"),
    csharp: join(MINI, "batch/reference_emit_idxngprn.cs"),
  },
  {
    id: "ckprstdn",
    cob: join(MINI, "batch/CKPRSTDN.cbl"),
    expected: join(MINI, "batch/expected-ckprstdn.txt"),
    py: join(MINI, "batch/reference_emit_ckprstdn.py"),
    java: join(MINI, "batch/reference_emit_ckprstdn.java"),
    csharp: join(MINI, "batch/reference_emit_ckprstdn.cs"),
    copyInclude: join(MINI, "copybook"),
  },
  {
    id: "portfliodn",
    cob: join(MINI, "batch/PORTFLIODN.cbl"),
    expected: join(MINI, "batch/expected-portfliodn.txt"),
    py: join(MINI, "batch/reference_emit_portfliodn.py"),
    java: join(MINI, "batch/reference_emit_portfliodn.java"),
    csharp: join(MINI, "batch/reference_emit_portfliodn.cs"),
    copyInclude: join(MINI, "copybook"),
  },
  {
    id: "errhanddn",
    cob: join(MINI, "batch/ERRHANDDN.cbl"),
    expected: join(MINI, "batch/expected-errhanddn.txt"),
    py: join(MINI, "batch/reference_emit_errhanddn.py"),
    java: join(MINI, "batch/reference_emit_errhanddn.java"),
    csharp: join(MINI, "batch/reference_emit_errhanddn.cs"),
    copyInclude: join(MINI, "copybook"),
  },
  {
    id: "ckprstph",
    cob: join(MINI, "batch/CKPRSTPH.cbl"),
    expected: join(MINI, "batch/expected-ckprstph.txt"),
    py: join(MINI, "batch/reference_emit_ckprstph.py"),
    java: join(MINI, "batch/reference_emit_ckprstph.java"),
    csharp: join(MINI, "batch/reference_emit_ckprstph.cs"),
    copyInclude: join(MINI, "copybook"),
  },
];


const W_STRUCT = 30;
const W_DOCS = 20;
const W_BEHAV = 50;

/**
 * @param {string} dir
 * @param {string[]} exts
 * @returns {string[]}
 */
function walkCobolFiles(dir, exts = [".cbl", ".cob", ".cpy"]) {
  if (!existsSync(dir)) return [];
  /** @type {string[]} */
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur) break;
    for (const name of readdirSync(cur)) {
      const p = join(cur, name);
      const st = statSync(p);
      if (st.isDirectory()) {
        if (name === ".git" || name === "node_modules") continue;
        stack.push(p);
      } else if (exts.some((e) => name.toLowerCase().endsWith(e))) {
        out.push(p);
      }
    }
  }
  return out.sort();
}

/**
 * @returns {{ kind: "native"|"msys-win", cobc: string, env?: NodeJS.ProcessEnv } | null}
 */
function resolveCobc() {
  if (process.env.CHRYSALIS_COBOL_COBC) {
    return { kind: "native", cobc: process.env.CHRYSALIS_COBOL_COBC };
  }
  const native = spawnSync("cobc", ["--version"], { encoding: "utf8" });
  if (native.status === 0) return { kind: "native", cobc: "cobc" };

  const winCandidates = [
    {
      cobc: "C:\\msys64\\clangarm64\\bin\\cobc.exe",
      root: "C:\\msys64\\clangarm64",
    },
    {
      cobc: "C:\\msys64\\ucrt64\\bin\\cobc.exe",
      root: "C:\\msys64\\ucrt64",
    },
    {
      cobc: "C:\\msys64\\mingw64\\bin\\cobc.exe",
      root: "C:\\msys64\\mingw64",
    },
    {
      cobc: "C:\\msys64\\clang64\\bin\\cobc.exe",
      root: "C:\\msys64\\clang64",
    },
  ];
  for (const c of winCandidates) {
    if (!existsSync(c.cobc)) continue;
    const env = {
      ...process.env,
      PATH: `${c.root}\\bin;C:\\msys64\\usr\\bin;${process.env.PATH ?? ""}`,
      COB_CONFIG_DIR: `${c.root}\\share\\gnucobol\\config`,
      COB_COPY_DIR: `${c.root}\\share\\gnucobol\\copy`,
      COB_LIBRARY_PATH: `${c.root}\\lib\\gnucobol`,
    };
    const r = spawnSync(c.cobc, ["--version"], { encoding: "utf8", env });
    if (r.status === 0) return { kind: "msys-win", cobc: c.cobc, env };
  }
  return null;
}

/**
 * @param {ReturnType<typeof inventoryCobolSource>} inv
 */
function structuralScore(inv) {
  let pts = 0;
  const max = 10;
  if (inv.programIds.length > 0) pts += 2;
  if (inv.routeCount >= 1) pts += 2;
  if (inv.copybooks.length > 0) pts += 1;
  if (inv.execCics > 0) pts += 1;
  if (inv.performs.length > 0) pts += 1;
  if (inv.evaluateWhens.length > 0) pts += 1;
  if (inv.unresolved.includes("exec-cics") || inv.unresolved.includes("copy")) pts += 1;
  if (inv.hasIdentificationHeader) pts += 1;
  return { pts, max, ratio: pts / max, weighted: (pts / max) * W_STRUCT };
}

/**
 * @param {ReturnType<typeof inventoryCobolSource>} inv
 */
function docsScore(inv) {
  let pts = 0;
  const max = 5;
  if (inv.hasIdentificationHeader) pts += 1;
  if (inv.commentLines >= 3) pts += 2;
  if (inv.commentRatio >= 0.05) pts += 1;
  if (inv.totalLines >= 20) pts += 1;
  return { pts, max, ratio: pts / max, weighted: (pts / max) * W_DOCS };
}

/**
 * @param {{ id: string, cob: string, expected: string, py: string, java: string, csharp: string, copyInclude?: string }} subject
 * @param {{ cobc: string, env?: NodeJS.ProcessEnv }} cobcInfo
 */
function runOneBehavioral(subject, cobcInfo) {
  const expected = readFileSync(subject.expected, "utf8").trim();
  const py = resolveHubPython();
  const pyRun = spawnSync(py, [subject.py], { cwd: ROOT, encoding: "utf8" });
  const pyOut = (pyRun.stdout || "").trim();
  if (pyRun.status !== 0 || pyOut !== expected) {
    return {
      id: subject.id,
      ok: false,
      reason: `reference-python-mismatch status=${pyRun.status} out=${JSON.stringify(pyOut)} expected=${JSON.stringify(expected)}`,
      pyOut,
      expected,
    };
  }

  const outDir = join(MINI, "batch", ".chrysalis-cobc");
  mkdirSync(outDir, { recursive: true });
  const exeName =
    process.platform === "win32" ? `${subject.id}.exe` : subject.id;
  const exe = join(outDir, exeName);
  const cobcEnv = cobcInfo.env ?? process.env;
  /** @type {string[]} */
  const cobcArgs = ["-x", "-free", "-o", exe];
  if (subject.copyInclude) {
    cobcArgs.push("-I", subject.copyInclude);
  }
  cobcArgs.push(subject.cob);
  const compile = spawnSync(cobcInfo.cobc, cobcArgs, {
    cwd: ROOT,
    encoding: "utf8",
    env: cobcEnv,
  });
  if (compile.status !== 0 || !existsSync(exe)) {
    return {
      id: subject.id,
      ok: false,
      reason: `cobc-compile-failed: ${(compile.stderr || compile.stdout || "").slice(0, 400)}`,
      pyOut,
      expected,
      cobc: cobcInfo.cobc,
    };
  }
  const run = spawnSync(exe, [], { cwd: outDir, encoding: "utf8", env: cobcEnv });
  const cobolOut = (run.stdout || "").trim().split(/\r?\n/).filter(Boolean).pop() ?? "";
  if (run.status !== 0) {
    return {
      id: subject.id,
      ok: false,
      reason: `cobol-run-failed: ${(run.stderr || run.stdout || "").slice(0, 300)}`,
      cobolOut,
      pyOut,
      expected,
      cobc: cobcInfo.cobc,
    };
  }

  /** @type {Record<string, { ok: boolean, out?: string, reason?: string }>} */
  const multiLangRefs = {
    python: { ok: pyOut === expected, out: pyOut },
  };
  for (const [lang, script] of [
    ["java", subject.java],
    ["csharp", subject.csharp],
  ]) {
    if (!existsSync(script)) {
      multiLangRefs[lang] = { ok: true, reason: "skipped-no-reference-script" };
      continue;
    }
    const body = readFileSync(script, "utf8");
    const tagged = /EXPECTED:\s*([0-9.]+)/.exec(body);
    const taggedOut = tagged?.[1]?.trim() ?? "";
    multiLangRefs[lang] = {
      ok: taggedOut === expected,
      out: taggedOut || undefined,
      reason: taggedOut === expected ? undefined : `expected-tag-mismatch tag=${taggedOut}`,
    };
  }

  const match = cobolOut === expected && pyOut === expected;
  const refFail = Object.entries(multiLangRefs).find(([, r]) => !r.ok);
  let reason;
  if (!match) {
    reason = `byte-mismatch cobol=${JSON.stringify(cobolOut)} py=${JSON.stringify(pyOut)} expected=${JSON.stringify(expected)}`;
  } else if (refFail) {
    reason = `ref-${refFail[0]}: ${refFail[1].reason ?? "failed"}`;
  }
  return {
    id: subject.id,
    ok: match && !refFail,
    reason,
    cobolOut,
    pyOut,
    expected,
    cobc: cobcInfo.cobc,
    multiLangRefs,
  };
}

/**
 * @returns {{ ok: boolean, skipped?: boolean, reason?: string, subjects?: unknown[], cobolOut?: string, pyOut?: string, expected?: string }}
 */
function runBehavioralParallel() {
  const cobcInfo = resolveCobc();
  if (!cobcInfo) {
    // Still require python refs when cobc missing
    const py = resolveHubPython();
    for (const s of BEHAVIORAL_SUBJECTS) {
      if (!existsSync(s.cob) || !existsSync(s.expected) || !existsSync(s.py)) {
        return { ok: false, reason: `missing-subject-files:${s.id}` };
      }
      const expected = readFileSync(s.expected, "utf8").trim();
      const pyRun = spawnSync(py, [s.py], { cwd: ROOT, encoding: "utf8" });
      if (pyRun.status !== 0 || (pyRun.stdout || "").trim() !== expected) {
        return {
          ok: false,
          reason: `reference-python-mismatch:${s.id}`,
        };
      }
    }
    return {
      ok: true,
      skipped: true,
      reason: "no-gnucobol-cobc",
      subjects: BEHAVIORAL_SUBJECTS.map((s) => s.id),
    };
  }

  /** @type {ReturnType<typeof runOneBehavioral>[]} */
  const subjects = [];
  for (const s of BEHAVIORAL_SUBJECTS) {
    if (!existsSync(s.cob)) {
      subjects.push({ id: s.id, ok: false, reason: "missing-cobol-source" });
      continue;
    }
    subjects.push(runOneBehavioral(s, cobcInfo));
  }
  const failed = subjects.filter((s) => !s.ok);
  const primary = subjects.find((s) => s.id === "clbsmath") ?? subjects[0];
  return {
    ok: failed.length === 0,
    reason: failed[0]?.reason,
    subjects,
    cobolOut: primary?.cobolOut,
    pyOut: primary?.pyOut,
    expected: primary?.expected,
    cobc: cobcInfo.cobc,
    multiLangRefs: primary?.multiLangRefs,
  };
}


export async function runCobolClbsProveSmoke() {
  const progress = createSmokeProgress("cobol-clbs-prove");
  const t0 = progress.start("CLBS COBOL modernization prove");

  const onlineSrc = readFileSync(ONLINE, "utf8");
  const batchSrc = readFileSync(BATCH, "utf8");
  const onlineInv = inventoryCobolSource(onlineSrc, "online/INQONLN.cbl");
  const batchInv = inventoryCobolSource(batchSrc, "batch/CLBSMATH.cbl");
  const onlineRoutes = parseCobolRoutes(onlineSrc);

  const struct = structuralScore(onlineInv);
  const docs = docsScore(onlineInv);

  const behavioral = runBehavioralParallel();
  const behavWeighted = behavioral.skipped
    ? null
    : behavioral.ok
      ? W_BEHAV
      : 0;
  const behavRatio = behavioral.skipped ? null : behavioral.ok ? 1 : 0;

  const scoredTracks = W_STRUCT + W_DOCS + (behavioral.skipped ? 0 : W_BEHAV);
  const earned =
    struct.weighted + docs.weighted + (behavWeighted === null ? 0 : behavWeighted);
  const overall = scoredTracks > 0 ? (earned / scoredTracks) * 100 : 0;

  /** @type {Array<{ id: string, ok: boolean, reason?: string }>} */
  const checks = [];

  checks.push({
    id: "online-clbs-shape",
    ok:
      onlineInv.programIds.includes("INQONLN") &&
      onlineInv.execCics > 0 &&
      onlineInv.copybooks.length > 0 &&
      onlineInv.performs.length > 0 &&
      onlineRoutes.length >= 3,
    reason:
      onlineRoutes.length >= 3
        ? undefined
        : `routes=${onlineRoutes.length} cics=${onlineInv.execCics} copy=${onlineInv.copybooks.join(",")}`,
  });

  const requiredCicsOps = [
    "HANDLE",
    "RECEIVE",
    "SEND",
    "LINK",
    "RETURN",
    "READ",
    "WRITE",
    "XCTL",
    "STARTBR",
    "WRITEQ",
    "READQ",
    "DELETEQ",
    "ENQ",
    "DEQ",
  ];
  const onlineOps = new Set(onlineInv.execCicsOps || []);
  const missingOps = requiredCicsOps.filter((op) => !onlineOps.has(op));
  checks.push({
    id: "online-cics-op-catalog",
    ok:
      missingOps.length === 0 &&
      onlineOps.has("SEND-MAP") &&
      onlineOps.has("RECEIVE-MAP") &&
      (onlineInv.execCicsMaps || []).includes("INQMAP") &&
      (onlineInv.execCicsMaps || []).includes("INQMNU") &&
      (onlineInv.execCicsMapsets || []).includes("INQSET") &&
      (onlineInv.execCicsLinkPrograms || []).includes("SECMGR") &&
      (onlineInv.execCicsXctlPrograms || []).includes("INQMENU") &&
      onlineInv.handleCondition >= 1 &&
      onlineInv.handleAid >= 1 &&
      onlineInv.respClauses >= 5 &&
      onlineInv.sectionCount >= 4 &&
      onlineInv.evaluateWhens.includes("MENU") &&
      onlineInv.evaluateWhens.includes("INQP") &&
      onlineInv.unresolved.includes("exec-cics"),
    reason:
      missingOps.length === 0
        ? `ops=${[...onlineOps].join(",")} maps=${(onlineInv.execCicsMaps || []).join(",")} mapsets=${(onlineInv.execCicsMapsets || []).join(",")} link=${(onlineInv.execCicsLinkPrograms || []).join(",")} xctl=${(onlineInv.execCicsXctlPrograms || []).join(",")} sections=${onlineInv.sectionCount} handle=${onlineInv.handleCondition}/${onlineInv.handleAid} resp=${onlineInv.respClauses}`
        : `missingOps=${missingOps.join(",")} ops=${[...onlineOps].join(",")}`,
  });

  const cardSrc = existsSync(CARDONLN) ? readFileSync(CARDONLN, "utf8") : "";
  const cardInv = cardSrc ? inventoryCobolSource(cardSrc, "online/CARDONLN.cbl") : null;
  const cardRoutes = cardSrc ? parseCobolRoutes(cardSrc) : [];
  checks.push({
    id: "online-carddemo-shape",
    ok:
      !!cardInv &&
      cardInv.programIds.includes("CARDONLN") &&
      cardInv.execCics >= 16 &&
      (cardInv.execCicsOps || []).includes("HANDLE") &&
      (cardInv.execCicsOps || []).includes("XCTL") &&
      (cardInv.execCicsOps || []).includes("ASKTIME") &&
      (cardInv.execCicsOps || []).includes("FORMATTIME") &&
      (cardInv.execCicsOps || []).includes("READNEXT") &&
      (cardInv.execCicsOps || []).includes("REWRITE") &&
      (cardInv.execCicsOps || []).includes("SYNCPOINT") &&
      (cardInv.execCicsOps || []).includes("ABEND") &&
      (cardInv.execCicsOps || []).includes("GETMAIN") &&
      (cardInv.execCicsOps || []).includes("FREEMAIN") &&
      (cardInv.execCicsOps || []).includes("DELAY") &&
      (cardInv.execCicsOps || []).includes("INQUIRE") &&
      cardInv.evaluateWhens.length >= 3 &&
      cardInv.sectionCount >= 5 &&
      cardRoutes.length >= 3 &&
      cardInv.procedureUsing >= 1 &&
      /\bLINKAGE\s+SECTION\b/i.test(cardSrc) &&
      /\bDFHCOMMAREA\b/i.test(cardSrc) &&
      /\bCOMMAREA\s*\(\s*DFHCOMMAREA\s*\)/i.test(cardSrc) &&
      /\bLENGTH\s*\(\s*WS-CA-LENGTH\s*\)/i.test(cardSrc) &&
      /\bPERFORM\s+UNTIL\s+WS-BROWSE-DONE\b/i.test(cardSrc) &&
      cardInv.unresolved.includes("exec-cics"),
    reason: cardInv
      ? `cics=${cardInv.execCics} ops=${(cardInv.execCicsOps || []).join(",")} sections=${cardInv.sectionCount} routes=${cardRoutes.length} using=${cardInv.procedureUsing}`
      : "missing-CARDONLN",
  });

  const cardRequiredOps = [
    "HANDLE",
    "ASKTIME",
    "FORMATTIME",
    "ASSIGN",
    "RECEIVE",
    "SEND",
    "LINK",
    "RETURN",
    "READ",
    "REWRITE",
    "WRITE",
    "DELETE",
    "STARTBR",
    "READNEXT",
    "READPREV",
    "ENDBR",
    "XCTL",
    "SYNCPOINT",
    "ABEND",
    "GETMAIN",
    "FREEMAIN",
    "DELAY",
    "INQUIRE",
  ];
  const cardOps = new Set(cardInv?.execCicsOps || []);
  const cardMissingOps = cardRequiredOps.filter((op) => !cardOps.has(op));
  checks.push({
    id: "online-carddemo-cics-op-catalog",
    ok:
      !!cardInv &&
      cardMissingOps.length === 0 &&
      cardOps.has("SEND-MAP") &&
      cardOps.has("SEND-TEXT") &&
      cardOps.has("RECEIVE-MAP") &&
      (cardInv.execCicsMaps || []).includes("COSGN00") &&
      (cardInv.execCicsMaps || []).includes("COMEN01") &&
      (cardInv.execCicsMapsets || []).includes("COSGN00") &&
      (cardInv.execCicsLinkPrograms || []).includes("COSGN00C") &&
      (cardInv.execCicsXctlPrograms || []).includes("COMEN01C") &&
      cardInv.unresolved.includes("exec-cics"),
    reason:
      cardMissingOps.length === 0
        ? `ops=${[...cardOps].join(",")} maps=${(cardInv?.execCicsMaps || []).join(",")} mapsets=${(cardInv?.execCicsMapsets || []).join(",")} link=${(cardInv?.execCicsLinkPrograms || []).join(",")} xctl=${(cardInv?.execCicsXctlPrograms || []).join(",")}`
        : `missingOps=${cardMissingOps.join(",")} ops=${[...cardOps].join(",")}`,
  });

  const portSrc = existsSync(PORTONLN) ? readFileSync(PORTONLN, "utf8") : "";
  const portInv = portSrc ? inventoryCobolSource(portSrc, "online/PORTONLN.cbl") : null;
  const portRoutes = portSrc ? parseCobolRoutes(portSrc) : [];
  const portRequiredOps = [
    "HANDLE",
    "VERIFY",
    "SUSPEND",
    "GETMAIN",
    "FREEMAIN",
    "WRITEQ",
    "READQ",
    "DELETEQ",
    "ENQ",
    "DEQ",
    "RECEIVE",
    "SEND",
    "LINK",
    "XCTL",
    "RETURN",
  ];
  const portOps = new Set(portInv?.execCicsOps || []);
  const portMissingOps = portRequiredOps.filter((op) => !portOps.has(op));
  checks.push({
    id: "online-portonln-cics-op-catalog",
    ok:
      !!portInv &&
      portInv.programIds.includes("PORTONLN") &&
      portMissingOps.length === 0 &&
      portInv.handleCondition >= 1 &&
      portInv.handleAid >= 1 &&
      portInv.sectionCount >= 4 &&
      portInv.evaluateWhens.includes("POSN") &&
      portRoutes.length >= 2 &&
      portInv.unresolved.includes("exec-cics"),
    reason: portInv
      ? portMissingOps.length
        ? `missingOps=${portMissingOps.join(",")} ops=${[...portOps].join(",")}`
        : `ops=${[...portOps].join(",")} sections=${portInv.sectionCount} routes=${portRoutes.length}`
      : "missing-PORTONLN",
  });

  checks.push({
    id: "batch-math-shape",
    ok: batchInv.programIds.includes("CLBSMATH") && batchInv.computes >= 1,
    reason: batchInv.computes >= 1 ? undefined : "missing COMPUTE",
  });

  const ckprSrc = existsSync(CKPRSTRN) ? readFileSync(CKPRSTRN, "utf8") : "";
  const ckprInv = ckprSrc ? inventoryCobolSource(ckprSrc, "batch/CKPRSTRN.cbl") : null;
  checks.push({
    id: "batch-ckprstrn-shape",
    ok:
      !!ckprInv &&
      ckprInv.programIds.includes("CKPRSTRN") &&
      ckprInv.evaluateTrue >= 1 &&
      ckprInv.performs.includes("PROC-TAKE-CHECKPOINT") &&
      ckprInv.routeCount >= 2,
    reason: ckprInv
      ? `evalTrue=${ckprInv.evaluateTrue} routes=${ckprInv.routeCount} performs=${ckprInv.performs.length}`
      : "missing-CKPRSTRN",
  });

  const deptSrc = existsSync(DEPTPAY) ? readFileSync(DEPTPAY, "utf8") : "";
  const deptInv = deptSrc ? inventoryCobolSource(deptSrc, "batch/DEPTPAY.cbl") : null;
  checks.push({
    id: "batch-deptpay-shape",
    ok:
      !!deptInv &&
      deptInv.programIds.includes("DEPTPAY") &&
      deptInv.computes >= 1 &&
      deptInv.performs.includes("AVERAGE-SALARY"),
    reason: deptInv
      ? `computes=${deptInv.computes} performs=${deptInv.performs.join(",")}`
      : "missing-DEPTPAY",
  });

  const emppaySrc = existsSync(EMPPAYRN) ? readFileSync(EMPPAYRN, "utf8") : "";
  const emppayInv = emppaySrc ? inventoryCobolSource(emppaySrc, "batch/EMPPAYRN.cbl") : null;
  checks.push({
    id: "batch-emppayrn-shape",
    ok:
      !!emppayInv &&
      emppayInv.programIds.includes("EMPPAYRN") &&
      emppayInv.computes >= 1 &&
      emppayInv.performs.includes("PAYMENT-WEEKLY"),
    reason: emppayInv
      ? `computes=${emppayInv.computes} performs=${emppayInv.performs.join(",")}`
      : "missing-EMPPAYRN",
  });

  const seqsumSrc = existsSync(SEQSUM) ? readFileSync(SEQSUM, "utf8") : "";
  const seqsumInv = seqsumSrc ? inventoryCobolSource(seqsumSrc, "batch/SEQSUM.cbl") : null;
  checks.push({
    id: "batch-seqsum-shape",
    ok:
      !!seqsumInv &&
      seqsumInv.programIds.includes("SEQSUM") &&
      seqsumInv.fileIo >= 1,
    reason: seqsumInv
      ? `fileIo=${seqsumInv.fileIo} programIds=${seqsumInv.programIds.join(",")}`
      : "missing-SEQSUM",
  });

  const cardintrnPath = join(MINI, "batch/CARDINTRN.cbl");
  const cardintrnSrc = existsSync(cardintrnPath) ? readFileSync(cardintrnPath, "utf8") : "";
  const cardintrnInv = cardintrnSrc
    ? inventoryCobolSource(cardintrnSrc, "batch/CARDINTRN.cbl")
    : null;
  checks.push({
    id: "batch-cardintrn-shape",
    ok:
      !!cardintrnInv &&
      cardintrnInv.programIds.includes("CARDINTRN") &&
      cardintrnInv.computes >= 1,
    reason: cardintrnInv
      ? `computes=${cardintrnInv.computes} programIds=${cardintrnInv.programIds.join(",")}`
      : "missing-CARDINTRN",
  });

  const varysumPath = join(MINI, "batch/VARYSUM.cbl");
  const varysumSrc = existsSync(varysumPath) ? readFileSync(varysumPath, "utf8") : "";
  const varysumInv = varysumSrc
    ? inventoryCobolSource(varysumSrc, "batch/VARYSUM.cbl")
    : null;
  checks.push({
    id: "batch-varysum-shape",
    ok:
      !!varysumInv &&
      varysumInv.programIds.includes("VARYSUM") &&
      /\bPERFORM\s+VARYING\b/i.test(varysumSrc),
    reason: varysumInv
      ? `programIds=${varysumInv.programIds.join(",")} performVarying=${/\bPERFORM\s+VARYING\b/i.test(varysumSrc)}`
      : "missing-VARYSUM",
  });

  const nestbrPath = join(MINI, "batch/NESTBR.cbl");
  const nestbrSrc = existsSync(nestbrPath) ? readFileSync(nestbrPath, "utf8") : "";
  const nestbrInv = nestbrSrc
    ? inventoryCobolSource(nestbrSrc, "batch/NESTBR.cbl")
    : null;
  checks.push({
    id: "batch-nestbr-shape",
    ok:
      !!nestbrInv &&
      nestbrInv.programIds.includes("NESTBR") &&
      (nestbrSrc.match(/\bEND-IF\b/gi) || []).length >= 2 &&
      /\bELSE\b/i.test(nestbrSrc),
    reason: nestbrInv
      ? `programIds=${nestbrInv.programIds.join(",")} endIf=${(nestbrSrc.match(/\bEND-IF\b/gi) || []).length}`
      : "missing-NESTBR",
  });

  const srchtabPath = join(MINI, "batch/SRCHTAB.cbl");
  const srchtabSrc = existsSync(srchtabPath) ? readFileSync(srchtabPath, "utf8") : "";
  const srchtabInv = srchtabSrc
    ? inventoryCobolSource(srchtabSrc, "batch/SRCHTAB.cbl")
    : null;
  checks.push({
    id: "batch-srchtab-shape",
    ok:
      !!srchtabInv &&
      srchtabInv.programIds.includes("SRCHTAB") &&
      srchtabInv.occurs >= 1 &&
      srchtabInv.search >= 1,
    reason: srchtabInv
      ? `occurs=${srchtabInv.occurs} search=${srchtabInv.search} programIds=${srchtabInv.programIds.join(",")}`
      : "missing-SRCHTAB",
  });

  const evalmanyPath = join(MINI, "batch/EVALMANY.cbl");
  const evalmanySrc = existsSync(evalmanyPath) ? readFileSync(evalmanyPath, "utf8") : "";
  const evalmanyInv = evalmanySrc
    ? inventoryCobolSource(evalmanySrc, "batch/EVALMANY.cbl")
    : null;
  checks.push({
    id: "batch-evalmany-shape",
    ok:
      !!evalmanyInv &&
      evalmanyInv.programIds.includes("EVALMANY") &&
      evalmanyInv.evaluateAny >= 1 &&
      evalmanyInv.evaluateTrue === 0 &&
      (evalmanyInv.evaluateNumericWhens || []).length >= 3,
    reason: evalmanyInv
      ? `evalAny=${evalmanyInv.evaluateAny} numericWhens=${(evalmanyInv.evaluateNumericWhens || []).join(",")} evalTrue=${evalmanyInv.evaluateTrue}`
      : "missing-EVALMANY",
  });

  const cardfeeinPath = join(MINI, "batch/CARDFEEIN.cbl");
  const cardfeeinSrc = existsSync(cardfeeinPath) ? readFileSync(cardfeeinPath, "utf8") : "";
  const cardfeeinInv = cardfeeinSrc
    ? inventoryCobolSource(cardfeeinSrc, "batch/CARDFEEIN.cbl")
    : null;
  checks.push({
    id: "batch-cardfeein-shape",
    ok:
      !!cardfeeinInv &&
      cardfeeinInv.programIds.includes("CARDFEEIN") &&
      cardfeeinInv.computes >= 3,
    reason: cardfeeinInv
      ? `computes=${cardfeeinInv.computes} programIds=${cardfeeinInv.programIds.join(",")}`
      : "missing-CARDFEEIN",
  });

  const ckprusrnPath = join(MINI, "batch/CKPRUSRN.cbl");
  const ckprusrnSrc = existsSync(ckprusrnPath) ? readFileSync(ckprusrnPath, "utf8") : "";
  const ckprusrnInv = ckprusrnSrc
    ? inventoryCobolSource(ckprusrnSrc, "batch/CKPRUSRN.cbl")
    : null;
  checks.push({
    id: "batch-ckprusrn-shape",
    ok:
      !!ckprusrnInv &&
      ckprusrnInv.programIds.includes("CKPRUSRN") &&
      ckprusrnInv.procedureUsing >= 1 &&
      ckprusrnInv.evaluateTrue >= 1 &&
      /\bCALL\s+"CKPRSTSB"\s+USING\b/i.test(ckprusrnSrc),
    reason: ckprusrnInv
      ? `using=${ckprusrnInv.procedureUsing} evalTrue=${ckprusrnInv.evaluateTrue} ids=${ckprusrnInv.programIds.join(",")}`
      : "missing-CKPRUSRN",
  });

  const seqmaxPath = join(MINI, "batch/SEQMAX.cbl");
  const seqmaxSrc = existsSync(seqmaxPath) ? readFileSync(seqmaxPath, "utf8") : "";
  const seqmaxInv = seqmaxSrc
    ? inventoryCobolSource(seqmaxSrc, "batch/SEQMAX.cbl")
    : null;
  checks.push({
    id: "batch-seqmax-shape",
    ok:
      !!seqmaxInv &&
      seqmaxInv.programIds.includes("SEQMAX") &&
      seqmaxInv.fileIo >= 1 &&
      /\bLINE\s+SEQUENTIAL\b/i.test(seqmaxSrc) &&
      /\bIF\s+DATA-AMT\s*>\s*WS-MAX\b/i.test(seqmaxSrc),
    reason: seqmaxInv
      ? `fileIo=${seqmaxInv.fileIo} programIds=${seqmaxInv.programIds.join(",")}`
      : "missing-SEQMAX",
  });

  const entryrnPath = join(MINI, "batch/ENTRYRN.cbl");
  const entryrnSrc = existsSync(entryrnPath) ? readFileSync(entryrnPath, "utf8") : "";
  const entryrnInv = entryrnSrc
    ? inventoryCobolSource(entryrnSrc, "batch/ENTRYRN.cbl")
    : null;
  checks.push({
    id: "batch-entryrn-shape",
    ok:
      !!entryrnInv &&
      entryrnInv.programIds.includes("ENTRYRN") &&
      entryrnInv.entryCount >= 1 &&
      entryrnInv.entryNames.includes("ALTPHASE") &&
      /\bCALL\s+"ALTPHASE"\s+USING\b/i.test(entryrnSrc),
    reason: entryrnInv
      ? `entries=${entryrnInv.entryNames.join(",")} ids=${entryrnInv.programIds.join(",")}`
      : "missing-ENTRYRN",
  });

  const idxvsamPath = join(MINI, "batch/IDXVSAM.cbl");
  const idxvsamSrc = existsSync(idxvsamPath) ? readFileSync(idxvsamPath, "utf8") : "";
  const idxvsamInv = idxvsamSrc
    ? inventoryCobolSource(idxvsamSrc, "batch/IDXVSAM.cbl")
    : null;
  checks.push({
    id: "batch-idxvsam-indexed-holes",
    ok:
      !!idxvsamInv &&
      idxvsamInv.programIds.includes("IDXVSAM") &&
      idxvsamInv.organizationIndexed >= 1 &&
      (idxvsamInv.recordKeys || []).includes("IDX-KEY") &&
      (idxvsamInv.alternateRecordKeys || []).includes("IDX-ALT-KEY") &&
      (idxvsamInv.accessModes || []).includes("DYNAMIC") &&
      /\bDELETE\s+IDX-FILE\s+RECORD\b/i.test(idxvsamSrc) &&
      /\bSTART\s+IDX-FILE\s+KEY\s+IS\s+EQUAL\b/i.test(idxvsamSrc) &&
      /\bREWRITE\s+IDX-REC\b/i.test(idxvsamSrc) &&
      idxvsamInv.unresolved.includes("indexed-file") &&
      idxvsamInv.unresolved.includes("record-key") &&
      idxvsamInv.unresolved.includes("alternate-record-key") &&
      idxvsamInv.unresolved.includes("invalid-key") &&
      idxvsamInv.unresolved.includes("file-io"),
    reason: idxvsamInv
      ? `indexed=${idxvsamInv.organizationIndexed} keys=${(idxvsamInv.recordKeys || []).join(",")} alt=${(idxvsamInv.alternateRecordKeys || []).join(",")} unresolved=${idxvsamInv.unresolved.join(",")}`
      : "missing-IDXVSAM",
  });

  const idxkeyrnPath = join(MINI, "batch/IDXKEYRN.cbl");
  const idxkeyrnSrc = existsSync(idxkeyrnPath) ? readFileSync(idxkeyrnPath, "utf8") : "";
  const idxkeyrnInv = idxkeyrnSrc
    ? inventoryCobolSource(idxkeyrnSrc, "batch/IDXKEYRN.cbl")
    : null;
  checks.push({
    id: "batch-idxkeyrn-shape",
    ok:
      !!idxkeyrnInv &&
      idxkeyrnInv.programIds.includes("IDXKEYRN") &&
      idxkeyrnInv.fileIo >= 1 &&
      /\bLINE\s+SEQUENTIAL\b/i.test(idxkeyrnSrc) &&
      /\bIF\s+DATA-KEY\s*=\s*WS-FIND-KEY\b/i.test(idxkeyrnSrc) &&
      !/\bADD\s+WS-DELTA\s+TO\s+DATA-AMT\b/i.test(idxkeyrnSrc) &&
      (idxkeyrnInv.organizationIndexed || 0) === 0,
    reason: idxkeyrnInv
      ? `fileIo=${idxkeyrnInv.fileIo} indexed=${idxkeyrnInv.organizationIndexed} ids=${idxkeyrnInv.programIds.join(",")}`
      : "missing-IDXKEYRN",
  });

  const idxupdrnPath = join(MINI, "batch/IDXUPDRN.cbl");
  const idxupdrnSrc = existsSync(idxupdrnPath) ? readFileSync(idxupdrnPath, "utf8") : "";
  const idxupdrnInv = idxupdrnSrc
    ? inventoryCobolSource(idxupdrnSrc, "batch/IDXUPDRN.cbl")
    : null;
  checks.push({
    id: "batch-idxupdrn-shape",
    ok:
      !!idxupdrnInv &&
      idxupdrnInv.programIds.includes("IDXUPDRN") &&
      idxupdrnInv.fileIo >= 1 &&
      /\bLINE\s+SEQUENTIAL\b/i.test(idxupdrnSrc) &&
      /\bIF\s+DATA-KEY\s*=\s*WS-FIND-KEY\b/i.test(idxupdrnSrc) &&
      /\bADD\s+WS-DELTA\s+TO\s+DATA-AMT\b/i.test(idxupdrnSrc) &&
      (idxupdrnInv.organizationIndexed || 0) === 0,
    reason: idxupdrnInv
      ? `fileIo=${idxupdrnInv.fileIo} indexed=${idxupdrnInv.organizationIndexed} ids=${idxupdrnInv.programIds.join(",")}`
      : "missing-IDXUPDRN",
  });

  const cardbillPath = join(MINI, "batch/CARDBILL.cbl");
  const cardbillSrc = existsSync(cardbillPath) ? readFileSync(cardbillPath, "utf8") : "";
  const cardbillInv = cardbillSrc
    ? inventoryCobolSource(cardbillSrc, "batch/CARDBILL.cbl")
    : null;
  checks.push({
    id: "batch-cardbill-shape",
    ok:
      !!cardbillInv &&
      cardbillInv.programIds.includes("CARDBILL") &&
      cardbillInv.computes >= 3 &&
      /\bIF\s+WS-DAYS-LATE\s*>\s*30\b/i.test(cardbillSrc) &&
      /\bMOVE\s+WS-LATE-FEE\s+TO\s+WS-LATE-AMT\b/i.test(cardbillSrc),
    reason: cardbillInv
      ? `computes=${cardbillInv.computes} ids=${cardbillInv.programIds.join(",")}`
      : "missing-CARDBILL",
  });

  const cardpayPath = join(MINI, "batch/CARDPAY.cbl");
  const cardpaySrc = existsSync(cardpayPath) ? readFileSync(cardpayPath, "utf8") : "";
  const cardpayInv = cardpaySrc
    ? inventoryCobolSource(cardpaySrc, "batch/CARDPAY.cbl")
    : null;
  checks.push({
    id: "batch-cardpay-shape",
    ok:
      !!cardpayInv &&
      cardpayInv.programIds.includes("CARDPAY") &&
      cardpayInv.evaluateAny >= 1 &&
      cardpayInv.evaluateWhens.includes("F") &&
      cardpayInv.evaluateWhens.includes("P") &&
      cardpayInv.evaluateWhens.includes("M") &&
      /\bIF\s+WS-DAYS-LATE\s*>\s*30\b/i.test(cardpaySrc) &&
      /\bCOMPUTE\s+WS-PAY\s+ROUNDED\s*=\s*WS-BAL\s*\*\s*WS-PCT\b/i.test(cardpaySrc),
    reason: cardpayInv
      ? `whens=${cardpayInv.evaluateWhens.join(",")} computes=${cardpayInv.computes} ids=${cardpayInv.programIds.join(",")}`
      : "missing-CARDPAY",
  });

  const idxrngrnPath = join(MINI, "batch/IDXRNGRN.cbl");
  const idxrngrnSrc = existsSync(idxrngrnPath) ? readFileSync(idxrngrnPath, "utf8") : "";
  const idxrngrnInv = idxrngrnSrc
    ? inventoryCobolSource(idxrngrnSrc, "batch/IDXRNGRN.cbl")
    : null;
  checks.push({
    id: "batch-idxrngrn-shape",
    ok:
      !!idxrngrnInv &&
      idxrngrnInv.programIds.includes("IDXRNGRN") &&
      idxrngrnInv.fileIo >= 1 &&
      /\bLINE\s+SEQUENTIAL\b/i.test(idxrngrnSrc) &&
      /\bIF\s+DATA-KEY\s*>=\s*WS-START-KEY\b/i.test(idxrngrnSrc) &&
      /\bADD\s+DATA-AMT\s+TO\s+WS-SUM\b/i.test(idxrngrnSrc) &&
      (idxrngrnInv.organizationIndexed || 0) === 0,
    reason: idxrngrnInv
      ? `fileIo=${idxrngrnInv.fileIo} indexed=${idxrngrnInv.organizationIndexed} ids=${idxrngrnInv.programIds.join(",")}`
      : "missing-IDXRNGRN",
  });

  const cardstatPath = join(MINI, "batch/CARDSTAT.cbl");
  const cardstatSrc = existsSync(cardstatPath) ? readFileSync(cardstatPath, "utf8") : "";
  const cardstatInv = cardstatSrc
    ? inventoryCobolSource(cardstatSrc, "batch/CARDSTAT.cbl")
    : null;
  checks.push({
    id: "batch-cardstat-shape",
    ok:
      !!cardstatInv &&
      cardstatInv.programIds.includes("CARDSTAT") &&
      cardstatInv.evaluateWhens.includes("A") &&
      cardstatInv.evaluateWhens.includes("D") &&
      cardstatInv.evaluateWhens.includes("C") &&
      /\bWS-RATE-A\b/i.test(cardstatSrc) &&
      /\bWS-RATE-D\b/i.test(cardstatSrc) &&
      /\bWS-RATE-C\b/i.test(cardstatSrc) &&
      /\bIF\s+WS-STATUS\s*=\s*'D'\s+AND\s+WS-DAYS-LATE\s*>\s*30\b/i.test(cardstatSrc),
    reason: cardstatInv
      ? `whens=${cardstatInv.evaluateWhens.join(",")} computes=${cardstatInv.computes} ids=${cardstatInv.programIds.join(",")}`
      : "missing-CARDSTAT",
  });

  const histldrnPath = join(MINI, "batch/HISTLDRN.cbl");
  const histldrnSrc = existsSync(histldrnPath) ? readFileSync(histldrnPath, "utf8") : "";
  const histldrnInv = histldrnSrc
    ? inventoryCobolSource(histldrnSrc, "batch/HISTLDRN.cbl")
    : null;
  checks.push({
    id: "batch-histldrn-clbs-file-io",
    ok:
      !!histldrnInv &&
      histldrnInv.programIds.includes("HISTLDRN") &&
      histldrnInv.fileIo >= 1 &&
      /\bLINE\s+SEQUENTIAL\b/i.test(histldrnSrc) &&
      /\bTRANSACTION-HISTORY\b/i.test(histldrnSrc) &&
      /\b0000-MAIN\b/i.test(histldrnSrc) &&
      /\b1000-INITIALIZE\b/i.test(histldrnSrc) &&
      (histldrnInv.organizationIndexed || 0) === 0 &&
      (histldrnInv.execSql || 0) === 0,
    reason: histldrnInv
      ? `fileIo=${histldrnInv.fileIo} indexed=${histldrnInv.organizationIndexed} sql=${histldrnInv.execSql}`
      : "missing-HISTLDRN",
  });

  const idxprobePath = join(MINI, "batch/IDXPROBE.cbl");
  const idxprobeSrc = existsSync(idxprobePath) ? readFileSync(idxprobePath, "utf8") : "";
  const idxprobeInv = idxprobeSrc
    ? inventoryCobolSource(idxprobeSrc, "batch/IDXPROBE.cbl")
    : null;
  checks.push({
    id: "batch-idxprobe-gnucobol-indexed",
    ok:
      !!idxprobeInv &&
      idxprobeInv.programIds.includes("IDXPROBE") &&
      idxprobeInv.organizationIndexed >= 1 &&
      (idxprobeInv.recordKeys || []).includes("IDX-KEY") &&
      (idxprobeInv.accessModes || []).includes("DYNAMIC") &&
      !(idxprobeInv.alternateRecordKeys || []).length &&
      idxprobeInv.unresolved.includes("indexed-file") &&
      idxprobeInv.unresolved.includes("invalid-key"),
    reason: idxprobeInv
      ? `indexed=${idxprobeInv.organizationIndexed} keys=${(idxprobeInv.recordKeys || []).join(",")} alt=${(idxprobeInv.alternateRecordKeys || []).join(",")}`
      : "missing-IDXPROBE",
  });

  const sqlinvPath = join(MINI, "batch/SQLINV00.cbl");
  const sqlinvSrc = existsSync(sqlinvPath) ? readFileSync(sqlinvPath, "utf8") : "";
  const sqlinvInv = sqlinvSrc ? inventoryCobolSource(sqlinvSrc, "batch/SQLINV00.cbl") : null;
  const sqlNeed = [
    "BEGIN-DECLARE",
    "END-DECLARE",
    "INCLUDE",
    "DECLARE-TABLE",
    "DECLARE-CURSOR",
    "INSERT",
    "UPDATE",
    "DELETE",
    "SELECT",
    "OPEN",
    "FETCH",
    "CLOSE",
    "COMMIT",
    "ROLLBACK",
  ];
  const sqlOps = new Set(sqlinvInv?.execSqlOps || []);
  const sqlMissing = sqlNeed.filter((o) => !sqlOps.has(o));
  checks.push({
    id: "batch-sqlinv-exec-sql-holes",
    ok:
      !!sqlinvInv &&
      sqlinvInv.programIds.includes("SQLINV00") &&
      sqlinvInv.execSql >= 10 &&
      sqlMissing.length === 0 &&
      sqlinvInv.unresolved.includes("exec-sql"),
    reason: sqlinvInv
      ? sqlMissing.length
        ? `missing=${sqlMissing.join(",")}`
        : `ops=${[...sqlOps].join(",")} execSql=${sqlinvInv.execSql}`
      : "missing-SQLINV00",
  });

  const cardaccfPath = join(MINI, "batch/CARDACCF.cbl");
  const cardaccfSrc = existsSync(cardaccfPath) ? readFileSync(cardaccfPath, "utf8") : "";
  const cardaccfInv = cardaccfSrc
    ? inventoryCobolSource(cardaccfSrc, "batch/CARDACCF.cbl")
    : null;
  checks.push({
    id: "batch-cardaccf-shape",
    ok:
      !!cardaccfInv &&
      cardaccfInv.programIds.includes("CARDACCF") &&
      cardaccfInv.occurs >= 1 &&
      cardaccfInv.evaluateWhens.includes("A") &&
      cardaccfInv.evaluateWhens.includes("D") &&
      cardaccfInv.evaluateWhens.includes("C") &&
      /\bPERFORM\s+VARYING\b/i.test(cardaccfSrc) &&
      /\bACCT-DAYS-LATE\s*\(\s*WS-I\s*\)\s*>\s*30\b/i.test(cardaccfSrc) &&
      /\bADD\s+WS-FEE\s+TO\s+WS-TOTAL\b/i.test(cardaccfSrc),
    reason: cardaccfInv
      ? `occurs=${cardaccfInv.occurs} whens=${cardaccfInv.evaluateWhens.join(",")} computes=${cardaccfInv.computes}`
      : "missing-CARDACCF",
  });

  const rptposrnPath = join(MINI, "batch/RPTPOSRN.cbl");
  const rptposrnSrc = existsSync(rptposrnPath) ? readFileSync(rptposrnPath, "utf8") : "";
  const rptposrnInv = rptposrnSrc
    ? inventoryCobolSource(rptposrnSrc, "batch/RPTPOSRN.cbl")
    : null;
  checks.push({
    id: "batch-rptposrn-clbs-report",
    ok:
      !!rptposrnInv &&
      rptposrnInv.programIds.includes("RPTPOSRN") &&
      rptposrnInv.fileIo >= 1 &&
      /\bLINE\s+SEQUENTIAL\b/i.test(rptposrnSrc) &&
      /\bPOSITION-MASTER\b/i.test(rptposrnSrc) &&
      /\bREPORT-FILE\b/i.test(rptposrnSrc) &&
      /\b0000-MAIN\b/i.test(rptposrnSrc) &&
      /\b2000-PROCESS-REPORT\b/i.test(rptposrnSrc) &&
      (rptposrnInv.organizationIndexed || 0) === 0,
    reason: rptposrnInv
      ? `fileIo=${rptposrnInv.fileIo} indexed=${rptposrnInv.organizationIndexed}`
      : "missing-RPTPOSRN",
  });

  const idxaltrnPath = join(MINI, "batch/IDXALTRN.cbl");
  const idxaltrnSrc = existsSync(idxaltrnPath) ? readFileSync(idxaltrnPath, "utf8") : "";
  const idxaltrnInv = idxaltrnSrc
    ? inventoryCobolSource(idxaltrnSrc, "batch/IDXALTRN.cbl")
    : null;
  checks.push({
    id: "batch-idxaltrn-gnucobol-alt-key",
    ok:
      !!idxaltrnInv &&
      idxaltrnInv.programIds.includes("IDXALTRN") &&
      idxaltrnInv.organizationIndexed >= 1 &&
      (idxaltrnInv.recordKeys || []).includes("IDX-KEY") &&
      (idxaltrnInv.alternateRecordKeys || []).includes("IDX-ALT-KEY") &&
      (idxaltrnInv.accessModes || []).includes("DYNAMIC") &&
      /\bKEY\s+IS\s+IDX-ALT-KEY\b/i.test(idxaltrnSrc) &&
      idxaltrnInv.unresolved.includes("indexed-file") &&
      idxaltrnInv.unresolved.includes("alternate-record-key") &&
      idxaltrnInv.unresolved.includes("invalid-key"),
    reason: idxaltrnInv
      ? `indexed=${idxaltrnInv.organizationIndexed} keys=${(idxaltrnInv.recordKeys || []).join(",")} alt=${(idxaltrnInv.alternateRecordKeys || []).join(",")}`
      : "missing-IDXALTRN",
  });

  const cardschdPath = join(MINI, "batch/CARDSCHD.cbl");
  const cardschdSrc = existsSync(cardschdPath) ? readFileSync(cardschdPath, "utf8") : "";
  const cardschdInv = cardschdSrc
    ? inventoryCobolSource(cardschdSrc, "batch/CARDSCHD.cbl")
    : null;
  checks.push({
    id: "batch-cardschd-shape",
    ok:
      !!cardschdInv &&
      cardschdInv.programIds.includes("CARDSCHD") &&
      cardschdInv.occurs >= 2 &&
      cardschdInv.search >= 1 &&
      /\bFS-CODE\b/i.test(cardschdSrc) &&
      /\bTX-AMT\b/i.test(cardschdSrc) &&
      /\bSEARCH\s+FS-ENTRY\b/i.test(cardschdSrc) &&
      /\bADD\s+WS-FEE\s+TO\s+WS-TOTAL\b/i.test(cardschdSrc),
    reason: cardschdInv
      ? `occurs=${cardschdInv.occurs} search=${cardschdInv.search} computes=${cardschdInv.computes}`
      : "missing-CARDSCHD",
  });

  const rptaurnPath = join(MINI, "batch/RPTAUDRN.cbl");
  const rptaurnSrc = existsSync(rptaurnPath) ? readFileSync(rptaurnPath, "utf8") : "";
  const rptaurnInv = rptaurnSrc
    ? inventoryCobolSource(rptaurnSrc, "batch/RPTAUDRN.cbl")
    : null;
  checks.push({
    id: "batch-rptaurn-clbs-audit-report",
    ok:
      !!rptaurnInv &&
      rptaurnInv.programIds.includes("RPTAUDRN") &&
      rptaurnInv.fileIo >= 1 &&
      /\bLINE\s+SEQUENTIAL\b/i.test(rptaurnSrc) &&
      /\bAUDIT-FILE\b/i.test(rptaurnSrc) &&
      /\bERROR-FILE\b/i.test(rptaurnSrc) &&
      /\bREPORT-FILE\b/i.test(rptaurnSrc) &&
      /\b0000-MAIN\b/i.test(rptaurnSrc) &&
      /\b2000-PROCESS-REPORT\b/i.test(rptaurnSrc) &&
      (rptaurnInv.organizationIndexed || 0) === 0,
    reason: rptaurnInv
      ? `fileIo=${rptaurnInv.fileIo} indexed=${rptaurnInv.organizationIndexed}`
      : "missing-RPTAUDRN",
  });

  const idxstrwrPath = join(MINI, "batch/IDXSTRWR.cbl");
  const idxstrwrSrc = existsSync(idxstrwrPath) ? readFileSync(idxstrwrPath, "utf8") : "";
  const idxstrwrInv = idxstrwrSrc
    ? inventoryCobolSource(idxstrwrSrc, "batch/IDXSTRWR.cbl")
    : null;
  checks.push({
    id: "batch-idxstrwr-gnucobol-start-rewrite",
    ok:
      !!idxstrwrInv &&
      idxstrwrInv.programIds.includes("IDXSTRWR") &&
      idxstrwrInv.organizationIndexed >= 1 &&
      (idxstrwrInv.recordKeys || []).includes("IDX-KEY") &&
      (idxstrwrInv.accessModes || []).includes("DYNAMIC") &&
      /\bSTART\s+IDX-FILE\s+KEY\s+IS\s+EQUAL\b/i.test(idxstrwrSrc) &&
      /\bREWRITE\s+IDX-REC\b/i.test(idxstrwrSrc) &&
      /\bADD\s+WS-DELTA\s+TO\s+IDX-AMT\b/i.test(idxstrwrSrc) &&
      !(idxstrwrInv.alternateRecordKeys || []).length &&
      idxstrwrInv.unresolved.includes("indexed-file") &&
      idxstrwrInv.unresolved.includes("invalid-key") &&
      idxstrwrInv.unresolved.includes("file-io"),
    reason: idxstrwrInv
      ? `indexed=${idxstrwrInv.organizationIndexed} keys=${(idxstrwrInv.recordKeys || []).join(",")} alt=${(idxstrwrInv.alternateRecordKeys || []).join(",")}`
      : "missing-IDXSTRWR",
  });

  const rptstarnPath = join(MINI, "batch/RPTSTARN.cbl");
  const rptstarnSrc = existsSync(rptstarnPath) ? readFileSync(rptstarnPath, "utf8") : "";
  const rptstarnInv = rptstarnSrc
    ? inventoryCobolSource(rptstarnSrc, "batch/RPTSTARN.cbl")
    : null;
  checks.push({
    id: "batch-rptstarn-clbs-stats-report",
    ok:
      !!rptstarnInv &&
      rptstarnInv.programIds.includes("RPTSTARN") &&
      rptstarnInv.fileIo >= 1 &&
      /\bLINE\s+SEQUENTIAL\b/i.test(rptstarnSrc) &&
      /\bDB2-STATS\b/i.test(rptstarnSrc) &&
      /\bBATCH-STATS\b/i.test(rptstarnSrc) &&
      /\bREPORT-FILE\b/i.test(rptstarnSrc) &&
      /\b0000-MAIN\b/i.test(rptstarnSrc) &&
      /\b2000-PROCESS-REPORT\b/i.test(rptstarnSrc) &&
      (rptstarnInv.organizationIndexed || 0) === 0,
    reason: rptstarnInv
      ? `fileIo=${rptstarnInv.fileIo} indexed=${rptstarnInv.organizationIndexed}`
      : "missing-RPTSTARN",
  });

  const prcseqrnPath = join(MINI, "batch/PRCSEQRN.cbl");
  const prcseqrnSrc = existsSync(prcseqrnPath) ? readFileSync(prcseqrnPath, "utf8") : "";
  const prcseqrnInv = prcseqrnSrc
    ? inventoryCobolSource(prcseqrnSrc, "batch/PRCSEQRN.cbl")
    : null;
  checks.push({
    id: "batch-prcseqrn-control-using",
    ok:
      !!prcseqrnInv &&
      prcseqrnInv.programIds.includes("PRCSEQRN") &&
      prcseqrnInv.procedureUsing >= 1 &&
      prcseqrnInv.evaluateTrue >= 1 &&
      /\bWHEN\s+FUNC-NEXT\b/i.test(prcseqrnSrc) &&
      /\bCALL\s+"PRCSEQSB"\s+USING\b/i.test(prcseqrnSrc) &&
      !/\bLINE\s+SEQUENTIAL\b/i.test(prcseqrnSrc) &&
      (prcseqrnInv.organizationIndexed || 0) === 0,
    reason: prcseqrnInv
      ? `using=${prcseqrnInv.procedureUsing} evalTrue=${prcseqrnInv.evaluateTrue} ids=${prcseqrnInv.programIds.join(",")}`
      : "missing-PRCSEQRN",
  });

  const idxdelrnPath = join(MINI, "batch/IDXDELRN.cbl");
  const idxdelrnSrc = existsSync(idxdelrnPath) ? readFileSync(idxdelrnPath, "utf8") : "";
  const idxdelrnInv = idxdelrnSrc
    ? inventoryCobolSource(idxdelrnSrc, "batch/IDXDELRN.cbl")
    : null;
  checks.push({
    id: "batch-idxdelrn-gnucobol-delete",
    ok:
      !!idxdelrnInv &&
      idxdelrnInv.programIds.includes("IDXDELRN") &&
      idxdelrnInv.organizationIndexed >= 1 &&
      (idxdelrnInv.recordKeys || []).includes("IDX-KEY") &&
      /\bDELETE\s+IDX-FILE\s+RECORD\b/i.test(idxdelrnSrc) &&
      !(idxdelrnInv.alternateRecordKeys || []).length &&
      idxdelrnInv.unresolved.includes("indexed-file") &&
      idxdelrnInv.unresolved.includes("invalid-key"),
    reason: idxdelrnInv
      ? `indexed=${idxdelrnInv.organizationIndexed} keys=${(idxdelrnInv.recordKeys || []).join(",")}`
      : "missing-IDXDELRN",
  });

  const idxaltrwPath = join(MINI, "batch/IDXALTRW.cbl");
  const idxaltrwSrc = existsSync(idxaltrwPath) ? readFileSync(idxaltrwPath, "utf8") : "";
  const idxaltrwInv = idxaltrwSrc
    ? inventoryCobolSource(idxaltrwSrc, "batch/IDXALTRW.cbl")
    : null;
  checks.push({
    id: "batch-idxaltrw-gnucobol-alt-start-rewrite",
    ok:
      !!idxaltrwInv &&
      idxaltrwInv.programIds.includes("IDXALTRW") &&
      idxaltrwInv.organizationIndexed >= 1 &&
      (idxaltrwInv.alternateRecordKeys || []).includes("IDX-ALT-KEY") &&
      /\bSTART\s+IDX-FILE\s+KEY\s+IS\s+EQUAL\s+TO\s+IDX-ALT-KEY\b/i.test(idxaltrwSrc) &&
      /\bREWRITE\s+IDX-REC\b/i.test(idxaltrwSrc) &&
      /\bADD\s+WS-DELTA\s+TO\s+IDX-AMT\b/i.test(idxaltrwSrc) &&
      idxaltrwInv.unresolved.includes("indexed-file") &&
      idxaltrwInv.unresolved.includes("alternate-record-key") &&
      idxaltrwInv.unresolved.includes("invalid-key"),
    reason: idxaltrwInv
      ? `indexed=${idxaltrwInv.organizationIndexed} alt=${(idxaltrwInv.alternateRecordKeys || []).join(",")}`
      : "missing-IDXALTRW",
  });

  const rtnanarnPath = join(MINI, "batch/RTNANARN.cbl");
  const rtnanarnSrc = existsSync(rtnanarnPath) ? readFileSync(rtnanarnPath, "utf8") : "";
  const rtnanarnInv = rtnanarnSrc
    ? inventoryCobolSource(rtnanarnSrc, "batch/RTNANARN.cbl")
    : null;
  checks.push({
    id: "batch-rtnanarn-clbs-rtn-analysis",
    ok:
      !!rtnanarnInv &&
      rtnanarnInv.programIds.includes("RTNANARN") &&
      rtnanarnInv.fileIo >= 1 &&
      /\bLINE\s+SEQUENTIAL\b/i.test(rtnanarnSrc) &&
      /\bRC-FILE\b/i.test(rtnanarnSrc) &&
      /\bREPORT-FILE\b/i.test(rtnanarnSrc) &&
      /\bP100-INIT-PROGRAM\b/i.test(rtnanarnSrc) &&
      /\bP200-PROCESS-ANALYSIS\b/i.test(rtnanarnSrc) &&
      /\bP300-GENERATE-REPORT\b/i.test(rtnanarnSrc) &&
      (rtnanarnInv.organizationIndexed || 0) === 0,
    reason: rtnanarnInv
      ? `fileIo=${rtnanarnInv.fileIo} indexed=${rtnanarnInv.organizationIndexed}`
      : "missing-RTNANARN",
  });

  const bchctlrnPath = join(MINI, "batch/BCHCTLRN.cbl");
  const bchctlrnSrc = existsSync(bchctlrnPath) ? readFileSync(bchctlrnPath, "utf8") : "";
  const bchctlrnInv = bchctlrnSrc
    ? inventoryCobolSource(bchctlrnSrc, "batch/BCHCTLRN.cbl")
    : null;
  checks.push({
    id: "batch-bchctlrn-control-using",
    ok:
      !!bchctlrnInv &&
      bchctlrnInv.programIds.includes("BCHCTLRN") &&
      bchctlrnInv.procedureUsing >= 1 &&
      bchctlrnInv.evaluateTrue >= 1 &&
      /\bWHEN\s+FUNC-CHEK\b/i.test(bchctlrnSrc) &&
      /\bWHEN\s+FUNC-UPDT\b/i.test(bchctlrnSrc) &&
      /\bCALL\s+"BCHCTLSB"\s+USING\b/i.test(bchctlrnSrc) &&
      !/\bLINE\s+SEQUENTIAL\b/i.test(bchctlrnSrc) &&
      (bchctlrnInv.organizationIndexed || 0) === 0,
    reason: bchctlrnInv
      ? `using=${bchctlrnInv.procedureUsing} evalTrue=${bchctlrnInv.evaluateTrue} ids=${bchctlrnInv.programIds.join(",")}`
      : "missing-BCHCTLRN",
  });

  const posupdrnPath = join(MINI, "batch/POSUPDRN.cbl");
  const posupdrnSrc = existsSync(posupdrnPath) ? readFileSync(posupdrnPath, "utf8") : "";
  const posupdrnInv = posupdrnSrc
    ? inventoryCobolSource(posupdrnSrc, "batch/POSUPDRN.cbl")
    : null;
  const upstreamPosupdtPath = join(MINI, "_upstream/POSUPDT.cbl");
  const upstreamPosupdtSize = existsSync(upstreamPosupdtPath)
    ? statSync(upstreamPosupdtPath).size
    : -1;
  checks.push({
    id: "batch-posupdrn-clbs-position-update",
    ok:
      !!posupdrnInv &&
      posupdrnInv.programIds.includes("POSUPDRN") &&
      posupdrnInv.fileIo >= 1 &&
      /\bLINE\s+SEQUENTIAL\b/i.test(posupdrnSrc) &&
      /\bTXN-FILE\b/i.test(posupdrnSrc) &&
      /\bPOS-FILE\b/i.test(posupdrnSrc) &&
      /\bHIST-FILE\b/i.test(posupdrnSrc) &&
      /\b2000-APPLY-UPDATES\b/i.test(posupdrnSrc) &&
      (posupdrnInv.organizationIndexed || 0) === 0 &&
      upstreamPosupdtSize >= 0 &&
      upstreamPosupdtSize <= 2,
    reason: posupdrnInv
      ? `fileIo=${posupdrnInv.fileIo} indexed=${posupdrnInv.organizationIndexed} upstreamPosupdtBytes=${upstreamPosupdtSize}`
      : "missing-POSUPDRN",
  });

  const rcvprcrnPath = join(MINI, "batch/RCVPRCRN.cbl");
  const rcvprcrnSrc = existsSync(rcvprcrnPath) ? readFileSync(rcvprcrnPath, "utf8") : "";
  const rcvprcrnInv = rcvprcrnSrc
    ? inventoryCobolSource(rcvprcrnSrc, "batch/RCVPRCRN.cbl")
    : null;
  checks.push({
    id: "batch-rcvprcrn-control-using",
    ok:
      !!rcvprcrnInv &&
      rcvprcrnInv.programIds.includes("RCVPRCRN") &&
      rcvprcrnInv.procedureUsing >= 1 &&
      rcvprcrnInv.evaluateTrue >= 1 &&
      /\bWHEN\s+FUNC-RECV\b/i.test(rcvprcrnSrc) &&
      /\bWHEN\s+FUNC-TERM\b/i.test(rcvprcrnSrc) &&
      /\bCALL\s+"RCVPRCSB"\s+USING\b/i.test(rcvprcrnSrc) &&
      !/\bLINE\s+SEQUENTIAL\b/i.test(rcvprcrnSrc) &&
      (rcvprcrnInv.organizationIndexed || 0) === 0,
    reason: rcvprcrnInv
      ? `using=${rcvprcrnInv.procedureUsing} evalTrue=${rcvprcrnInv.evaluateTrue} ids=${rcvprcrnInv.programIds.join(",")}`
      : "missing-RCVPRCRN",
  });

  const rtncdernPath = join(MINI, "batch/RTNCDERN.cbl");
  const rtncdernSrc = existsSync(rtncdernPath) ? readFileSync(rtncdernPath, "utf8") : "";
  const rtncdernInv = rtncdernSrc
    ? inventoryCobolSource(rtncdernSrc, "batch/RTNCDERN.cbl")
    : null;
  checks.push({
    id: "batch-rtncdern-control-using",
    ok:
      !!rtncdernInv &&
      rtncdernInv.programIds.includes("RTNCDERN") &&
      rtncdernInv.procedureUsing >= 1 &&
      rtncdernInv.evaluateTrue >= 1 &&
      /\bWHEN\s+FUNC-SETC\b/i.test(rtncdernSrc) &&
      /\bWHEN\s+FUNC-ANLZ\b/i.test(rtncdernSrc) &&
      /\bCALL\s+"RTNCDESB"\s+USING\b/i.test(rtncdernSrc) &&
      !/\bEXEC\s+SQL\b/i.test(rtncdernSrc) &&
      !/\bLINE\s+SEQUENTIAL\b/i.test(rtncdernSrc) &&
      (rtncdernInv.organizationIndexed || 0) === 0,
    reason: rtncdernInv
      ? `using=${rtncdernInv.procedureUsing} evalTrue=${rtncdernInv.evaluateTrue} ids=${rtncdernInv.programIds.join(",")}`
      : "missing-RTNCDERN",
  });

  const utlmntrnPath = join(MINI, "batch/UTLMNTRN.cbl");
  const utlmntrnSrc = existsSync(utlmntrnPath) ? readFileSync(utlmntrnPath, "utf8") : "";
  const utlmntrnInv = utlmntrnSrc
    ? inventoryCobolSource(utlmntrnSrc, "batch/UTLMNTRN.cbl")
    : null;
  checks.push({
    id: "batch-utlmntrn-control-using",
    ok:
      !!utlmntrnInv &&
      utlmntrnInv.programIds.includes("UTLMNTRN") &&
      utlmntrnInv.procedureUsing >= 1 &&
      utlmntrnInv.evaluateTrue >= 1 &&
      /\bWHEN\s+FUNC-ARCH\b/i.test(utlmntrnSrc) &&
      /\bWHEN\s+FUNC-ANYS\b/i.test(utlmntrnSrc) &&
      /\bCALL\s+"UTLMNTSB"\s+USING\b/i.test(utlmntrnSrc) &&
      !/\bLINE\s+SEQUENTIAL\b/i.test(utlmntrnSrc) &&
      (utlmntrnInv.organizationIndexed || 0) === 0,
    reason: utlmntrnInv
      ? `using=${utlmntrnInv.procedureUsing} evalTrue=${utlmntrnInv.evaluateTrue} ids=${utlmntrnInv.programIds.join(",")}`
      : "missing-UTLMNTRN",
  });

  const utlvalrnPath = join(MINI, "batch/UTLVALRN.cbl");
  const utlvalrnSrc = existsSync(utlvalrnPath) ? readFileSync(utlvalrnPath, "utf8") : "";
  const utlvalrnInv = utlvalrnSrc
    ? inventoryCobolSource(utlvalrnSrc, "batch/UTLVALRN.cbl")
    : null;
  checks.push({
    id: "batch-utlvalrn-control-using",
    ok:
      !!utlvalrnInv &&
      utlvalrnInv.programIds.includes("UTLVALRN") &&
      utlvalrnInv.procedureUsing >= 1 &&
      utlvalrnInv.evaluateTrue >= 1 &&
      /\bWHEN\s+FUNC-INTG\b/i.test(utlvalrnSrc) &&
      /\bWHEN\s+FUNC-BAL\b/i.test(utlvalrnSrc) &&
      /\bCALL\s+"UTLVALSB"\s+USING\b/i.test(utlvalrnSrc) &&
      !/\bLINE\s+SEQUENTIAL\b/i.test(utlvalrnSrc) &&
      (utlvalrnInv.organizationIndexed || 0) === 0,
    reason: utlvalrnInv
      ? `using=${utlvalrnInv.procedureUsing} evalTrue=${utlvalrnInv.evaluateTrue} ids=${utlvalrnInv.programIds.join(",")}`
      : "missing-UTLVALRN",
  });

  const idxgtnrnPath = join(MINI, "batch/IDXGTNRN.cbl");
  const idxgtnrnSrc = existsSync(idxgtnrnPath) ? readFileSync(idxgtnrnPath, "utf8") : "";
  const idxgtnrnInv = idxgtnrnSrc
    ? inventoryCobolSource(idxgtnrnSrc, "batch/IDXGTNRN.cbl")
    : null;
  checks.push({
    id: "batch-idxgtnrn-gnucobol-start-gt-next",
    ok:
      !!idxgtnrnInv &&
      idxgtnrnInv.programIds.includes("IDXGTNRN") &&
      idxgtnrnInv.organizationIndexed >= 1 &&
      (idxgtnrnInv.recordKeys || []).includes("IDX-KEY") &&
      (idxgtnrnInv.accessModes || []).includes("DYNAMIC") &&
      /\bSTART\s+IDX-FILE\s+KEY\s+IS\s+GREATER\s+THAN\b/i.test(idxgtnrnSrc) &&
      /\bREAD\s+IDX-FILE\s+NEXT\b/i.test(idxgtnrnSrc) &&
      /\bADD\s+IDX-AMT\s+TO\s+WS-SUM\b/i.test(idxgtnrnSrc) &&
      !(idxgtnrnInv.alternateRecordKeys || []).length &&
      idxgtnrnInv.unresolved.includes("indexed-file") &&
      idxgtnrnInv.unresolved.includes("invalid-key") &&
      idxgtnrnInv.unresolved.includes("file-io"),
    reason: idxgtnrnInv
      ? `indexed=${idxgtnrnInv.organizationIndexed} keys=${(idxgtnrnInv.recordKeys || []).join(",")}`
      : "missing-IDXGTNRN",
  });

  const utlmonrnPath = join(MINI, "batch/UTLMONRN.cbl");
  const utlmonrnSrc = existsSync(utlmonrnPath) ? readFileSync(utlmonrnPath, "utf8") : "";
  const utlmonrnInv = utlmonrnSrc
    ? inventoryCobolSource(utlmonrnSrc, "batch/UTLMONRN.cbl")
    : null;
  checks.push({
    id: "batch-utlmonrn-control-using",
    ok:
      !!utlmonrnInv &&
      utlmonrnInv.programIds.includes("UTLMONRN") &&
      utlmonrnInv.procedureUsing >= 1 &&
      utlmonrnInv.evaluateTrue >= 1 &&
      /\bWHEN\s+FUNC-THRS\b/i.test(utlmonrnSrc) &&
      /\bWHEN\s+FUNC-ALRT\b/i.test(utlmonrnSrc) &&
      /\bCALL\s+"UTLMONSB"\s+USING\b/i.test(utlmonrnSrc) &&
      !/\bLINE\s+SEQUENTIAL\b/i.test(utlmonrnSrc) &&
      (utlmonrnInv.organizationIndexed || 0) === 0,
    reason: utlmonrnInv
      ? `using=${utlmonrnInv.procedureUsing} evalTrue=${utlmonrnInv.evaluateTrue} ids=${utlmonrnInv.programIds.join(",")}`
      : "missing-UTLMONRN",
  });

  const tstvalrnPath = join(MINI, "batch/TSTVALRN.cbl");
  const tstvalrnSrc = existsSync(tstvalrnPath) ? readFileSync(tstvalrnPath, "utf8") : "";
  const tstvalrnInv = tstvalrnSrc
    ? inventoryCobolSource(tstvalrnSrc, "batch/TSTVALRN.cbl")
    : null;
  checks.push({
    id: "batch-tstvalrn-control-using",
    ok:
      !!tstvalrnInv &&
      tstvalrnInv.programIds.includes("TSTVALRN") &&
      tstvalrnInv.procedureUsing >= 1 &&
      tstvalrnInv.evaluateTrue >= 1 &&
      /\bWHEN\s+FUNC-PERF\b/i.test(tstvalrnSrc) &&
      /\bWHEN\s+FUNC-ERR\b/i.test(tstvalrnSrc) &&
      /\bCALL\s+"TSTVALSB"\s+USING\b/i.test(tstvalrnSrc) &&
      !/\bLINE\s+SEQUENTIAL\b/i.test(tstvalrnSrc) &&
      (tstvalrnInv.organizationIndexed || 0) === 0,
    reason: tstvalrnInv
      ? `using=${tstvalrnInv.procedureUsing} evalTrue=${tstvalrnInv.evaluateTrue} ids=${tstvalrnInv.programIds.join(",")}`
      : "missing-TSTVALRN",
  });

  const portvalrnPath = join(MINI, "batch/PORTVALRN.cbl");
  const portvalrnSrc = existsSync(portvalrnPath) ? readFileSync(portvalrnPath, "utf8") : "";
  const portvalrnInv = portvalrnSrc
    ? inventoryCobolSource(portvalrnSrc, "batch/PORTVALRN.cbl")
    : null;
  checks.push({
    id: "batch-portvalrn-control-using",
    ok:
      !!portvalrnInv &&
      portvalrnInv.programIds.includes("PORTVALRN") &&
      portvalrnInv.procedureUsing >= 1 &&
      portvalrnInv.evaluateTrue >= 1 &&
      /\bWHEN\s+FUNC-VTYP\b/i.test(portvalrnSrc) &&
      /\bWHEN\s+FUNC-VAMT\b/i.test(portvalrnSrc) &&
      /\bCALL\s+"PORTVALSB"\s+USING\b/i.test(portvalrnSrc) &&
      /STK|BND|MMF|ETF/i.test(portvalrnSrc) &&
      (portvalrnInv.organizationIndexed || 0) === 0,
    reason: portvalrnInv
      ? `using=${portvalrnInv.procedureUsing} evalTrue=${portvalrnInv.evaluateTrue} ids=${portvalrnInv.programIds.join(",")}`
      : "missing-PORTVALRN",
  });

  const idxnlprnPath = join(MINI, "batch/IDXNLPRN.cbl");
  const idxnlprnSrc = existsSync(idxnlprnPath) ? readFileSync(idxnlprnPath, "utf8") : "";
  const idxnlprnInv = idxnlprnSrc
    ? inventoryCobolSource(idxnlprnSrc, "batch/IDXNLPRN.cbl")
    : null;
  checks.push({
    id: "batch-idxnlprn-gnucobol-start-nless-prev",
    ok:
      !!idxnlprnInv &&
      idxnlprnInv.programIds.includes("IDXNLPRN") &&
      idxnlprnInv.organizationIndexed >= 1 &&
      (idxnlprnInv.recordKeys || []).includes("IDX-KEY") &&
      (idxnlprnInv.accessModes || []).includes("DYNAMIC") &&
      /\bSTART\s+IDX-FILE\s+KEY\s+IS\s+NOT\s+LESS\s+THAN\b/i.test(idxnlprnSrc) &&
      /\bREAD\s+IDX-FILE\s+PREVIOUS\b/i.test(idxnlprnSrc) &&
      /\bADD\s+IDX-AMT\s+TO\s+WS-SUM\b/i.test(idxnlprnSrc) &&
      !(idxnlprnInv.alternateRecordKeys || []).length &&
      idxnlprnInv.unresolved.includes("indexed-file") &&
      idxnlprnInv.unresolved.includes("invalid-key") &&
      idxnlprnInv.unresolved.includes("file-io"),
    reason: idxnlprnInv
      ? `indexed=${idxnlprnInv.organizationIndexed} keys=${(idxnlprnInv.recordKeys || []).join(",")}`
      : "missing-IDXNLPRN",
  });

  const utlmntlsPath = join(MINI, "batch/UTLMNTLS.cbl");
  const utlmntlsSrc = existsSync(utlmntlsPath) ? readFileSync(utlmntlsPath, "utf8") : "";
  const utlmntlsInv = utlmntlsSrc
    ? inventoryCobolSource(utlmntlsSrc, "batch/UTLMNTLS.cbl")
    : null;
  checks.push({
    id: "batch-utlmntls-line-sequential-control",
    ok:
      !!utlmntlsInv &&
      utlmntlsInv.programIds.includes("UTLMNTLS") &&
      /\bLINE\s+SEQUENTIAL\b/i.test(utlmntlsSrc) &&
      /\bEVALUATE\s+CTL-FUNCTION\b/i.test(utlmntlsSrc) &&
      /\bWHEN\s+WS-ARCHIVE\b/i.test(utlmntlsSrc) &&
      /\bWHEN\s+WS-REORG\b/i.test(utlmntlsSrc) &&
      /\bADD\s+WS-RC\s+TO\s+WS-SUM\b/i.test(utlmntlsSrc) &&
      (utlmntlsInv.organizationIndexed || 0) === 0 &&
      (utlmntlsInv.evaluateTrue || 0) === 0,
    reason: utlmntlsInv
      ? `ids=${utlmntlsInv.programIds.join(",")} lineSeq=${/\bLINE\s+SEQUENTIAL\b/i.test(utlmntlsSrc)}`
      : "missing-UTLMNTLS",
  });

  const tstgenrnPath = join(MINI, "batch/TSTGENRN.cbl");
  const tstgenrnSrc = existsSync(tstgenrnPath) ? readFileSync(tstgenrnPath, "utf8") : "";
  const tstgenrnInv = tstgenrnSrc
    ? inventoryCobolSource(tstgenrnSrc, "batch/TSTGENRN.cbl")
    : null;
  checks.push({
    id: "batch-tstgenrn-line-sequential-config",
    ok:
      !!tstgenrnInv &&
      tstgenrnInv.programIds.includes("TSTGENRN") &&
      /\bLINE\s+SEQUENTIAL\b/i.test(tstgenrnSrc) &&
      /\bEVALUATE\s+CFG-TEST-TYPE\b/i.test(tstgenrnSrc) &&
      /\bWHEN\s+WS-PORTFOLIO\b/i.test(tstgenrnSrc) &&
      /\bWHEN\s+WS-VOLUME-TEST\b/i.test(tstgenrnSrc) &&
      /\bADD\s+WS-RC\s+TO\s+WS-SUM\b/i.test(tstgenrnSrc) &&
      (tstgenrnInv.organizationIndexed || 0) === 0 &&
      (tstgenrnInv.evaluateTrue || 0) === 0,
    reason: tstgenrnInv
      ? `ids=${tstgenrnInv.programIds.join(",")} lineSeq=${/\bLINE\s+SEQUENTIAL\b/i.test(tstgenrnSrc)}`
      : "missing-TSTGENRN",
  });

  const portaddrnPath = join(MINI, "batch/PORTADDRN.cbl");
  const portaddrnSrc = existsSync(portaddrnPath) ? readFileSync(portaddrnPath, "utf8") : "";
  const portaddrnInv = portaddrnSrc
    ? inventoryCobolSource(portaddrnSrc, "batch/PORTADDRN.cbl")
    : null;
  checks.push({
    id: "batch-portaddrn-line-sequential-add",
    ok:
      !!portaddrnInv &&
      portaddrnInv.programIds.includes("PORTADDRN") &&
      /\bLINE\s+SEQUENTIAL\b/i.test(portaddrnSrc) &&
      /\bADD\s+1\s+TO\s+WS-ADD-COUNT\b/i.test(portaddrnSrc) &&
      /\bPORT-STATUS\s+NOT\s+EQUAL\s+'A'/i.test(portaddrnSrc) &&
      (portaddrnInv.organizationIndexed || 0) === 0,
    reason: portaddrnInv
      ? `ids=${portaddrnInv.programIds.join(",")} lineSeq=${/\bLINE\s+SEQUENTIAL\b/i.test(portaddrnSrc)}`
      : "missing-PORTADDRN",
  });

  const portupdrnPath = join(MINI, "batch/PORTUPDRN.cbl");
  const portupdrnSrc = existsSync(portupdrnPath) ? readFileSync(portupdrnPath, "utf8") : "";
  const portupdrnInv = portupdrnSrc
    ? inventoryCobolSource(portupdrnSrc, "batch/PORTUPDRN.cbl")
    : null;
  checks.push({
    id: "batch-portupdrn-line-sequential-update",
    ok:
      !!portupdrnInv &&
      portupdrnInv.programIds.includes("PORTUPDRN") &&
      /\bLINE\s+SEQUENTIAL\b/i.test(portupdrnSrc) &&
      portupdrnInv.evaluateTrue >= 1 &&
      /\bWHEN\s+UPDT-STATUS\b/i.test(portupdrnSrc) &&
      /\bWHEN\s+UPDT-VALUE\b/i.test(portupdrnSrc) &&
      /\bWHEN\s+UPDT-NAME\b/i.test(portupdrnSrc) &&
      /\bADD\s+WS-RC\s+TO\s+WS-SUM\b/i.test(portupdrnSrc) &&
      (portupdrnInv.organizationIndexed || 0) === 0,
    reason: portupdrnInv
      ? `ids=${portupdrnInv.programIds.join(",")} evalTrue=${portupdrnInv.evaluateTrue}`
      : "missing-PORTUPDRN",
  });

  const idxltprnPath = join(MINI, "batch/IDXLTPRN.cbl");
  const idxltprnSrc = existsSync(idxltprnPath) ? readFileSync(idxltprnPath, "utf8") : "";
  const idxltprnInv = idxltprnSrc
    ? inventoryCobolSource(idxltprnSrc, "batch/IDXLTPRN.cbl")
    : null;
  checks.push({
    id: "batch-idxltprn-gnucobol-start-less-prev",
    ok:
      !!idxltprnInv &&
      idxltprnInv.programIds.includes("IDXLTPRN") &&
      idxltprnInv.organizationIndexed >= 1 &&
      (idxltprnInv.recordKeys || []).includes("IDX-KEY") &&
      (idxltprnInv.accessModes || []).includes("DYNAMIC") &&
      /\bSTART\s+IDX-FILE\s+KEY\s+IS\s+LESS\s+THAN\b/i.test(idxltprnSrc) &&
      !/\bKEY\s+IS\s+NOT\s+LESS\s+THAN\b/i.test(idxltprnSrc) &&
      /\bREAD\s+IDX-FILE\s+PREVIOUS\b/i.test(idxltprnSrc) &&
      /\bADD\s+IDX-AMT\s+TO\s+WS-SUM\b/i.test(idxltprnSrc) &&
      !(idxltprnInv.alternateRecordKeys || []).length &&
      idxltprnInv.unresolved.includes("indexed-file") &&
      idxltprnInv.unresolved.includes("invalid-key") &&
      idxltprnInv.unresolved.includes("file-io"),
    reason: idxltprnInv
      ? `indexed=${idxltprnInv.organizationIndexed} keys=${(idxltprnInv.recordKeys || []).join(",")}`
      : "missing-IDXLTPRN",
  });

  const portdelrnPath = join(MINI, "batch/PORTDELRN.cbl");
  const portdelrnSrc = existsSync(portdelrnPath) ? readFileSync(portdelrnPath, "utf8") : "";
  const portdelrnInv = portdelrnSrc
    ? inventoryCobolSource(portdelrnSrc, "batch/PORTDELRN.cbl")
    : null;
  checks.push({
    id: "batch-portdelrn-line-sequential-delete",
    ok:
      !!portdelrnInv &&
      portdelrnInv.programIds.includes("PORTDELRN") &&
      /\bLINE\s+SEQUENTIAL\b/i.test(portdelrnSrc) &&
      portdelrnInv.evaluateTrue >= 1 &&
      /\bWHEN\s+DEL-CLOSED\b/i.test(portdelrnSrc) &&
      /\bWHEN\s+DEL-TRANSFERRED\b/i.test(portdelrnSrc) &&
      /\bWHEN\s+DEL-REQUESTED\b/i.test(portdelrnSrc) &&
      /\bADD\s+WS-RC\s+TO\s+WS-SUM\b/i.test(portdelrnSrc) &&
      (portdelrnInv.organizationIndexed || 0) === 0,
    reason: portdelrnInv
      ? `ids=${portdelrnInv.programIds.join(",")} evalTrue=${portdelrnInv.evaluateTrue}`
      : "missing-PORTDELRN",
  });

  const portreadrnPath = join(MINI, "batch/PORTREADRN.cbl");
  const portreadrnSrc = existsSync(portreadrnPath) ? readFileSync(portreadrnPath, "utf8") : "";
  const portreadrnInv = portreadrnSrc
    ? inventoryCobolSource(portreadrnSrc, "batch/PORTREADRN.cbl")
    : null;
  checks.push({
    id: "batch-portreadrn-line-sequential-read",
    ok:
      !!portreadrnInv &&
      portreadrnInv.programIds.includes("PORTREADRN") &&
      /\bLINE\s+SEQUENTIAL\b/i.test(portreadrnSrc) &&
      /\bADD\s+1\s+TO\s+WS-RECORD-COUNT\b/i.test(portreadrnSrc) &&
      (portreadrnInv.organizationIndexed || 0) === 0,
    reason: portreadrnInv
      ? `ids=${portreadrnInv.programIds.join(",")} lineSeq=${/\bLINE\s+SEQUENTIAL\b/i.test(portreadrnSrc)}`
      : "missing-PORTREADRN",
  });

  const porttranrnPath = join(MINI, "batch/PORTTRANRN.cbl");
  const porttranrnSrc = existsSync(porttranrnPath) ? readFileSync(porttranrnPath, "utf8") : "";
  const porttranrnInv = porttranrnSrc
    ? inventoryCobolSource(porttranrnSrc, "batch/PORTTRANRN.cbl")
    : null;
  checks.push({
    id: "batch-porttranrn-line-sequential-tran",
    ok:
      !!porttranrnInv &&
      porttranrnInv.programIds.includes("PORTTRANRN") &&
      /\bLINE\s+SEQUENTIAL\b/i.test(porttranrnSrc) &&
      /\bEVALUATE\s+TRN-TYPE\b/i.test(porttranrnSrc) &&
      /\bWHEN\s+'BU'/i.test(porttranrnSrc) &&
      /\bWHEN\s+'SL'/i.test(porttranrnSrc) &&
      /\bWHEN\s+'TR'/i.test(porttranrnSrc) &&
      /\bWHEN\s+'FE'/i.test(porttranrnSrc) &&
      /\bADD\s+WS-RC\s+TO\s+WS-SUM\b/i.test(porttranrnSrc) &&
      (porttranrnInv.organizationIndexed || 0) === 0,
    reason: porttranrnInv
      ? `ids=${porttranrnInv.programIds.join(",")} evaluateTrn=${/\bEVALUATE\s+TRN-TYPE\b/i.test(porttranrnSrc)}`
      : "missing-PORTTRANRN",
  });

  const idxeqprnPath = join(MINI, "batch/IDXEQPRN.cbl");
  const idxeqprnSrc = existsSync(idxeqprnPath) ? readFileSync(idxeqprnPath, "utf8") : "";
  const idxeqprnInv = idxeqprnSrc
    ? inventoryCobolSource(idxeqprnSrc, "batch/IDXEQPRN.cbl")
    : null;
  checks.push({
    id: "batch-idxeqprn-gnucobol-start-equal-prev",
    ok:
      !!idxeqprnInv &&
      idxeqprnInv.programIds.includes("IDXEQPRN") &&
      idxeqprnInv.organizationIndexed >= 1 &&
      (idxeqprnInv.recordKeys || []).includes("IDX-KEY") &&
      (idxeqprnInv.accessModes || []).includes("DYNAMIC") &&
      /\bSTART\s+IDX-FILE\s+KEY\s+IS\s+EQUAL\s+TO\b/i.test(idxeqprnSrc) &&
      /\bREAD\s+IDX-FILE\s+PREVIOUS\b/i.test(idxeqprnSrc) &&
      !/\bREWRITE\s+/i.test(idxeqprnSrc) &&
      /\bADD\s+IDX-AMT\s+TO\s+WS-SUM\b/i.test(idxeqprnSrc) &&
      !(idxeqprnInv.alternateRecordKeys || []).length &&
      idxeqprnInv.unresolved.includes("indexed-file") &&
      idxeqprnInv.unresolved.includes("invalid-key") &&
      idxeqprnInv.unresolved.includes("file-io"),
    reason: idxeqprnInv
      ? `indexed=${idxeqprnInv.organizationIndexed} keys=${(idxeqprnInv.recordKeys || []).join(",")}`
      : "missing-IDXEQPRN",
  });

  const idxngtrnPath = join(MINI, "batch/IDXNGTRN.cbl");
  const idxngtrnSrc = existsSync(idxngtrnPath) ? readFileSync(idxngtrnPath, "utf8") : "";
  const idxngtrnInv = idxngtrnSrc
    ? inventoryCobolSource(idxngtrnSrc, "batch/IDXNGTRN.cbl")
    : null;
  checks.push({
    id: "batch-idxngtrn-gnucobol-start-ngt-next",
    ok:
      !!idxngtrnInv &&
      idxngtrnInv.programIds.includes("IDXNGTRN") &&
      idxngtrnInv.organizationIndexed >= 1 &&
      (idxngtrnInv.recordKeys || []).includes("IDX-KEY") &&
      (idxngtrnInv.accessModes || []).includes("DYNAMIC") &&
      /\bSTART\s+IDX-FILE\s+KEY\s+IS\s+NOT\s+GREATER\s+THAN\b/i.test(idxngtrnSrc) &&
      /\bREAD\s+IDX-FILE\s+NEXT\b/i.test(idxngtrnSrc) &&
      !/\bREWRITE\s+/i.test(idxngtrnSrc) &&
      /\bADD\s+IDX-AMT\s+TO\s+WS-SUM\b/i.test(idxngtrnSrc) &&
      !(idxngtrnInv.alternateRecordKeys || []).length &&
      idxngtrnInv.unresolved.includes("indexed-file") &&
      idxngtrnInv.unresolved.includes("invalid-key") &&
      idxngtrnInv.unresolved.includes("file-io"),
    reason: idxngtrnInv
      ? `indexed=${idxngtrnInv.organizationIndexed} keys=${(idxngtrnInv.recordKeys || []).join(",")}`
      : "missing-IDXNGTRN",
  });

  const portmstrnPath = join(MINI, "batch/PORTMSTRN.cbl");
  const portmstrnSrc = existsSync(portmstrnPath) ? readFileSync(portmstrnPath, "utf8") : "";
  const portmstrnInv = portmstrnSrc
    ? inventoryCobolSource(portmstrnSrc, "batch/PORTMSTRN.cbl")
    : null;
  checks.push({
    id: "batch-portmstrn-control-using",
    ok:
      !!portmstrnInv &&
      portmstrnInv.programIds.includes("PORTMSTRN") &&
      portmstrnInv.procedureUsing >= 1 &&
      portmstrnInv.evaluateTrue >= 1 &&
      /\bWHEN\s+CREATE-PORT\b/i.test(portmstrnSrc) &&
      /\bWHEN\s+READ-PORT\b/i.test(portmstrnSrc) &&
      /\bWHEN\s+UPDATE-PORT\b/i.test(portmstrnSrc) &&
      /\bWHEN\s+DELETE-PORT\b/i.test(portmstrnSrc) &&
      /\bCALL\s+"PORTMSTRSB"\s+USING\b/i.test(portmstrnSrc) &&
      !/\bLINE\s+SEQUENTIAL\b/i.test(portmstrnSrc) &&
      (portmstrnInv.organizationIndexed || 0) === 0,
    reason: portmstrnInv
      ? `using=${portmstrnInv.procedureUsing} evalTrue=${portmstrnInv.evaluateTrue} ids=${portmstrnInv.programIds.join(",")}`
      : "missing-PORTMSTRN",
  });

  const portvaldnPath = join(MINI, "batch/PORTVALDN.cbl");
  const portvaldnSrc = existsSync(portvaldnPath) ? readFileSync(portvaldnPath, "utf8") : "";
  const portvaldnInv = portvaldnSrc
    ? inventoryCobolSource(portvaldnSrc, "batch/PORTVALDN.cbl")
    : null;
  const portvaldnResolve = resolveCobolCopybooks(portvaldnInv?.copybooks || [], [
    join(MINI, "copybook"),
  ]);
  const portvaldnResolved = portvaldnResolve
    .filter((r) => r.resolved)
    .map((r) => r.name.toUpperCase());
  checks.push({
    id: "batch-portvaldn-copy-linked-behavioral",
    ok:
      !!portvaldnInv &&
      portvaldnInv.programIds.includes("PORTVALDN") &&
      (portvaldnInv.copybooks || []).map((c) => c.toUpperCase()).includes("PORTVAL") &&
      portvaldnResolved.includes("PORTVAL") &&
      portvaldnInv.evaluateTrue >= 1 &&
      /\bVAL-ID-PREFIX\b/i.test(portvaldnSrc) &&
      /\bVAL-INVALID-ID\b/i.test(portvaldnSrc) &&
      (portvaldnInv.organizationIndexed || 0) === 0 &&
      portvaldnInv.unresolved.includes("copy"),
    reason: portvaldnInv
      ? `books=${(portvaldnInv.copybooks || []).join(",")} resolved=${portvaldnResolved.join(",")}`
      : "missing-PORTVALDN",
  });

  const upstreamJclDir = join(MINI, "_upstream");
  const upstreamJclFiles = existsSync(upstreamJclDir)
    ? readdirSync(upstreamJclDir).filter((n) => n.toLowerCase().endsWith(".jcl"))
    : [];
  const upstreamBmsFiles = existsSync(upstreamJclDir)
    ? readdirSync(upstreamJclDir).filter((n) => n.toLowerCase().endsWith(".bms"))
    : [];
  let jclExecPgms = [];
  let jclDdCount = 0;
  let jclIdcams = false;
  let jclDefineCluster = false;
  for (const name of upstreamJclFiles) {
    const body = readFileSync(join(upstreamJclDir, name), "utf8");
    const pgmRe = /EXEC\s+PGM=([A-Z0-9$#@]+)/gi;
    let pm;
    while ((pm = pgmRe.exec(body)) !== null) {
      jclExecPgms.push(pm[1].toUpperCase());
    }
    jclDdCount += (body.match(/\bDD\s+/gi) || []).length;
    if (/\bIDCAMS\b/i.test(body)) jclIdcams = true;
    if (/\bDEFINE\s+CLUSTER\b/i.test(body)) jclDefineCluster = true;
  }
  const bmsMapCount = upstreamBmsFiles.reduce((n, name) => {
    const body = readFileSync(join(upstreamJclDir, name), "utf8");
    return n + (body.match(/\bDFHMSD\b|\bDFHMDI\b|\bDFHMDF\b/gi) || []).length;
  }, 0);
  checks.push({
    id: "upstream-jcl-map-inventory",
    ok:
      upstreamJclFiles.includes("PORTDEL.jcl") &&
      upstreamJclFiles.includes("PORTREAD.jcl") &&
      upstreamJclFiles.includes("PORTDEF.jcl") &&
      upstreamJclFiles.includes("PORTADD.jcl") &&
      upstreamJclFiles.includes("PORTUPDT.jcl") &&
      upstreamJclFiles.includes("PORTTEST.jcl") &&
      upstreamJclFiles.includes("TRANEXTR.jcl") &&
      upstreamJclFiles.includes("MNTTRDB2.jcl") &&
      upstreamJclFiles.includes("CREADB21.jcl") &&
      jclExecPgms.includes("PORTDEL") &&
      jclExecPgms.includes("PORTREAD") &&
      jclExecPgms.includes("PORTADD") &&
      jclExecPgms.includes("PORTUPDT") &&
      jclExecPgms.includes("PORTTEST") &&
      jclExecPgms.includes("IDCAMS") &&
      jclExecPgms.includes("IEBGENER") &&
      jclExecPgms.includes("IKJEFT01") &&
      jclIdcams &&
      jclDefineCluster &&
      jclDdCount >= 14 &&
      upstreamBmsFiles.includes("INQSET.bms") &&
      bmsMapCount >= 1 &&
      existsSync(join(upstreamJclDir, "COBTUPDT.cbl")) &&
      /\bCOBTUPDT\b/.test(
        readFileSync(join(upstreamJclDir, "MNTTRDB2.jcl"), "utf8"),
      ) &&
      (jclExecPgms.filter((p) => p === "IKJEFT01").length >= 3) &&
      /\bIKJEFT01\b/.test(
        readFileSync(join(upstreamJclDir, "CREADB21.jcl"), "utf8"),
      ),
    reason: `jcl=${upstreamJclFiles.join(",")} pgms=${jclExecPgms.join(",")} dd=${jclDdCount} idcams=${jclIdcams} defineCluster=${jclDefineCluster} bms=${upstreamBmsFiles.join(",")} mapMacros=${bmsMapCount} cobtupdtUpstream=${existsSync(join(upstreamJclDir, "COBTUPDT.cbl"))} ikjeft01=${jclExecPgms.filter((p) => p === "IKJEFT01").length}`,
  });

  // CardDemo BMS map corpus (aws-carddemo app/bms) — inventory-only; no BMS runtime (D6442/D6447).
  const carddemoBmsRequired = [
    "COSGN00.bms",
    "COMEN01.bms",
    "COADM01.bms",
    "COACTVW.bms",
    "COACTUP.bms",
    "COBIL00.bms",
    "CORPT00.bms",
    "COCRDLI.bms",
    "COCRDSL.bms",
    "COCRDUP.bms",
    "COTRN00.bms",
    "COTRN01.bms",
    "COTRN02.bms",
    "COTRTLI.bms",
    "COTRTUP.bms",
    "COPAU00.bms",
    "COPAU01.bms",
    "COUSR00.bms",
    "COUSR01.bms",
    "COUSR02.bms",
    "COUSR03.bms",
  ];
  const carddemoBmsPresent = carddemoBmsRequired.filter((n) => upstreamBmsFiles.includes(n));
  let carddemoBmsMacros = 0;
  let carddemoHasDfhmsd = false;
  /** @type {ReturnType<typeof inventoryBmsSource>[]} */
  const upstreamBmsInventories = [];
  for (const name of upstreamBmsFiles) {
    const body = readFileSync(join(upstreamJclDir, name), "utf8");
    if (carddemoBmsRequired.some((r) => r.toLowerCase() === name.toLowerCase())) {
      carddemoBmsMacros += (body.match(/\bDFHMSD\b|\bDFHMDI\b|\bDFHMDF\b/gi) || []).length;
      if (/\bDFHMSD\b/i.test(body)) carddemoHasDfhmsd = true;
    }
    upstreamBmsInventories.push(inventoryBmsSource(body, name));
  }
  const bmsFieldTotals = upstreamBmsInventories.reduce(
    (acc, inv) => {
      acc.dfhmsd += inv.dfhmsd;
      acc.dfhmdi += inv.dfhmdi;
      acc.dfhmdf += inv.dfhmdf;
      acc.namedFields += inv.namedFields;
      acc.withPos += inv.withPos;
      acc.withLength += inv.withLength;
      acc.withAttrb += inv.withAttrb;
      for (const m of inv.maps) acc.maps.add(m);
      for (const m of inv.mapsets) acc.mapsets.add(m);
      return acc;
    },
    {
      dfhmsd: 0,
      dfhmdi: 0,
      dfhmdf: 0,
      namedFields: 0,
      withPos: 0,
      withLength: 0,
      withAttrb: 0,
      maps: new Set(),
      mapsets: new Set(),
    },
  );
  checks.push({
    id: "upstream-carddemo-bms-inventory",
    ok:
      carddemoBmsPresent.length === carddemoBmsRequired.length &&
      carddemoHasDfhmsd &&
      carddemoBmsMacros >= 48 &&
      /\bCOSGN00\b/i.test(readFileSync(join(upstreamJclDir, "COSGN00.bms"), "utf8")) &&
      /\bCOMEN01\b/i.test(readFileSync(join(upstreamJclDir, "COMEN01.bms"), "utf8")) &&
      /\bCOACTUP\b/i.test(readFileSync(join(upstreamJclDir, "COACTUP.bms"), "utf8")) &&
      /\bCOUSR00\b/i.test(readFileSync(join(upstreamJclDir, "COUSR00.bms"), "utf8")) &&
      /\bCOTRTLI\b/i.test(readFileSync(join(upstreamJclDir, "COTRTLI.bms"), "utf8")) &&
      /\bCOTRTUP\b/i.test(readFileSync(join(upstreamJclDir, "COTRTUP.bms"), "utf8")) &&
      /\bCOPAU00\b/i.test(readFileSync(join(upstreamJclDir, "COPAU00.bms"), "utf8")) &&
      /\bCOPAU01\b/i.test(readFileSync(join(upstreamJclDir, "COPAU01.bms"), "utf8")),
    reason: `bms=${carddemoBmsPresent.join(",")} macros=${carddemoBmsMacros} dfhmsd=${carddemoHasDfhmsd}`,
  });

  // G10079 — DFHM* field/map inventory (labels + POS/LENGTH/ATTRB only; no BMS runtime).
  checks.push({
    id: "upstream-bms-dfhm-field-inventory",
    ok:
      upstreamBmsInventories.length >= 22 &&
      bmsFieldTotals.dfhmsd >= 44 &&
      bmsFieldTotals.dfhmdi >= 25 &&
      bmsFieldTotals.dfhmdf >= 1200 &&
      bmsFieldTotals.namedFields >= 550 &&
      bmsFieldTotals.withPos >= 1200 &&
      bmsFieldTotals.withLength >= 1100 &&
      bmsFieldTotals.maps.size >= 25 &&
      bmsFieldTotals.mapsets.size >= 22 &&
      bmsFieldTotals.maps.has("COSGN0A") &&
      bmsFieldTotals.maps.has("CTRTLIA") &&
      bmsFieldTotals.maps.has("MENMAP") &&
      bmsFieldTotals.maps.has("COPAU0A") &&
      bmsFieldTotals.maps.has("COPAU1A") &&
      bmsFieldTotals.mapsets.has("COSGN00") &&
      bmsFieldTotals.mapsets.has("COTRTLI") &&
      bmsFieldTotals.mapsets.has("COPAU00") &&
      bmsFieldTotals.mapsets.has("INQSET"),
    reason: `files=${upstreamBmsInventories.length} dfhmsd=${bmsFieldTotals.dfhmsd} dfhmdi=${bmsFieldTotals.dfhmdi} dfhmdf=${bmsFieldTotals.dfhmdf} named=${bmsFieldTotals.namedFields} pos=${bmsFieldTotals.withPos} len=${bmsFieldTotals.withLength} maps=${bmsFieldTotals.maps.size} mapsets=${bmsFieldTotals.mapsets.size}`,
  });

  // G10080 — online MAP/MAPSET literals ↔ BMS labels; missing stay honest holes (no invent).
  const onlineDir = join(MINI, "online");
  /** @type {string[]} */
  const onlineCblFiles = existsSync(onlineDir)
    ? readdirSync(onlineDir).filter((n) => /\.cbl$/i.test(n))
    : [];
  const referencedMaps = new Set();
  const referencedMapsets = new Set();
  for (const name of onlineCblFiles) {
    const body = readFileSync(join(onlineDir, name), "utf8");
    const inv = inventoryCobolSource(body, `online/${name}`);
    for (const m of inv.execCicsMaps || []) referencedMaps.add(m);
    for (const m of inv.execCicsMapsets || []) referencedMapsets.add(m);
  }
  // CardDemo often uses mapset name as MAP('…'); accept map OR mapset label.
  const mapMatched = [...referencedMaps]
    .filter((m) => bmsFieldTotals.maps.has(m) || bmsFieldTotals.mapsets.has(m))
    .sort();
  const mapMissing = [...referencedMaps]
    .filter((m) => !bmsFieldTotals.maps.has(m) && !bmsFieldTotals.mapsets.has(m))
    .sort();
  const mapsetMatched = [...referencedMapsets]
    .filter((m) => bmsFieldTotals.mapsets.has(m))
    .sort();
  const mapsetMissing = [...referencedMapsets]
    .filter((m) => !bmsFieldTotals.mapsets.has(m))
    .sort();
  const expectedMapHoles = ["INQMAP", "INQMNU", "PORTCRUD", "PORTMAP", "PORTPOS"];
  const expectedMapsetHoles = ["PORTSET"];
  checks.push({
    id: "online-bms-map-crosswalk",
    ok:
      mapMatched.length >= 30 &&
      mapsetMatched.length >= 18 &&
      mapMissing.join(",") === expectedMapHoles.join(",") &&
      mapsetMissing.join(",") === expectedMapsetHoles.join(",") &&
      mapMatched.includes("COSGN0A") &&
      mapMatched.includes("COSGN00") &&
      mapMatched.includes("CTRTLIA") &&
      mapsetMatched.includes("INQSET") &&
      mapsetMatched.includes("COTRTLI"),
    reason: `mapOk=${mapMatched.length} mapHole=${mapMissing.join(",")} setOk=${mapsetMatched.length} setHole=${mapsetMissing.join(",")}`,
  });

  // G10083 — Tier B Medium+ structural: CardDemo VSAM+MQ + IMS/Db2/MQ authorization corpus.
  // Catalog only — no IBM MQ / IMS / Db2 runtime invent (D6442/D6447).
  const mediumPlusRequired = [
    "COACCT01.cbl",
    "CODATE01.cbl",
    "COPAUA0C.cbl",
    "COPAUS0C.cbl",
    "COPAUS1C.cbl",
    "COPAUS2C.cbl",
    "CBPAUP0C.cbl",
    "CRDDEMOM.csd",
    "CRDDEMO2.csd",
    "AUTHFRDS.dcl",
  ];
  const mediumPlusPresent = mediumPlusRequired.filter((n) =>
    existsSync(join(upstreamJclDir, n)),
  );
  const coacct01Inv = existsSync(join(upstreamJclDir, "COACCT01.cbl"))
    ? inventoryCobolSource(
        readFileSync(join(upstreamJclDir, "COACCT01.cbl"), "utf8"),
        "_upstream/COACCT01.cbl",
      )
    : null;
  const codate01Inv = existsSync(join(upstreamJclDir, "CODATE01.cbl"))
    ? inventoryCobolSource(
        readFileSync(join(upstreamJclDir, "CODATE01.cbl"), "utf8"),
        "_upstream/CODATE01.cbl",
      )
    : null;
  const copaua0cInv = existsSync(join(upstreamJclDir, "COPAUA0C.cbl"))
    ? inventoryCobolSource(
        readFileSync(join(upstreamJclDir, "COPAUA0C.cbl"), "utf8"),
        "_upstream/COPAUA0C.cbl",
      )
    : null;
  const copaus0cInv = existsSync(join(upstreamJclDir, "COPAUS0C.cbl"))
    ? inventoryCobolSource(
        readFileSync(join(upstreamJclDir, "COPAUS0C.cbl"), "utf8"),
        "_upstream/COPAUS0C.cbl",
      )
    : null;
  const copaus2cInv = existsSync(join(upstreamJclDir, "COPAUS2C.cbl"))
    ? inventoryCobolSource(
        readFileSync(join(upstreamJclDir, "COPAUS2C.cbl"), "utf8"),
        "_upstream/COPAUS2C.cbl",
      )
    : null;
  const cbpaup0cInv = existsSync(join(upstreamJclDir, "CBPAUP0C.cbl"))
    ? inventoryCobolSource(
        readFileSync(join(upstreamJclDir, "CBPAUP0C.cbl"), "utf8"),
        "_upstream/CBPAUP0C.cbl",
      )
    : null;
  const mqNeed = ["MQOPEN", "MQGET", "MQPUT", "MQCLOSE"];
  const mqMissing = mqNeed.filter(
    (op) => !(coacct01Inv?.ibmMqCallOps || []).includes(op),
  );
  const dliNeed = ["GN", "GNP", "DLET", "CHKP"];
  const dliMissing = dliNeed.filter(
    (op) => !(cbpaup0cInv?.execDliOps || []).includes(op),
  );
  const authCopyResolve = resolveCobolCopybooks(
    ["COPAU00", "COPAU01", "CCPAUERY", "CIPAUSMY", "CIPAUDTY", "IMSFUNCS", "PAUTBPCB", "AUTHFRDS"],
    [join(MINI, "copybook"), upstreamJclDir],
  );
  const authCopyResolved = authCopyResolve
    .filter((r) => r.resolved)
    .map((r) => r.name.toUpperCase());
  const authCopyMissing = authCopyResolve
    .filter((r) => !r.resolved)
    .map((r) => r.name.toUpperCase());
  checks.push({
    id: "upstream-carddemo-medium-plus-corpus",
    ok:
      mediumPlusPresent.length === mediumPlusRequired.length &&
      !!coacct01Inv &&
      coacct01Inv.programIds.includes("COACCT01") &&
      mqMissing.length === 0 &&
      coacct01Inv.unresolved.includes("ibm-mq") &&
      coacct01Inv.unresolved.includes("exec-cics") &&
      !!codate01Inv &&
      (codate01Inv.ibmMqCallOps || []).includes("MQOPEN") &&
      !!copaua0cInv &&
      (copaua0cInv.ibmMqCallOps || []).includes("MQPUT1") &&
      (copaua0cInv.execDliOps || []).includes("GU") &&
      copaua0cInv.unresolved.includes("exec-dli") &&
      !!cbpaup0cInv &&
      dliMissing.length === 0 &&
      cbpaup0cInv.unresolved.includes("exec-dli") &&
      !!copaus2cInv &&
      (copaus2cInv.execSqlOps || []).includes("INSERT") &&
      (copaus2cInv.execSqlOps || []).includes("UPDATE") &&
      copaus2cInv.unresolved.includes("exec-sql") &&
      !!copaus0cInv &&
      (copaus0cInv.execCicsMaps || []).includes("COPAU0A") &&
      authCopyMissing.length === 0 &&
      authCopyResolved.includes("AUTHFRDS") &&
      authCopyResolved.includes("IMSFUNCS"),
    reason: `present=${mediumPlusPresent.length}/${mediumPlusRequired.length} mqMissing=${mqMissing.join(",")} dliMissing=${dliMissing.join(",")} authCopyMissing=${authCopyMissing.join(",")} mq=${(coacct01Inv?.ibmMqCallOps || []).join(",")} dli=${(cbpaup0cInv?.execDliOps || []).join(",")} sql=${(copaus2cInv?.execSqlOps || []).join(",")}`,
  });

  // G10084 — Tier C AID/BMSCA symbol catalog from real CardDemo upstream.
  // DFHAID/DFHBMSCA/EXTFMAP COPY: honest hole unless licensed drop on disk (gitignored; no invent).
  const cosgn00cUpstreamInv = existsSync(join(upstreamJclDir, "COSGN00C.cbl"))
    ? inventoryCobolSource(
        readFileSync(join(upstreamJclDir, "COSGN00C.cbl"), "utf8"),
        "_upstream/COSGN00C.cbl",
      )
    : null;
  const cotrtupcUpstreamInv = existsSync(join(upstreamJclDir, "COTRTUPC.cbl"))
    ? inventoryCobolSource(
        readFileSync(join(upstreamJclDir, "COTRTUPC.cbl"), "utf8"),
        "_upstream/COTRTUPC.cbl",
      )
    : null;
  const aidNeed = ["DFHENTER", "DFHPF3"];
  const aidMissing = aidNeed.filter(
    (s) => !(cosgn00cUpstreamInv?.cicsAidSymbols || []).includes(s),
  );
  const attrFromCopaus = copaus0cInv?.bmsAttrSymbols || [];
  const attrFromCotrt = cotrtupcUpstreamInv?.bmsAttrSymbols || [];
  const attrUnion = new Set([...attrFromCopaus, ...attrFromCotrt]);
  const dfhaidResolve = resolveCobolCopybooks(
    ["DFHAID"],
    [COPYBOOK_DIR, upstreamJclDir],
  )[0]?.resolved;
  const dfhbmscaResolve = resolveCobolCopybooks(
    ["DFHBMSCA"],
    [COPYBOOK_DIR, upstreamJclDir],
  )[0]?.resolved;
  const extfmapResolve = resolveCobolCopybooks(
    ["EXTFMAP"],
    [COPYBOOK_DIR, upstreamJclDir],
  )[0]?.resolved;
  const dfhaidOk = (cosgn00cUpstreamInv?.copybooks || []).includes("DFHAID")
    ? DFHAID_ON_DISK
      ? Boolean(dfhaidResolve)
      : !dfhaidResolve
    : true;
  const dfhbmscaOk = (cosgn00cUpstreamInv?.copybooks || []).includes("DFHBMSCA")
    ? DFHBMSCA_ON_DISK
      ? Boolean(dfhbmscaResolve)
      : !dfhbmscaResolve
    : true;
  // EXTFMAP may be ABSENT from SDFHCOB; when absent stay unresolved; when dropped, resolve.
  const extfmapOk = EXTFMAP_ON_DISK ? Boolean(extfmapResolve) : !extfmapResolve;
  checks.push({
    id: "upstream-cics-aid-bmsattr-catalog",
    ok:
      !!cosgn00cUpstreamInv &&
      aidMissing.length === 0 &&
      (copaus0cInv?.cicsAidSymbols || []).includes("DFHPF7") &&
      (copaus0cInv?.cicsAidSymbols || []).includes("DFHPF8") &&
      attrUnion.has("DFHBMPRF") &&
      attrFromCopaus.includes("DFHBMUNP") &&
      dfhaidOk &&
      dfhbmscaOk &&
      extfmapOk &&
      cosgn00cUpstreamInv.unresolved.includes("copy"),
    reason: `aids=${(cosgn00cUpstreamInv?.cicsAidSymbols || []).join(",")} copausAids=${(copaus0cInv?.cicsAidSymbols || []).join(",")} attrs=${[...attrUnion].join(",")} dfhaidOk=${dfhaidOk} dfhbmscaOk=${dfhbmscaOk} extfmapOk=${extfmapOk} aidDisk=${DFHAID_ON_DISK} extfmapDisk=${EXTFMAP_ON_DISK}`,
  });

  // CardDemo JCL corpus samples (aws-carddemo app/jcl) — inventory-only; no JES runtime.
  const carddemoJclRequired = [
    "CBEXPORT.jcl",
    "CBIMPORT.jcl",
    "WAITSTEP.jcl",
    "CREASTMT.JCL",
    "POSTTRAN.jcl",
    "INTCALC.jcl",
  ];
  const carddemoJclPresent = carddemoJclRequired.filter((n) =>
    upstreamJclFiles.some((f) => f.toLowerCase() === n.toLowerCase()),
  );
  let carddemoJclDd = 0;
  let carddemoJclExec = [];
  for (const name of upstreamJclFiles) {
    if (!carddemoJclRequired.some((r) => r.toLowerCase() === name.toLowerCase())) continue;
    const body = readFileSync(join(upstreamJclDir, name), "utf8");
    carddemoJclDd += (body.match(/\bDD\s+/gi) || []).length;
    const pgmRe = /EXEC\s+PGM=([A-Z0-9$#@]+)/gi;
    let pm;
    while ((pm = pgmRe.exec(body)) !== null) {
      carddemoJclExec.push(pm[1].toUpperCase());
    }
  }
  checks.push({
    id: "upstream-carddemo-jcl-inventory",
    ok:
      carddemoJclPresent.length === carddemoJclRequired.length &&
      carddemoJclDd >= 6 &&
      (carddemoJclExec.includes("CBEXPORT") ||
        carddemoJclExec.includes("CBIMPORT") ||
        carddemoJclExec.includes("IEBGENER") ||
        carddemoJclExec.length >= 1),
    reason: `jcl=${carddemoJclPresent.join(",")} dd=${carddemoJclDd} pgms=${carddemoJclExec.join(",")}`,
  });

  const portvalcpPath = join(MINI, "batch/PORTVALCP.cbl");
  const portvalcpSrc = existsSync(portvalcpPath) ? readFileSync(portvalcpPath, "utf8") : "";
  const portvalcpInv = portvalcpSrc
    ? inventoryCobolSource(portvalcpSrc, "batch/PORTVALCP.cbl")
    : null;
  const portvalcpResolve = resolveCobolCopybooks(portvalcpInv?.copybooks || [], [
    join(MINI, "copybook"),
  ]);
  const portvalcpResolved = portvalcpResolve
    .filter((r) => r.resolved)
    .map((r) => r.name.toUpperCase());
  checks.push({
    id: "batch-portval-copy-resolve",
    ok:
      !!portvalcpInv &&
      portvalcpInv.programIds.includes("PORTVALCP") &&
      (portvalcpInv.copybooks || []).map((c) => c.toUpperCase()).includes("PORTVAL") &&
      portvalcpResolved.includes("PORTVAL") &&
      (portvalcpInv.organizationIndexed || 0) === 0 &&
      portvalcpInv.unresolved.includes("copy"),
    reason: portvalcpInv
      ? `books=${(portvalcpInv.copybooks || []).join(",")} resolved=${portvalcpResolved.join(",")}`
      : "missing-PORTVALCP",
  });

  const ckprstcpPath = join(MINI, "batch/CKPRSTCP.cbl");
  const ckprstcpSrc = existsSync(ckprstcpPath) ? readFileSync(ckprstcpPath, "utf8") : "";
  const ckprstcpInv = ckprstcpSrc
    ? inventoryCobolSource(ckprstcpSrc, "batch/CKPRSTCP.cbl")
    : null;
  const ckprstcpResolve = resolveCobolCopybooks(ckprstcpInv?.copybooks || [], [
    join(MINI, "copybook"),
  ]);
  const ckprstcpResolved = ckprstcpResolve
    .filter((r) => r.resolved)
    .map((r) => r.name.toUpperCase());
  checks.push({
    id: "batch-ckprst-copy-resolve",
    ok:
      !!ckprstcpInv &&
      ckprstcpInv.programIds.includes("CKPRSTCP") &&
      (ckprstcpInv.copybooks || []).map((c) => c.toUpperCase()).includes("CKPRST") &&
      ckprstcpResolved.includes("CKPRST") &&
      (ckprstcpInv.organizationIndexed || 0) === 0 &&
      ckprstcpInv.unresolved.includes("copy"),
    reason: ckprstcpInv
      ? `books=${(ckprstcpInv.copybooks || []).join(",")} resolved=${ckprstcpResolved.join(",")}`
      : "missing-CKPRSTCP",
  });

  const ckprstdnPath = join(MINI, "batch/CKPRSTDN.cbl");
  const ckprstdnSrc = existsSync(ckprstdnPath) ? readFileSync(ckprstdnPath, "utf8") : "";
  const ckprstdnInv = ckprstdnSrc
    ? inventoryCobolSource(ckprstdnSrc, "batch/CKPRSTDN.cbl")
    : null;
  const ckprstdnResolve = resolveCobolCopybooks(ckprstdnInv?.copybooks || [], [
    join(MINI, "copybook"),
  ]);
  const ckprstdnResolved = ckprstdnResolve
    .filter((r) => r.resolved)
    .map((r) => r.name.toUpperCase());
  checks.push({
    id: "batch-ckprstdn-copy-linked-behavioral",
    ok:
      !!ckprstdnInv &&
      ckprstdnInv.programIds.includes("CKPRSTDN") &&
      (ckprstdnInv.copybooks || []).map((c) => c.toUpperCase()).includes("CKPRST") &&
      ckprstdnResolved.includes("CKPRST") &&
      ckprstdnInv.evaluateTrue >= 1 &&
      /\bCK-INITIAL\b/i.test(ckprstdnSrc) &&
      /\bCK-RESTARTED\b/i.test(ckprstdnSrc) &&
      (ckprstdnInv.organizationIndexed || 0) === 0 &&
      ckprstdnInv.unresolved.includes("copy"),
    reason: ckprstdnInv
      ? `books=${(ckprstdnInv.copybooks || []).join(",")} resolved=${ckprstdnResolved.join(",")}`
      : "missing-CKPRSTDN",
  });

  const portfliodnPath = join(MINI, "batch/PORTFLIODN.cbl");
  const portfliodnSrc = existsSync(portfliodnPath) ? readFileSync(portfliodnPath, "utf8") : "";
  const portfliodnInv = portfliodnSrc
    ? inventoryCobolSource(portfliodnSrc, "batch/PORTFLIODN.cbl")
    : null;
  const portfliodnResolve = resolveCobolCopybooks(portfliodnInv?.copybooks || [], [
    join(MINI, "copybook"),
  ]);
  const portfliodnResolved = portfliodnResolve
    .filter((r) => r.resolved)
    .map((r) => r.name.toUpperCase());
  checks.push({
    id: "batch-portfliodn-copy-linked-behavioral",
    ok:
      !!portfliodnInv &&
      portfliodnInv.programIds.includes("PORTFLIODN") &&
      (portfliodnInv.copybooks || []).map((c) => c.toUpperCase()).includes("PORTFLIO") &&
      portfliodnResolved.includes("PORTFLIO") &&
      portfliodnInv.evaluateTrue >= 1 &&
      /\bPORT-INDIVIDUAL\b/i.test(portfliodnSrc) &&
      /\bPORT-SUSPENDED\b/i.test(portfliodnSrc) &&
      (portfliodnInv.organizationIndexed || 0) === 0 &&
      portfliodnInv.unresolved.includes("copy"),
    reason: portfliodnInv
      ? `books=${(portfliodnInv.copybooks || []).join(",")} resolved=${portfliodnResolved.join(",")}`
      : "missing-PORTFLIODN",
  });

  const errhanddnPath = join(MINI, "batch/ERRHANDDN.cbl");
  const errhanddnSrc = existsSync(errhanddnPath) ? readFileSync(errhanddnPath, "utf8") : "";
  const errhanddnInv = errhanddnSrc
    ? inventoryCobolSource(errhanddnSrc, "batch/ERRHANDDN.cbl")
    : null;
  const errhanddnResolve = resolveCobolCopybooks(errhanddnInv?.copybooks || [], [
    join(MINI, "copybook"),
  ]);
  const errhanddnResolved = errhanddnResolve
    .filter((r) => r.resolved)
    .map((r) => r.name.toUpperCase());
  checks.push({
    id: "batch-errhanddn-copy-linked-behavioral",
    ok:
      !!errhanddnInv &&
      errhanddnInv.programIds.includes("ERRHANDDN") &&
      (errhanddnInv.copybooks || []).map((c) => c.toUpperCase()).includes("ERRHAND") &&
      errhanddnResolved.includes("ERRHAND") &&
      /\bERR-SUCCESS\b/i.test(errhanddnSrc) &&
      /\bERR-TERMINAL\b/i.test(errhanddnSrc) &&
      !/\bFUNCTION\s+RANDOM\b/i.test(errhanddnSrc) &&
      (errhanddnInv.organizationIndexed || 0) === 0 &&
      errhanddnInv.unresolved.includes("copy"),
    reason: errhanddnInv
      ? `books=${(errhanddnInv.copybooks || []).join(",")} resolved=${errhanddnResolved.join(",")}`
      : "missing-ERRHANDDN",
  });

  const ckprstphPath = join(MINI, "batch/CKPRSTPH.cbl");
  const ckprstphSrc = existsSync(ckprstphPath) ? readFileSync(ckprstphPath, "utf8") : "";
  const ckprstphInv = ckprstphSrc
    ? inventoryCobolSource(ckprstphSrc, "batch/CKPRSTPH.cbl")
    : null;
  const ckprstphResolve = resolveCobolCopybooks(ckprstphInv?.copybooks || [], [
    join(MINI, "copybook"),
  ]);
  const ckprstphResolved = ckprstphResolve
    .filter((r) => r.resolved)
    .map((r) => r.name.toUpperCase());
  checks.push({
    id: "batch-ckprstph-copy-linked-behavioral",
    ok:
      !!ckprstphInv &&
      ckprstphInv.programIds.includes("CKPRSTPH") &&
      (ckprstphInv.copybooks || []).map((c) => c.toUpperCase()).includes("CKPRST") &&
      ckprstphResolved.includes("CKPRST") &&
      ckprstphInv.evaluateTrue >= 1 &&
      /\bCK-PHASE-INIT\b/i.test(ckprstphSrc) &&
      /\bCK-PHASE-TERM\b/i.test(ckprstphSrc) &&
      (ckprstphInv.organizationIndexed || 0) === 0 &&
      ckprstphInv.unresolved.includes("copy"),
    reason: ckprstphInv
      ? `books=${(ckprstphInv.copybooks || []).join(",")} resolved=${ckprstphResolved.join(",")}`
      : "missing-CKPRSTPH",
  });

  const sqlcpyPath = join(MINI, "batch/SQLCPY00.cbl");
  const sqlcpySrc = existsSync(sqlcpyPath) ? readFileSync(sqlcpyPath, "utf8") : "";
  const sqlcpyInv = sqlcpySrc ? inventoryCobolSource(sqlcpySrc, "batch/SQLCPY00.cbl") : null;
  const sqlcpyResolve = resolveCobolCopybooks(sqlcpyInv?.copybooks || [], [join(MINI, "copybook")]);
  const sqlcpyResolved = sqlcpyResolve.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  checks.push({
    id: "batch-sqlca-copy-resolve",
    ok:
      !!sqlcpyInv &&
      sqlcpyInv.programIds.includes("SQLCPY00") &&
      (sqlcpyInv.copybooks || []).map((c) => c.toUpperCase()).includes("SQLCA") &&
      sqlcpyResolved.includes("SQLCA") &&
      (sqlcpyInv.execSql || 0) === 0 &&
      sqlcpyInv.unresolved.includes("copy"),
    reason: sqlcpyInv
      ? `books=${(sqlcpyInv.copybooks || []).join(",")} resolved=${sqlcpyResolved.join(",")} sql=${sqlcpyInv.execSql}`
      : "missing-SQLCPY00",
  });

  const sqlIncNames = (sqlinvInv?.execSqlIncludes || []).map((n) => String(n).toUpperCase());
  const sqlIncResolve = resolveCobolCopybooks(sqlIncNames, [join(MINI, "copybook")]);
  const sqlIncResolved = sqlIncResolve.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  const sqlIncPath = sqlIncResolve.find((r) => r.resolved && String(r.name).toUpperCase() === "SQLCA")
    ?.resolved;
  const sqlCpyPathResolved = sqlcpyResolve.find(
    (r) => r.resolved && String(r.name).toUpperCase() === "SQLCA",
  )?.resolved;
  const upstreamHistldPath = join(MINI, "_upstream/HISTLD00.cbl");
  const upstreamHistldSrc = existsSync(upstreamHistldPath)
    ? readFileSync(upstreamHistldPath, "utf8")
    : "";
  const upstreamHistldInv = upstreamHistldSrc
    ? inventoryCobolSource(upstreamHistldSrc, "_upstream/HISTLD00.cbl")
    : null;
  checks.push({
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
      (upstreamHistldInv.copybooks || []).map((c) => c.toUpperCase()).includes("SQLCA") &&
      (upstreamHistldInv.execSql || 0) >= 1,
    reason: `copyResolved=${sqlcpyResolved.join(",")} includeNames=${sqlIncNames.join(",")} includeResolved=${sqlIncResolved.join(",")} samePath=${sqlIncPath === sqlCpyPathResolved} histldCopy=${(upstreamHistldInv?.copybooks || []).join(",")} histldSql=${upstreamHistldInv?.execSql ?? 0}`,
  });

  const copyDir = join(MINI, "copybook");
  const onlineCopyResolve = resolveCobolCopybooks(onlineInv.copybooks || [], [copyDir]);
  const onlineResolved = onlineCopyResolve.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  const onlineUnresolvedCopy = onlineCopyResolve
    .filter((r) => !r.resolved)
    .map((r) => r.name.toUpperCase());
  const needResolved = ["INQCOM", "ERRHND", "INQPORT"];
  const missingResolved = needResolved.filter((n) => !onlineResolved.includes(n));
  checks.push({
    id: "online-copy-resolve",
    ok:
      missingResolved.length === 0 &&
      aidCopyOk("EXTFMAP", onlineResolved, onlineUnresolvedCopy) &&
      onlineInv.unresolved.includes("copy"),
    reason: `resolved=${onlineResolved.join(",")} unresolvedCopy=${onlineUnresolvedCopy.join(",")} missingResolved=${missingResolved.join(",")} extfmapDisk=${EXTFMAP_ON_DISK}`,
  });

  const cardCopyResolve = resolveCobolCopybooks(cardInv?.copybooks || [], [copyDir]);
  const cardResolved = cardCopyResolve.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  const cardUnresolvedCopy = cardCopyResolve
    .filter((r) => !r.resolved)
    .map((r) => r.name.toUpperCase());
  const cardNeedResolved = [
    "COCOM01Y",
    "COBIL00",
    "COTRN00",
    "COTRN01",
    "COTRN02",
    "CORPT00",
    "COACTVW",
    "COACTUP",
    "COMEN01",
    "COUSR00",
    "COUSR01",
    "COUSR02",
    "COUSR03",
    "COADM01",
    "COADM02Y",
    "COCRDLI",
    "COCRDSL",
    "COCRDUP",
    "COTRTLI",
    "COTRTUP",
    "COSGN00",
    "CSUSR01Y",
    "CSMSG01Y",
    "COTTL01Y",
    "CSDAT01Y",
    "CVTRA05Y",
    "CVACT01Y",
    "CVACT02Y",
    "CVACT03Y",
    "CSUTLDPY",
    "CSLKPCDY",
  ];
  const cardMissingResolved = cardNeedResolved.filter((n) => !cardResolved.includes(n));
  const cardAidOk =
    aidCopyOk("DFHAID", cardResolved, cardUnresolvedCopy) &&
    aidCopyOk("DFHBMSCA", cardResolved, cardUnresolvedCopy);
  checks.push({
    id: "online-carddemo-copy-resolve",
    ok:
      !!cardInv &&
      cardMissingResolved.length === 0 &&
      cardAidOk &&
      cardInv.unresolved.includes("copy"),
    reason: cardInv
      ? `resolved=${cardResolved.join(",")} unresolvedCopy=${cardUnresolvedCopy.join(",")} missingResolved=${cardMissingResolved.join(",")} aidDisk=${DFHAID_ON_DISK}`
      : "missing-CARDONLN",
  });

  const cotrtlicPath = join(MINI, "online/COTRTLIC.cbl");
  const cotrtlicSrc = existsSync(cotrtlicPath) ? readFileSync(cotrtlicPath, "utf8") : "";
  const cotrtlicInv = cotrtlicSrc
    ? inventoryCobolSource(cotrtlicSrc, "online/COTRTLIC.cbl")
    : null;
  const cotrtlicSqlNeed = [
    "INCLUDE",
    "DECLARE-CURSOR",
    "SELECT",
    "OPEN",
    "FETCH",
    "CLOSE",
    "UPDATE",
    "DELETE",
  ];
  const cotrtlicSqlOps = new Set(cotrtlicInv?.execSqlOps || []);
  const cotrtlicSqlMissing = cotrtlicSqlNeed.filter((o) => !cotrtlicSqlOps.has(o));
  const cotrtlicCicsNeed = ["HANDLE", "RECEIVE", "SEND", "XCTL", "RETURN", "SYNCPOINT"];
  const cotrtlicCicsOps = new Set(cotrtlicInv?.execCicsOps || []);
  const cotrtlicCicsMissing = cotrtlicCicsNeed.filter((o) => !cotrtlicCicsOps.has(o));
  const cotrtlicCopy = resolveCobolCopybooks(cotrtlicInv?.copybooks || [], [copyDir]);
  const cotrtlicResolved = cotrtlicCopy.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  const cotrtlicUnresolvedCopy = cotrtlicCopy
    .filter((r) => !r.resolved)
    .map((r) => r.name.toUpperCase());
  const cotrtlicSqlIncNames = (cotrtlicInv?.execSqlIncludes || []).map((n) => String(n).toUpperCase());
  const cotrtlicSqlIncResolve = resolveCobolCopybooks(cotrtlicSqlIncNames, [copyDir]);
  const cotrtlicSqlIncResolved = cotrtlicSqlIncResolve
    .filter((r) => r.resolved)
    .map((r) => r.name.toUpperCase());
  checks.push({
    id: "online-cotrtlic-sql-cics-holes",
    ok:
      !!cotrtlicInv &&
      cotrtlicInv.programIds.includes("COTRTLIC") &&
      cotrtlicSqlMissing.length === 0 &&
      cotrtlicCicsMissing.length === 0 &&
      cotrtlicResolved.includes("COTRTLI") &&
      cotrtlicSqlIncResolved.includes("SQLCA") &&
      cotrtlicSqlIncResolved.includes("CSDB2RWY") &&
      cotrtlicSqlIncResolved.includes("DCLTRTYP") &&
      cotrtlicSqlIncResolved.includes("CSDB2RPY") &&
      aidCopyOk("DFHAID", cotrtlicResolved, cotrtlicUnresolvedCopy) &&
      aidCopyOk("DFHBMSCA", cotrtlicResolved, cotrtlicUnresolvedCopy) &&
      cotrtlicInv.unresolved.includes("exec-sql") &&
      cotrtlicInv.unresolved.includes("exec-cics") &&
      cotrtlicInv.unresolved.includes("copy"),
    reason: cotrtlicInv
      ? `sqlMissing=${cotrtlicSqlMissing.join(",")} cicsMissing=${cotrtlicCicsMissing.join(",")} resolved=${cotrtlicResolved.join(",")} sqlInc=${cotrtlicSqlIncResolved.join(",")} unresolvedCopy=${cotrtlicUnresolvedCopy.join(",")}`
      : "missing-COTRTLIC",
  });

  const cotrtupcPath = join(MINI, "online/COTRTUPC.cbl");
  const cotrtupcSrc = existsSync(cotrtupcPath) ? readFileSync(cotrtupcPath, "utf8") : "";
  const cotrtupcInv = cotrtupcSrc
    ? inventoryCobolSource(cotrtupcSrc, "online/COTRTUPC.cbl")
    : null;
  const cotrtupcSqlNeed = ["INCLUDE", "SELECT", "INSERT", "UPDATE", "DELETE"];
  const cotrtupcSqlOps = new Set(cotrtupcInv?.execSqlOps || []);
  const cotrtupcSqlMissing = cotrtupcSqlNeed.filter((o) => !cotrtupcSqlOps.has(o));
  const cotrtupcCicsNeed = ["HANDLE", "RECEIVE", "SEND", "XCTL", "RETURN", "SYNCPOINT", "ABEND"];
  const cotrtupcCicsOps = new Set(cotrtupcInv?.execCicsOps || []);
  const cotrtupcCicsMissing = cotrtupcCicsNeed.filter((o) => !cotrtupcCicsOps.has(o));
  const cotrtupcCopy = resolveCobolCopybooks(cotrtupcInv?.copybooks || [], [copyDir]);
  const cotrtupcResolved = cotrtupcCopy.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  const cotrtupcUnresolvedCopy = cotrtupcCopy
    .filter((r) => !r.resolved)
    .map((r) => r.name.toUpperCase());
  const cotrtupcSqlIncNames = (cotrtupcInv?.execSqlIncludes || []).map((n) => String(n).toUpperCase());
  const cotrtupcSqlIncResolve = resolveCobolCopybooks(cotrtupcSqlIncNames, [copyDir]);
  const cotrtupcSqlIncResolved = cotrtupcSqlIncResolve
    .filter((r) => r.resolved)
    .map((r) => r.name.toUpperCase());
  checks.push({
    id: "online-cotrtupc-sql-cics-holes",
    ok:
      !!cotrtupcInv &&
      cotrtupcInv.programIds.includes("COTRTUPC") &&
      cotrtupcSqlMissing.length === 0 &&
      cotrtupcCicsMissing.length === 0 &&
      cotrtupcResolved.includes("COTRTUP") &&
      cotrtupcResolved.includes("CVCRD01Y") &&
      cotrtupcResolved.includes("CSMSG02Y") &&
      cotrtupcResolved.includes("CSSTRPFY") &&
      cotrtupcResolved.includes("CSUTLDWY") &&
      cotrtupcResolved.includes("CSSETATY") &&
      cotrtupcSqlIncResolved.includes("SQLCA") &&
      cotrtupcSqlIncResolved.includes("DCLTRTYP") &&
      cotrtupcSqlIncResolved.includes("DCLTRCAT") &&
      aidCopyOk("DFHAID", cotrtupcResolved, cotrtupcUnresolvedCopy) &&
      aidCopyOk("DFHBMSCA", cotrtupcResolved, cotrtupcUnresolvedCopy) &&
      !cotrtupcUnresolvedCopy.includes("CSUTLDWY") &&
      !cotrtupcUnresolvedCopy.includes("CSSETATY") &&
      cotrtupcInv.unresolved.includes("exec-sql") &&
      cotrtupcInv.unresolved.includes("exec-cics") &&
      cotrtupcInv.unresolved.includes("copy"),
    reason: cotrtupcInv
      ? `sqlMissing=${cotrtupcSqlMissing.join(",")} cicsMissing=${cotrtupcCicsMissing.join(",")} resolved=${cotrtupcResolved.join(",")} sqlInc=${cotrtupcSqlIncResolved.join(",")} unresolvedCopy=${cotrtupcUnresolvedCopy.join(",")}`
      : "missing-COTRTUPC",
  });

  const coactupcPath = join(MINI, "online/COACTUPC.cbl");
  const coactupcSrc = existsSync(coactupcPath) ? readFileSync(coactupcPath, "utf8") : "";
  const coactupcInv = coactupcSrc
    ? inventoryCobolSource(coactupcSrc, "online/COACTUPC.cbl")
    : null;
  const coactupcCicsNeed = [
    "HANDLE",
    "RECEIVE",
    "SEND",
    "READ",
    "REWRITE",
    "XCTL",
    "RETURN",
    "SYNCPOINT",
    "ABEND",
  ];
  const coactupcCicsOps = new Set(coactupcInv?.execCicsOps || []);
  const coactupcCicsMissing = coactupcCicsNeed.filter((o) => !coactupcCicsOps.has(o));
  const coactupcCopy = resolveCobolCopybooks(coactupcInv?.copybooks || [], [copyDir]);
  const coactupcResolved = coactupcCopy.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  const coactupcUnresolvedCopy = coactupcCopy
    .filter((r) => !r.resolved)
    .map((r) => r.name.toUpperCase());
  checks.push({
    id: "online-coactupc-cics-copy-holes",
    ok:
      !!coactupcInv &&
      coactupcInv.programIds.includes("COACTUPC") &&
      coactupcCicsMissing.length === 0 &&
      coactupcResolved.includes("COACTUP") &&
      coactupcResolved.includes("COCOM01Y") &&
      coactupcResolved.includes("CVCUS01Y") &&
      coactupcResolved.includes("CSUTLDPY") &&
      coactupcResolved.includes("CSLKPCDY") &&
      coactupcResolved.includes("CSUTLDWY") &&
      coactupcResolved.includes("CSSETATY") &&
      aidCopyOk("DFHAID", coactupcResolved, coactupcUnresolvedCopy) &&
      aidCopyOk("DFHBMSCA", coactupcResolved, coactupcUnresolvedCopy) &&
      !coactupcUnresolvedCopy.includes("CSUTLDWY") &&
      !coactupcUnresolvedCopy.includes("CSSETATY") &&
      coactupcInv.unresolved.includes("exec-cics") &&
      coactupcInv.unresolved.includes("copy") &&
      coactupcInv.unresolved.includes("file-io") &&
      !(coactupcInv.execSqlOps || []).length,
    reason: coactupcInv
      ? `cicsMissing=${coactupcCicsMissing.join(",")} resolved=${coactupcResolved.join(",")} unresolvedCopy=${coactupcUnresolvedCopy.join(",")} unresolved=${coactupcInv.unresolved.join(",")}`
      : "missing-COACTUPC",
  });

  const comen01cPath = join(MINI, "online/COMEN01C.cbl");
  const comen01cSrc = existsSync(comen01cPath) ? readFileSync(comen01cPath, "utf8") : "";
  const comen01cInv = comen01cSrc
    ? inventoryCobolSource(comen01cSrc, "online/COMEN01C.cbl")
    : null;
  const comen01cCicsNeed = ["HANDLE", "RECEIVE", "SEND", "INQUIRE", "XCTL", "RETURN", "ABEND"];
  const comen01cCicsOps = new Set(comen01cInv?.execCicsOps || []);
  const comen01cCicsMissing = comen01cCicsNeed.filter((o) => !comen01cCicsOps.has(o));
  const comen01cCopy = resolveCobolCopybooks(comen01cInv?.copybooks || [], [copyDir]);
  const comen01cResolved = comen01cCopy.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  const comen01cUnresolvedCopy = comen01cCopy
    .filter((r) => !r.resolved)
    .map((r) => r.name.toUpperCase());
  checks.push({
    id: "online-comen01c-cics-copy-holes",
    ok:
      !!comen01cInv &&
      comen01cInv.programIds.includes("COMEN01C") &&
      comen01cCicsMissing.length === 0 &&
      comen01cResolved.includes("COMEN01") &&
      comen01cResolved.includes("COMEN02Y") &&
      comen01cResolved.includes("COCOM01Y") &&
      aidCopyOk("DFHAID", comen01cResolved, comen01cUnresolvedCopy) &&
      aidCopyOk("DFHBMSCA", comen01cResolved, comen01cUnresolvedCopy) &&
      comen01cInv.unresolved.includes("exec-cics") &&
      comen01cInv.unresolved.includes("copy") &&
      !(comen01cInv.execSqlOps || []).length,
    reason: comen01cInv
      ? `cicsMissing=${comen01cCicsMissing.join(",")} resolved=${comen01cResolved.join(",")} unresolvedCopy=${comen01cUnresolvedCopy.join(",")}`
      : "missing-COMEN01C",
  });

  const coactvwcPath = join(MINI, "online/COACTVWC.cbl");
  const coactvwcSrc = existsSync(coactvwcPath) ? readFileSync(coactvwcPath, "utf8") : "";
  const coactvwcInv = coactvwcSrc
    ? inventoryCobolSource(coactvwcSrc, "online/COACTVWC.cbl")
    : null;
  const coactvwcCicsNeed = ["HANDLE", "RECEIVE", "SEND", "READ", "XCTL", "RETURN", "ABEND"];
  const coactvwcCicsOps = new Set(coactvwcInv?.execCicsOps || []);
  const coactvwcCicsMissing = coactvwcCicsNeed.filter((o) => !coactvwcCicsOps.has(o));
  const coactvwcCopy = resolveCobolCopybooks(coactvwcInv?.copybooks || [], [copyDir]);
  const coactvwcResolved = coactvwcCopy.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  const coactvwcUnresolvedCopy = coactvwcCopy
    .filter((r) => !r.resolved)
    .map((r) => r.name.toUpperCase());
  checks.push({
    id: "online-coactvwc-cics-copy-holes",
    ok:
      !!coactvwcInv &&
      coactvwcInv.programIds.includes("COACTVWC") &&
      coactvwcCicsMissing.length === 0 &&
      coactvwcResolved.includes("COACTVW") &&
      coactvwcResolved.includes("COCOM01Y") &&
      coactvwcResolved.includes("CVACT01Y") &&
      coactvwcResolved.includes("CVACT02Y") &&
      coactvwcResolved.includes("CVACT03Y") &&
      coactvwcResolved.includes("CVCUS01Y") &&
      coactvwcResolved.includes("CVCRD01Y") &&
      coactvwcResolved.includes("COTTL01Y") &&
      coactvwcResolved.includes("CSDAT01Y") &&
      coactvwcResolved.includes("CSMSG01Y") &&
      coactvwcResolved.includes("CSMSG02Y") &&
      coactvwcResolved.includes("CSUSR01Y") &&
      coactvwcResolved.includes("CSSTRPFY") &&
      aidCopyOk("DFHAID", coactvwcResolved, coactvwcUnresolvedCopy) &&
      aidCopyOk("DFHBMSCA", coactvwcResolved, coactvwcUnresolvedCopy) &&
      coactvwcInv.unresolved.includes("exec-cics") &&
      coactvwcInv.unresolved.includes("copy") &&
      coactvwcInv.unresolved.includes("file-io") &&
      !(coactvwcInv.execSqlOps || []).length,
    reason: coactvwcInv
      ? `cicsMissing=${coactvwcCicsMissing.join(",")} resolved=${coactvwcResolved.join(",")} unresolvedCopy=${coactvwcUnresolvedCopy.join(",")} unresolved=${coactvwcInv.unresolved.join(",")}`
      : "missing-COACTVWC",
  });

  const cosgn00cPath = join(MINI, "online/COSGN00C.cbl");
  const cosgn00cSrc = existsSync(cosgn00cPath) ? readFileSync(cosgn00cPath, "utf8") : "";
  const cosgn00cInv = cosgn00cSrc
    ? inventoryCobolSource(cosgn00cSrc, "online/COSGN00C.cbl")
    : null;
  const cosgn00cCicsNeed = ["RECEIVE", "SEND", "SEND-MAP", "SEND-TEXT", "RECEIVE-MAP", "ASSIGN", "READ", "XCTL", "RETURN"];
  const cosgn00cCicsOps = new Set(cosgn00cInv?.execCicsOps || []);
  const cosgn00cCicsMissing = cosgn00cCicsNeed.filter((o) => !cosgn00cCicsOps.has(o));
  const cosgn00cCopy = resolveCobolCopybooks(cosgn00cInv?.copybooks || [], [copyDir]);
  const cosgn00cResolved = cosgn00cCopy.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  const cosgn00cUnresolvedCopy = cosgn00cCopy
    .filter((r) => !r.resolved)
    .map((r) => r.name.toUpperCase());
  checks.push({
    id: "online-cosgn00c-cics-copy-holes",
    ok:
      !!cosgn00cInv &&
      cosgn00cInv.programIds.includes("COSGN00C") &&
      cosgn00cCicsMissing.length === 0 &&
      (cosgn00cInv.execCicsMaps || []).includes("COSGN0A") &&
      (cosgn00cInv.execCicsMapsets || []).includes("COSGN00") &&
      (cosgn00cInv.execCicsXctlPrograms || []).includes("COMEN01C") &&
      !(cosgn00cInv.execCicsLinkPrograms || []).length &&
      cosgn00cResolved.includes("COSGN00") &&
      cosgn00cResolved.includes("COCOM01Y") &&
      cosgn00cResolved.includes("COTTL01Y") &&
      cosgn00cResolved.includes("CSDAT01Y") &&
      cosgn00cResolved.includes("CSMSG01Y") &&
      cosgn00cResolved.includes("CSUSR01Y") &&
      aidCopyOk("DFHAID", cosgn00cResolved, cosgn00cUnresolvedCopy) &&
      aidCopyOk("DFHBMSCA", cosgn00cResolved, cosgn00cUnresolvedCopy) &&
      cosgn00cInv.unresolved.includes("exec-cics") &&
      cosgn00cInv.unresolved.includes("copy") &&
      cosgn00cInv.unresolved.includes("file-io") &&
      !(cosgn00cInv.execSqlOps || []).length,
    reason: cosgn00cInv
      ? `cicsMissing=${cosgn00cCicsMissing.join(",")} maps=${(cosgn00cInv.execCicsMaps || []).join(",")} mapsets=${(cosgn00cInv.execCicsMapsets || []).join(",")} xctl=${(cosgn00cInv.execCicsXctlPrograms || []).join(",")} resolved=${cosgn00cResolved.join(",")} unresolvedCopy=${cosgn00cUnresolvedCopy.join(",")} unresolved=${cosgn00cInv.unresolved.join(",")}`
      : "missing-COSGN00C",
  });

  const coadm01cPath = join(MINI, "online/COADM01C.cbl");
  const coadm01cSrc = existsSync(coadm01cPath) ? readFileSync(coadm01cPath, "utf8") : "";
  const coadm01cInv = coadm01cSrc
    ? inventoryCobolSource(coadm01cSrc, "online/COADM01C.cbl")
    : null;
  const coadm01cCicsNeed = ["RECEIVE", "SEND", "XCTL", "RETURN", "HANDLE"];
  const coadm01cCicsOps = new Set(coadm01cInv?.execCicsOps || []);
  const coadm01cCicsMissing = coadm01cCicsNeed.filter((o) => !coadm01cCicsOps.has(o));
  const coadm01cCopy = resolveCobolCopybooks(coadm01cInv?.copybooks || [], [copyDir]);
  const coadm01cResolved = coadm01cCopy.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  const coadm01cUnresolvedCopy = coadm01cCopy
    .filter((r) => !r.resolved)
    .map((r) => r.name.toUpperCase());
  checks.push({
    id: "online-coadm01c-cics-copy-holes",
    ok:
      !!coadm01cInv &&
      coadm01cInv.programIds.includes("COADM01C") &&
      coadm01cCicsMissing.length === 0 &&
      coadm01cResolved.includes("COADM01") &&
      coadm01cResolved.includes("COADM02Y") &&
      coadm01cResolved.includes("COCOM01Y") &&
      coadm01cResolved.includes("COTTL01Y") &&
      coadm01cResolved.includes("CSDAT01Y") &&
      coadm01cResolved.includes("CSMSG01Y") &&
      coadm01cResolved.includes("CSUSR01Y") &&
      aidCopyOk("DFHAID", coadm01cResolved, coadm01cUnresolvedCopy) &&
      aidCopyOk("DFHBMSCA", coadm01cResolved, coadm01cUnresolvedCopy) &&
      coadm01cInv.unresolved.includes("exec-cics") &&
      coadm01cInv.unresolved.includes("copy") &&
      !(coadm01cInv.execSqlOps || []).length,
    reason: coadm01cInv
      ? `cicsMissing=${coadm01cCicsMissing.join(",")} resolved=${coadm01cResolved.join(",")} unresolvedCopy=${coadm01cUnresolvedCopy.join(",")} unresolved=${coadm01cInv.unresolved.join(",")}`
      : "missing-COADM01C",
  });

  const cousr00cPath = join(MINI, "online/COUSR00C.cbl");
  const cousr00cSrc = existsSync(cousr00cPath) ? readFileSync(cousr00cPath, "utf8") : "";
  const cousr00cInv = cousr00cSrc
    ? inventoryCobolSource(cousr00cSrc, "online/COUSR00C.cbl")
    : null;
  const cousr00cCicsNeed = ["RECEIVE", "SEND", "READ", "XCTL", "RETURN"];
  const cousr00cCicsOps = new Set(cousr00cInv?.execCicsOps || []);
  const cousr00cCicsMissing = cousr00cCicsNeed.filter((o) => !cousr00cCicsOps.has(o));
  const cousr00cCopy = resolveCobolCopybooks(cousr00cInv?.copybooks || [], [copyDir]);
  const cousr00cResolved = cousr00cCopy.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  const cousr00cUnresolvedCopy = cousr00cCopy
    .filter((r) => !r.resolved)
    .map((r) => r.name.toUpperCase());
  checks.push({
    id: "online-cousr00c-cics-copy-holes",
    ok:
      !!cousr00cInv &&
      cousr00cInv.programIds.includes("COUSR00C") &&
      cousr00cCicsMissing.length === 0 &&
      cousr00cResolved.includes("COUSR00") &&
      cousr00cResolved.includes("COCOM01Y") &&
      cousr00cResolved.includes("COTTL01Y") &&
      cousr00cResolved.includes("CSDAT01Y") &&
      cousr00cResolved.includes("CSMSG01Y") &&
      cousr00cResolved.includes("CSUSR01Y") &&
      aidCopyOk("DFHAID", cousr00cResolved, cousr00cUnresolvedCopy) &&
      aidCopyOk("DFHBMSCA", cousr00cResolved, cousr00cUnresolvedCopy) &&
      cousr00cInv.unresolved.includes("exec-cics") &&
      cousr00cInv.unresolved.includes("copy") &&
      cousr00cInv.unresolved.includes("file-io") &&
      !(cousr00cInv.execSqlOps || []).length,
    reason: cousr00cInv
      ? `cicsMissing=${cousr00cCicsMissing.join(",")} resolved=${cousr00cResolved.join(",")} unresolvedCopy=${cousr00cUnresolvedCopy.join(",")} unresolved=${cousr00cInv.unresolved.join(",")}`
      : "missing-COUSR00C",
  });

  const cousr01cPath = join(MINI, "online/COUSR01C.cbl");
  const cousr01cSrc = existsSync(cousr01cPath) ? readFileSync(cousr01cPath, "utf8") : "";
  const cousr01cInv = cousr01cSrc
    ? inventoryCobolSource(cousr01cSrc, "online/COUSR01C.cbl")
    : null;
  const cousr01cCicsNeed = ["RECEIVE", "SEND", "WRITE", "XCTL", "RETURN"];
  const cousr01cCicsOps = new Set(cousr01cInv?.execCicsOps || []);
  const cousr01cCicsMissing = cousr01cCicsNeed.filter((o) => !cousr01cCicsOps.has(o));
  const cousr01cCopy = resolveCobolCopybooks(cousr01cInv?.copybooks || [], [copyDir]);
  const cousr01cResolved = cousr01cCopy.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  const cousr01cUnresolvedCopy = cousr01cCopy
    .filter((r) => !r.resolved)
    .map((r) => r.name.toUpperCase());
  checks.push({
    id: "online-cousr01c-cics-copy-holes",
    ok:
      !!cousr01cInv &&
      cousr01cInv.programIds.includes("COUSR01C") &&
      cousr01cCicsMissing.length === 0 &&
      cousr01cResolved.includes("COUSR01") &&
      cousr01cResolved.includes("COCOM01Y") &&
      cousr01cResolved.includes("COTTL01Y") &&
      cousr01cResolved.includes("CSDAT01Y") &&
      cousr01cResolved.includes("CSMSG01Y") &&
      cousr01cResolved.includes("CSUSR01Y") &&
      aidCopyOk("DFHAID", cousr01cResolved, cousr01cUnresolvedCopy) &&
      aidCopyOk("DFHBMSCA", cousr01cResolved, cousr01cUnresolvedCopy) &&
      cousr01cInv.unresolved.includes("exec-cics") &&
      cousr01cInv.unresolved.includes("copy") &&
      cousr01cInv.unresolved.includes("file-io") &&
      !(cousr01cInv.execSqlOps || []).length,
    reason: cousr01cInv
      ? `cicsMissing=${cousr01cCicsMissing.join(",")} resolved=${cousr01cResolved.join(",")} unresolvedCopy=${cousr01cUnresolvedCopy.join(",")} unresolved=${cousr01cInv.unresolved.join(",")}`
      : "missing-COUSR01C",
  });

  const cousr02cPath = join(MINI, "online/COUSR02C.cbl");
  const cousr02cSrc = existsSync(cousr02cPath) ? readFileSync(cousr02cPath, "utf8") : "";
  const cousr02cInv = cousr02cSrc
    ? inventoryCobolSource(cousr02cSrc, "online/COUSR02C.cbl")
    : null;
  const cousr02cCicsNeed = ["RECEIVE", "SEND", "READ", "REWRITE", "XCTL", "RETURN"];
  const cousr02cCicsOps = new Set(cousr02cInv?.execCicsOps || []);
  const cousr02cCicsMissing = cousr02cCicsNeed.filter((o) => !cousr02cCicsOps.has(o));
  const cousr02cCopy = resolveCobolCopybooks(cousr02cInv?.copybooks || [], [copyDir]);
  const cousr02cResolved = cousr02cCopy.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  const cousr02cUnresolvedCopy = cousr02cCopy
    .filter((r) => !r.resolved)
    .map((r) => r.name.toUpperCase());
  checks.push({
    id: "online-cousr02c-cics-copy-holes",
    ok:
      !!cousr02cInv &&
      cousr02cInv.programIds.includes("COUSR02C") &&
      cousr02cCicsMissing.length === 0 &&
      cousr02cResolved.includes("COUSR02") &&
      cousr02cResolved.includes("COCOM01Y") &&
      cousr02cResolved.includes("COTTL01Y") &&
      cousr02cResolved.includes("CSDAT01Y") &&
      cousr02cResolved.includes("CSMSG01Y") &&
      cousr02cResolved.includes("CSUSR01Y") &&
      aidCopyOk("DFHAID", cousr02cResolved, cousr02cUnresolvedCopy) &&
      aidCopyOk("DFHBMSCA", cousr02cResolved, cousr02cUnresolvedCopy) &&
      cousr02cInv.unresolved.includes("exec-cics") &&
      cousr02cInv.unresolved.includes("copy") &&
      cousr02cInv.unresolved.includes("file-io") &&
      !(cousr02cInv.execSqlOps || []).length,
    reason: cousr02cInv
      ? `cicsMissing=${cousr02cCicsMissing.join(",")} resolved=${cousr02cResolved.join(",")} unresolvedCopy=${cousr02cUnresolvedCopy.join(",")} unresolved=${cousr02cInv.unresolved.join(",")}`
      : "missing-COUSR02C",
  });

  const cousr03cPath = join(MINI, "online/COUSR03C.cbl");
  const cousr03cSrc = existsSync(cousr03cPath) ? readFileSync(cousr03cPath, "utf8") : "";
  const cousr03cInv = cousr03cSrc
    ? inventoryCobolSource(cousr03cSrc, "online/COUSR03C.cbl")
    : null;
  const cousr03cCicsNeed = ["RECEIVE", "SEND", "READ", "DELETE", "XCTL", "RETURN"];
  const cousr03cCicsOps = new Set(cousr03cInv?.execCicsOps || []);
  const cousr03cCicsMissing = cousr03cCicsNeed.filter((o) => !cousr03cCicsOps.has(o));
  const cousr03cCopy = resolveCobolCopybooks(cousr03cInv?.copybooks || [], [copyDir]);
  const cousr03cResolved = cousr03cCopy.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  const cousr03cUnresolvedCopy = cousr03cCopy
    .filter((r) => !r.resolved)
    .map((r) => r.name.toUpperCase());
  checks.push({
    id: "online-cousr03c-cics-copy-holes",
    ok:
      !!cousr03cInv &&
      cousr03cInv.programIds.includes("COUSR03C") &&
      cousr03cCicsMissing.length === 0 &&
      cousr03cResolved.includes("COUSR03") &&
      cousr03cResolved.includes("COCOM01Y") &&
      cousr03cResolved.includes("COTTL01Y") &&
      cousr03cResolved.includes("CSDAT01Y") &&
      cousr03cResolved.includes("CSMSG01Y") &&
      cousr03cResolved.includes("CSUSR01Y") &&
      aidCopyOk("DFHAID", cousr03cResolved, cousr03cUnresolvedCopy) &&
      aidCopyOk("DFHBMSCA", cousr03cResolved, cousr03cUnresolvedCopy) &&
      cousr03cInv.unresolved.includes("exec-cics") &&
      cousr03cInv.unresolved.includes("copy") &&
      cousr03cInv.unresolved.includes("file-io") &&
      !(cousr03cInv.execSqlOps || []).length,
    reason: cousr03cInv
      ? `cicsMissing=${cousr03cCicsMissing.join(",")} resolved=${cousr03cResolved.join(",")} unresolvedCopy=${cousr03cUnresolvedCopy.join(",")} unresolved=${cousr03cInv.unresolved.join(",")}`
      : "missing-COUSR03C",
  });

  const cocrdlicPath = join(MINI, "online/COCRDLIC.cbl");
  const cocrdlicSrc = existsSync(cocrdlicPath) ? readFileSync(cocrdlicPath, "utf8") : "";
  const cocrdlicInv = cocrdlicSrc
    ? inventoryCobolSource(cocrdlicSrc, "online/COCRDLIC.cbl")
    : null;
  const cocrdlicCicsNeed = [
    "RECEIVE",
    "SEND",
    "READ",
    "STARTBR",
    "READNEXT",
    "READPREV",
    "ENDBR",
    "XCTL",
    "RETURN",
  ];
  const cocrdlicCicsOps = new Set(cocrdlicInv?.execCicsOps || []);
  const cocrdlicCicsMissing = cocrdlicCicsNeed.filter((o) => !cocrdlicCicsOps.has(o));
  const cocrdlicCopy = resolveCobolCopybooks(cocrdlicInv?.copybooks || [], [copyDir]);
  const cocrdlicResolved = cocrdlicCopy.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  const cocrdlicUnresolvedCopy = cocrdlicCopy
    .filter((r) => !r.resolved)
    .map((r) => r.name.toUpperCase());
  checks.push({
    id: "online-cocrdlic-cics-copy-holes",
    ok:
      !!cocrdlicInv &&
      cocrdlicInv.programIds.includes("COCRDLIC") &&
      cocrdlicCicsMissing.length === 0 &&
      cocrdlicResolved.includes("COCRDLI") &&
      cocrdlicResolved.includes("COCOM01Y") &&
      cocrdlicResolved.includes("CVCRD01Y") &&
      cocrdlicResolved.includes("CVACT02Y") &&
      cocrdlicResolved.includes("COTTL01Y") &&
      cocrdlicResolved.includes("CSDAT01Y") &&
      cocrdlicResolved.includes("CSMSG01Y") &&
      cocrdlicResolved.includes("CSUSR01Y") &&
      cocrdlicResolved.includes("CSSTRPFY") &&
      aidCopyOk("DFHAID", cocrdlicResolved, cocrdlicUnresolvedCopy) &&
      aidCopyOk("DFHBMSCA", cocrdlicResolved, cocrdlicUnresolvedCopy) &&
      cocrdlicInv.unresolved.includes("exec-cics") &&
      cocrdlicInv.unresolved.includes("copy") &&
      cocrdlicInv.unresolved.includes("file-io") &&
      !(cocrdlicInv.execSqlOps || []).length,
    reason: cocrdlicInv
      ? `cicsMissing=${cocrdlicCicsMissing.join(",")} resolved=${cocrdlicResolved.join(",")} unresolvedCopy=${cocrdlicUnresolvedCopy.join(",")} unresolved=${cocrdlicInv.unresolved.join(",")}`
      : "missing-COCRDLIC",
  });

  const cocrdslcPath = join(MINI, "online/COCRDSLC.cbl");
  const cocrdslcSrc = existsSync(cocrdslcPath) ? readFileSync(cocrdslcPath, "utf8") : "";
  const cocrdslcInv = cocrdslcSrc
    ? inventoryCobolSource(cocrdslcSrc, "online/COCRDSLC.cbl")
    : null;
  const cocrdslcCicsNeed = ["HANDLE", "RECEIVE", "SEND", "READ", "XCTL", "RETURN", "ABEND"];
  const cocrdslcCicsOps = new Set(cocrdslcInv?.execCicsOps || []);
  const cocrdslcCicsMissing = cocrdslcCicsNeed.filter((o) => !cocrdslcCicsOps.has(o));
  const cocrdslcCopy = resolveCobolCopybooks(cocrdslcInv?.copybooks || [], [copyDir]);
  const cocrdslcResolved = cocrdslcCopy.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  const cocrdslcUnresolvedCopy = cocrdslcCopy
    .filter((r) => !r.resolved)
    .map((r) => r.name.toUpperCase());
  checks.push({
    id: "online-cocrdslc-cics-copy-holes",
    ok:
      !!cocrdslcInv &&
      cocrdslcInv.programIds.includes("COCRDSLC") &&
      cocrdslcCicsMissing.length === 0 &&
      cocrdslcResolved.includes("COCRDSL") &&
      cocrdslcResolved.includes("COCOM01Y") &&
      cocrdslcResolved.includes("CVCRD01Y") &&
      cocrdslcResolved.includes("CVACT02Y") &&
      cocrdslcResolved.includes("CVCUS01Y") &&
      cocrdslcResolved.includes("COTTL01Y") &&
      cocrdslcResolved.includes("CSDAT01Y") &&
      cocrdslcResolved.includes("CSMSG01Y") &&
      cocrdslcResolved.includes("CSMSG02Y") &&
      cocrdslcResolved.includes("CSUSR01Y") &&
      cocrdslcResolved.includes("CSSTRPFY") &&
      aidCopyOk("DFHAID", cocrdslcResolved, cocrdslcUnresolvedCopy) &&
      aidCopyOk("DFHBMSCA", cocrdslcResolved, cocrdslcUnresolvedCopy) &&
      cocrdslcInv.unresolved.includes("exec-cics") &&
      cocrdslcInv.unresolved.includes("copy") &&
      cocrdslcInv.unresolved.includes("file-io") &&
      !(cocrdslcInv.execSqlOps || []).length,
    reason: cocrdslcInv
      ? `cicsMissing=${cocrdslcCicsMissing.join(",")} resolved=${cocrdslcResolved.join(",")} unresolvedCopy=${cocrdslcUnresolvedCopy.join(",")} unresolved=${cocrdslcInv.unresolved.join(",")}`
      : "missing-COCRDSLC",
  });

  const cocrdupcPath = join(MINI, "online/COCRDUPC.cbl");
  const cocrdupcSrc = existsSync(cocrdupcPath) ? readFileSync(cocrdupcPath, "utf8") : "";
  const cocrdupcInv = cocrdupcSrc
    ? inventoryCobolSource(cocrdupcSrc, "online/COCRDUPC.cbl")
    : null;
  const cocrdupcCicsNeed = [
    "HANDLE",
    "RECEIVE",
    "SEND",
    "READ",
    "REWRITE",
    "XCTL",
    "RETURN",
    "ABEND",
  ];
  const cocrdupcCicsOps = new Set(cocrdupcInv?.execCicsOps || []);
  const cocrdupcCicsMissing = cocrdupcCicsNeed.filter((o) => !cocrdupcCicsOps.has(o));
  const cocrdupcCopy = resolveCobolCopybooks(cocrdupcInv?.copybooks || [], [copyDir]);
  const cocrdupcResolved = cocrdupcCopy.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  const cocrdupcUnresolvedCopy = cocrdupcCopy
    .filter((r) => !r.resolved)
    .map((r) => r.name.toUpperCase());
  checks.push({
    id: "online-cocrdupc-cics-copy-holes",
    ok:
      !!cocrdupcInv &&
      cocrdupcInv.programIds.includes("COCRDUPC") &&
      cocrdupcCicsMissing.length === 0 &&
      cocrdupcResolved.includes("COCRDUP") &&
      cocrdupcResolved.includes("COCOM01Y") &&
      cocrdupcResolved.includes("CVCRD01Y") &&
      cocrdupcResolved.includes("CVACT02Y") &&
      cocrdupcResolved.includes("CVCUS01Y") &&
      cocrdupcResolved.includes("COTTL01Y") &&
      cocrdupcResolved.includes("CSDAT01Y") &&
      cocrdupcResolved.includes("CSMSG01Y") &&
      cocrdupcResolved.includes("CSMSG02Y") &&
      cocrdupcResolved.includes("CSUSR01Y") &&
      cocrdupcResolved.includes("CSSTRPFY") &&
      aidCopyOk("DFHAID", cocrdupcResolved, cocrdupcUnresolvedCopy) &&
      aidCopyOk("DFHBMSCA", cocrdupcResolved, cocrdupcUnresolvedCopy) &&
      cocrdupcInv.unresolved.includes("exec-cics") &&
      cocrdupcInv.unresolved.includes("copy") &&
      cocrdupcInv.unresolved.includes("file-io") &&
      !(cocrdupcInv.execSqlOps || []).length,
    reason: cocrdupcInv
      ? `cicsMissing=${cocrdupcCicsMissing.join(",")} resolved=${cocrdupcResolved.join(",")} unresolvedCopy=${cocrdupcUnresolvedCopy.join(",")} unresolved=${cocrdupcInv.unresolved.join(",")}`
      : "missing-COCRDUPC",
  });

  const cobil00cPath = join(MINI, "online/COBIL00C.cbl");
  const cobil00cSrc = existsSync(cobil00cPath) ? readFileSync(cobil00cPath, "utf8") : "";
  const cobil00cInv = cobil00cSrc
    ? inventoryCobolSource(cobil00cSrc, "online/COBIL00C.cbl")
    : null;
  const cobil00cCicsNeed = [
    "ASKTIME",
    "FORMATTIME",
    "RECEIVE",
    "SEND",
    "READ",
    "REWRITE",
    "STARTBR",
    "READPREV",
    "ENDBR",
    "WRITE",
    "XCTL",
    "RETURN",
  ];
  const cobil00cCicsOps = new Set(cobil00cInv?.execCicsOps || []);
  const cobil00cCicsMissing = cobil00cCicsNeed.filter((o) => !cobil00cCicsOps.has(o));
  const cobil00cCopy = resolveCobolCopybooks(cobil00cInv?.copybooks || [], [copyDir]);
  const cobil00cResolved = cobil00cCopy.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  const cobil00cUnresolvedCopy = cobil00cCopy
    .filter((r) => !r.resolved)
    .map((r) => r.name.toUpperCase());
  checks.push({
    id: "online-cobil00c-cics-copy-holes",
    ok:
      !!cobil00cInv &&
      cobil00cInv.programIds.includes("COBIL00C") &&
      cobil00cCicsMissing.length === 0 &&
      cobil00cResolved.includes("COBIL00") &&
      cobil00cResolved.includes("COCOM01Y") &&
      cobil00cResolved.includes("COTTL01Y") &&
      cobil00cResolved.includes("CSDAT01Y") &&
      cobil00cResolved.includes("CSMSG01Y") &&
      cobil00cResolved.includes("CVACT01Y") &&
      cobil00cResolved.includes("CVACT03Y") &&
      cobil00cResolved.includes("CVTRA05Y") &&
      aidCopyOk("DFHAID", cobil00cResolved, cobil00cUnresolvedCopy) &&
      aidCopyOk("DFHBMSCA", cobil00cResolved, cobil00cUnresolvedCopy) &&
      cobil00cInv.unresolved.includes("exec-cics") &&
      cobil00cInv.unresolved.includes("copy") &&
      cobil00cInv.unresolved.includes("file-io") &&
      !(cobil00cInv.execSqlOps || []).length,
    reason: cobil00cInv
      ? `cicsMissing=${cobil00cCicsMissing.join(",")} resolved=${cobil00cResolved.join(",")} unresolvedCopy=${cobil00cUnresolvedCopy.join(",")} unresolved=${cobil00cInv.unresolved.join(",")}`
      : "missing-COBIL00C",
  });

  const cotrn00cPath = join(MINI, "online/COTRN00C.cbl");
  const cotrn00cSrc = existsSync(cotrn00cPath) ? readFileSync(cotrn00cPath, "utf8") : "";
  const cotrn00cInv = cotrn00cSrc
    ? inventoryCobolSource(cotrn00cSrc, "online/COTRN00C.cbl")
    : null;
  const cotrn00cCicsNeed = [
    "RECEIVE",
    "SEND",
    "STARTBR",
    "READNEXT",
    "READPREV",
    "ENDBR",
    "XCTL",
    "RETURN",
  ];
  const cotrn00cCicsOps = new Set(cotrn00cInv?.execCicsOps || []);
  const cotrn00cCicsMissing = cotrn00cCicsNeed.filter((o) => !cotrn00cCicsOps.has(o));
  const cotrn00cCopy = resolveCobolCopybooks(cotrn00cInv?.copybooks || [], [copyDir]);
  const cotrn00cResolved = cotrn00cCopy.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  const cotrn00cUnresolvedCopy = cotrn00cCopy
    .filter((r) => !r.resolved)
    .map((r) => r.name.toUpperCase());
  checks.push({
    id: "online-cotrn00c-cics-copy-holes",
    ok:
      !!cotrn00cInv &&
      cotrn00cInv.programIds.includes("COTRN00C") &&
      cotrn00cCicsMissing.length === 0 &&
      cotrn00cResolved.includes("COTRN00") &&
      cotrn00cResolved.includes("COCOM01Y") &&
      cotrn00cResolved.includes("COTTL01Y") &&
      cotrn00cResolved.includes("CSDAT01Y") &&
      cotrn00cResolved.includes("CSMSG01Y") &&
      cotrn00cResolved.includes("CVTRA05Y") &&
      aidCopyOk("DFHAID", cotrn00cResolved, cotrn00cUnresolvedCopy) &&
      aidCopyOk("DFHBMSCA", cotrn00cResolved, cotrn00cUnresolvedCopy) &&
      cotrn00cInv.unresolved.includes("exec-cics") &&
      cotrn00cInv.unresolved.includes("copy") &&
      // Browse-only: STARTBR/READNEXT/READPREV — no COBOL READ/WRITE verb → no file-io hole.
      !cotrn00cInv.unresolved.includes("file-io") &&
      !(cotrn00cInv.execSqlOps || []).length,
    reason: cotrn00cInv
      ? `cicsMissing=${cotrn00cCicsMissing.join(",")} resolved=${cotrn00cResolved.join(",")} unresolvedCopy=${cotrn00cUnresolvedCopy.join(",")} unresolved=${cotrn00cInv.unresolved.join(",")}`
      : "missing-COTRN00C",
  });

  const cotrn01cPath = join(MINI, "online/COTRN01C.cbl");
  const cotrn01cSrc = existsSync(cotrn01cPath) ? readFileSync(cotrn01cPath, "utf8") : "";
  const cotrn01cInv = cotrn01cSrc
    ? inventoryCobolSource(cotrn01cSrc, "online/COTRN01C.cbl")
    : null;
  const cotrn01cCicsNeed = ["RECEIVE", "SEND", "READ", "XCTL", "RETURN"];
  const cotrn01cCicsOps = new Set(cotrn01cInv?.execCicsOps || []);
  const cotrn01cCicsMissing = cotrn01cCicsNeed.filter((o) => !cotrn01cCicsOps.has(o));
  const cotrn01cCopy = resolveCobolCopybooks(cotrn01cInv?.copybooks || [], [copyDir]);
  const cotrn01cResolved = cotrn01cCopy.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  const cotrn01cUnresolvedCopy = cotrn01cCopy
    .filter((r) => !r.resolved)
    .map((r) => r.name.toUpperCase());
  checks.push({
    id: "online-cotrn01c-cics-copy-holes",
    ok:
      !!cotrn01cInv &&
      cotrn01cInv.programIds.includes("COTRN01C") &&
      cotrn01cCicsMissing.length === 0 &&
      cotrn01cResolved.includes("COTRN01") &&
      cotrn01cResolved.includes("COCOM01Y") &&
      cotrn01cResolved.includes("COTTL01Y") &&
      cotrn01cResolved.includes("CSDAT01Y") &&
      cotrn01cResolved.includes("CSMSG01Y") &&
      cotrn01cResolved.includes("CVTRA05Y") &&
      aidCopyOk("DFHAID", cotrn01cResolved, cotrn01cUnresolvedCopy) &&
      aidCopyOk("DFHBMSCA", cotrn01cResolved, cotrn01cUnresolvedCopy) &&
      cotrn01cInv.unresolved.includes("exec-cics") &&
      cotrn01cInv.unresolved.includes("copy") &&
      cotrn01cInv.unresolved.includes("file-io") &&
      !(cotrn01cInv.execSqlOps || []).length,
    reason: cotrn01cInv
      ? `cicsMissing=${cotrn01cCicsMissing.join(",")} resolved=${cotrn01cResolved.join(",")} unresolvedCopy=${cotrn01cUnresolvedCopy.join(",")} unresolved=${cotrn01cInv.unresolved.join(",")}`
      : "missing-COTRN01C",
  });

  const cotrn02cPath = join(MINI, "online/COTRN02C.cbl");
  const cotrn02cSrc = existsSync(cotrn02cPath) ? readFileSync(cotrn02cPath, "utf8") : "";
  const cotrn02cInv = cotrn02cSrc
    ? inventoryCobolSource(cotrn02cSrc, "online/COTRN02C.cbl")
    : null;
  const cotrn02cCicsNeed = [
    "RECEIVE",
    "SEND",
    "READ",
    "STARTBR",
    "READPREV",
    "ENDBR",
    "WRITE",
    "XCTL",
    "RETURN",
  ];
  const cotrn02cCicsOps = new Set(cotrn02cInv?.execCicsOps || []);
  const cotrn02cCicsMissing = cotrn02cCicsNeed.filter((o) => !cotrn02cCicsOps.has(o));
  const cotrn02cCopy = resolveCobolCopybooks(cotrn02cInv?.copybooks || [], [copyDir]);
  const cotrn02cResolved = cotrn02cCopy.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  const cotrn02cUnresolvedCopy = cotrn02cCopy
    .filter((r) => !r.resolved)
    .map((r) => r.name.toUpperCase());
  checks.push({
    id: "online-cotrn02c-cics-copy-holes",
    ok:
      !!cotrn02cInv &&
      cotrn02cInv.programIds.includes("COTRN02C") &&
      cotrn02cCicsMissing.length === 0 &&
      cotrn02cResolved.includes("COTRN02") &&
      cotrn02cResolved.includes("COCOM01Y") &&
      cotrn02cResolved.includes("COTTL01Y") &&
      cotrn02cResolved.includes("CSDAT01Y") &&
      cotrn02cResolved.includes("CSMSG01Y") &&
      cotrn02cResolved.includes("CVTRA05Y") &&
      cotrn02cResolved.includes("CVACT01Y") &&
      cotrn02cResolved.includes("CVACT03Y") &&
      aidCopyOk("DFHAID", cotrn02cResolved, cotrn02cUnresolvedCopy) &&
      aidCopyOk("DFHBMSCA", cotrn02cResolved, cotrn02cUnresolvedCopy) &&
      cotrn02cInv.unresolved.includes("exec-cics") &&
      cotrn02cInv.unresolved.includes("copy") &&
      cotrn02cInv.unresolved.includes("file-io") &&
      !(cotrn02cInv.execSqlOps || []).length,
    reason: cotrn02cInv
      ? `cicsMissing=${cotrn02cCicsMissing.join(",")} resolved=${cotrn02cResolved.join(",")} unresolvedCopy=${cotrn02cUnresolvedCopy.join(",")} unresolved=${cotrn02cInv.unresolved.join(",")}`
      : "missing-COTRN02C",
  });

  const corpt00cPath = join(MINI, "online/CORPT00C.cbl");
  const corpt00cSrc = existsSync(corpt00cPath) ? readFileSync(corpt00cPath, "utf8") : "";
  const corpt00cInv = corpt00cSrc
    ? inventoryCobolSource(corpt00cSrc, "online/CORPT00C.cbl")
    : null;
  const corpt00cCicsNeed = ["RECEIVE", "SEND", "WRITEQ", "XCTL", "RETURN"];
  const corpt00cCicsOps = new Set(corpt00cInv?.execCicsOps || []);
  const corpt00cCicsMissing = corpt00cCicsNeed.filter((o) => !corpt00cCicsOps.has(o));
  const corpt00cCopy = resolveCobolCopybooks(corpt00cInv?.copybooks || [], [copyDir]);
  const corpt00cResolved = corpt00cCopy.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  const corpt00cUnresolvedCopy = corpt00cCopy
    .filter((r) => !r.resolved)
    .map((r) => r.name.toUpperCase());
  checks.push({
    id: "online-corpt00c-cics-copy-holes",
    ok:
      !!corpt00cInv &&
      corpt00cInv.programIds.includes("CORPT00C") &&
      corpt00cCicsMissing.length === 0 &&
      corpt00cResolved.includes("CORPT00") &&
      corpt00cResolved.includes("COCOM01Y") &&
      corpt00cResolved.includes("COTTL01Y") &&
      corpt00cResolved.includes("CSDAT01Y") &&
      corpt00cResolved.includes("CSMSG01Y") &&
      corpt00cResolved.includes("CVTRA05Y") &&
      aidCopyOk("DFHAID", corpt00cResolved, corpt00cUnresolvedCopy) &&
      aidCopyOk("DFHBMSCA", corpt00cResolved, corpt00cUnresolvedCopy) &&
      corpt00cInv.unresolved.includes("exec-cics") &&
      corpt00cInv.unresolved.includes("copy") &&
      // WRITEQ TD intrdr submit — CICS-only; no COBOL READ/WRITE verb → no file-io hole.
      !corpt00cInv.unresolved.includes("file-io") &&
      !(corpt00cInv.execSqlOps || []).length,
    reason: corpt00cInv
      ? `cicsMissing=${corpt00cCicsMissing.join(",")} resolved=${corpt00cResolved.join(",")} unresolvedCopy=${corpt00cUnresolvedCopy.join(",")} unresolved=${corpt00cInv.unresolved.join(",")}`
      : "missing-CORPT00C",
  });

  const porttestPath = join(MINI, "batch/PORTTEST.cbl");
  const porttestSrc = existsSync(porttestPath) ? readFileSync(porttestPath, "utf8") : "";
  const porttestInv = porttestSrc
    ? inventoryCobolSource(porttestSrc, "batch/PORTTEST.cbl")
    : null;
  const porttestResolve = resolveCobolCopybooks(porttestInv?.copybooks || [], [copyDir]);
  const porttestResolved = porttestResolve
    .filter((r) => r.resolved)
    .map((r) => r.name.toUpperCase());
  checks.push({
    id: "batch-porttest-copy-structural",
    ok:
      !!porttestInv &&
      porttestInv.programIds.includes("PORTTEST") &&
      porttestResolved.includes("PORTFLIO") &&
      porttestResolved.includes("ERRHAND") &&
      /\bFUNCTION\s+RANDOM\b/i.test(porttestSrc) &&
      porttestInv.unresolved.includes("function-random") &&
      porttestInv.unresolved.includes("copy") &&
      porttestInv.unresolved.includes("file-io") &&
      (porttestInv.organizationIndexed || 0) === 0 &&
      !/\bMOVE\s+\d+\s+TO\s+WS-TYPE-SUB\b/i.test(porttestSrc),
    reason: porttestInv
      ? `resolved=${porttestResolved.join(",")} unresolved=${porttestInv.unresolved.join(",")}`
      : "missing-PORTTEST",
  });

  const portCopyResolve = resolveCobolCopybooks(portInv?.copybooks || [], [copyDir]);
  const portResolved = portCopyResolve.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  checks.push({
    id: "online-portonln-copy-resolve",
    ok:
      !!portInv &&
      portResolved.includes("PORTCOM") &&
      portInv.evaluateTrue >= 1 &&
      /\bWHEN\s+PORT-CREATE\b/i.test(portSrc) &&
      /\bWHEN\s+PORT-READ\b/i.test(portSrc) &&
      /\bWHEN\s+PORT-UPDATE\b/i.test(portSrc) &&
      /\bWHEN\s+PORT-DELETE\b/i.test(portSrc) &&
      /\bLINK\s+PROGRAM\('PORTMSTR'\)/i.test(portSrc) &&
      portInv.unresolved.includes("copy") &&
      portInv.unresolved.includes("exec-cics"),
    reason: portInv
      ? `resolved=${portResolved.join(",")} books=${(portInv.copybooks || []).join(",")} evalTrue=${portInv.evaluateTrue}`
      : "missing-PORTONLN",
  });

  const portcomrnPath = join(MINI, "batch/PORTCOMRN.cbl");
  const portcomrnSrc = existsSync(portcomrnPath) ? readFileSync(portcomrnPath, "utf8") : "";
  const portcomrnInv = portcomrnSrc
    ? inventoryCobolSource(portcomrnSrc, "batch/PORTCOMRN.cbl")
    : null;
  const portcomrnResolve = resolveCobolCopybooks(portcomrnInv?.copybooks || [], [copyDir]);
  const portcomrnResolved = portcomrnResolve
    .filter((r) => r.resolved)
    .map((r) => r.name.toUpperCase());
  checks.push({
    id: "batch-portcomrn-copy-linked-behavioral",
    ok:
      !!portcomrnInv &&
      portcomrnInv.programIds.includes("PORTCOMRN") &&
      portcomrnResolved.includes("PORTCOM") &&
      portcomrnInv.evaluateTrue >= 1 &&
      /\bWHEN\s+PORT-CREATE\b/i.test(portcomrnSrc) &&
      /\bWHEN\s+PORT-READ\b/i.test(portcomrnSrc) &&
      /\bWHEN\s+PORT-UPDATE\b/i.test(portcomrnSrc) &&
      /\bWHEN\s+PORT-DELETE\b/i.test(portcomrnSrc) &&
      (portcomrnInv.organizationIndexed || 0) === 0 &&
      portcomrnInv.unresolved.includes("copy"),
    reason: portcomrnInv
      ? `resolved=${portcomrnResolved.join(",")} evalTrue=${portcomrnInv.evaluateTrue}`
      : "missing-PORTCOMRN",
  });

  const idxeqnrnPath = join(MINI, "batch/IDXEQNRN.cbl");
  const idxeqnrnSrc = existsSync(idxeqnrnPath) ? readFileSync(idxeqnrnPath, "utf8") : "";
  const idxeqnrnInv = idxeqnrnSrc
    ? inventoryCobolSource(idxeqnrnSrc, "batch/IDXEQNRN.cbl")
    : null;
  checks.push({
    id: "batch-idxeqnrn-start-equal-next",
    ok:
      !!idxeqnrnInv &&
      idxeqnrnInv.programIds.includes("IDXEQNRN") &&
      (idxeqnrnInv.organizationIndexed || 0) >= 1 &&
      /\bSTART\s+IDX-FILE\s+KEY\s+IS\s+EQUAL\s+TO\b/i.test(idxeqnrnSrc) &&
      /\bREAD\s+IDX-FILE\s+NEXT\b/i.test(idxeqnrnSrc) &&
      !/\bREAD\s+IDX-FILE\s+PREVIOUS\b/i.test(idxeqnrnSrc) &&
      idxeqnrnInv.unresolved.includes("indexed-file"),
    reason: idxeqnrnInv
      ? `indexed=${idxeqnrnInv.organizationIndexed} unresolved=${idxeqnrnInv.unresolved.join(",")}`
      : "missing-IDXEQNRN",
  });

  const cobtupdtPath = join(MINI, "batch/COBTUPDT.cbl");
  const cobtupdtSrc = existsSync(cobtupdtPath) ? readFileSync(cobtupdtPath, "utf8") : "";
  const cobtupdtInv = cobtupdtSrc
    ? inventoryCobolSource(cobtupdtSrc, "batch/COBTUPDT.cbl")
    : null;
  const cobtupdtSqlNeed = ["INCLUDE", "INSERT", "UPDATE", "DELETE"];
  const cobtupdtSqlOps = new Set(cobtupdtInv?.execSqlOps || []);
  const cobtupdtSqlMissing = cobtupdtSqlNeed.filter((o) => !cobtupdtSqlOps.has(o));
  const cobtupdtSqlIncNames = (cobtupdtInv?.execSqlIncludes || []).map((n) =>
    String(n).toUpperCase(),
  );
  const cobtupdtSqlIncResolve = resolveCobolCopybooks(cobtupdtSqlIncNames, [copyDir]);
  const cobtupdtSqlIncResolved = cobtupdtSqlIncResolve
    .filter((r) => r.resolved)
    .map((r) => r.name.toUpperCase());
  checks.push({
    id: "batch-cobtupdt-sql-holes",
    ok:
      !!cobtupdtInv &&
      cobtupdtInv.programIds.includes("COBTUPDT") &&
      cobtupdtSqlMissing.length === 0 &&
      cobtupdtSqlIncResolved.includes("SQLCA") &&
      cobtupdtSqlIncResolved.includes("DCLTRTYP") &&
      /\bEVALUATE\s+INPUT-REC-TYPE\b/i.test(cobtupdtSrc) &&
      /\bWHEN\s+'A'/i.test(cobtupdtSrc) &&
      /\bWHEN\s+'U'/i.test(cobtupdtSrc) &&
      /\bWHEN\s+'D'/i.test(cobtupdtSrc) &&
      cobtupdtInv.unresolved.includes("exec-sql") &&
      cobtupdtInv.unresolved.includes("file-io") &&
      (cobtupdtInv.execCics || 0) === 0,
    reason: cobtupdtInv
      ? `sqlMissing=${cobtupdtSqlMissing.join(",")} sqlInc=${cobtupdtSqlIncResolved.join(",")} unresolved=${cobtupdtInv.unresolved.join(",")}`
      : "missing-COBTUPDT",
  });

  const cbact04cPath = join(MINI, "batch/CBACT04C.cbl");
  const cbact04cSrc = existsSync(cbact04cPath) ? readFileSync(cbact04cPath, "utf8") : "";
  const cbact04cInv = cbact04cSrc
    ? inventoryCobolSource(cbact04cSrc, "batch/CBACT04C.cbl")
    : null;
  const cbact04cCopy = resolveCobolCopybooks(cbact04cInv?.copybooks || [], [copyDir]);
  const cbact04cResolved = cbact04cCopy.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  checks.push({
    id: "batch-cbact04c-indexed-copy-holes",
    ok:
      !!cbact04cInv &&
      cbact04cInv.programIds.includes("CBACT04C") &&
      (cbact04cInv.organizationIndexed || 0) >= 2 &&
      cbact04cResolved.includes("CVACT01Y") &&
      cbact04cResolved.includes("CVACT03Y") &&
      cbact04cResolved.includes("CVTRA01Y") &&
      /\bCOMPUTE\s+WS-MONTHLY-INT\b/i.test(cbact04cSrc) &&
      cbact04cInv.unresolved.includes("indexed-file") &&
      cbact04cInv.unresolved.includes("file-io") &&
      (cbact04cInv.execCics || 0) === 0,
    reason: cbact04cInv
      ? `indexed=${cbact04cInv.organizationIndexed} copy=${cbact04cResolved.join(",")} unresolved=${cbact04cInv.unresolved.join(",")}`
      : "missing-CBACT04C",
  });

  const cbtrn02cPath = join(MINI, "batch/CBTRN02C.cbl");
  const cbtrn02cSrc = existsSync(cbtrn02cPath) ? readFileSync(cbtrn02cPath, "utf8") : "";
  const cbtrn02cInv = cbtrn02cSrc
    ? inventoryCobolSource(cbtrn02cSrc, "batch/CBTRN02C.cbl")
    : null;
  const cbtrn02cCopy = resolveCobolCopybooks(cbtrn02cInv?.copybooks || [], [copyDir]);
  const cbtrn02cResolved = cbtrn02cCopy.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  checks.push({
    id: "batch-cbtrn02c-indexed-copy-holes",
    ok:
      !!cbtrn02cInv &&
      cbtrn02cInv.programIds.includes("CBTRN02C") &&
      (cbtrn02cInv.organizationIndexed || 0) >= 2 &&
      cbtrn02cResolved.includes("CVACT01Y") &&
      cbtrn02cResolved.includes("CVACT03Y") &&
      /\bREAD\s+DALYTRAN-FILE\b/i.test(cbtrn02cSrc) &&
      /\bREWRITE\s+FD-ACCTFILE-REC\b/i.test(cbtrn02cSrc) &&
      cbtrn02cInv.unresolved.includes("indexed-file") &&
      cbtrn02cInv.unresolved.includes("file-io") &&
      (cbtrn02cInv.execCics || 0) === 0,
    reason: cbtrn02cInv
      ? `indexed=${cbtrn02cInv.organizationIndexed} copy=${cbtrn02cResolved.join(",")} unresolved=${cbtrn02cInv.unresolved.join(",")}`
      : "missing-CBTRN02C",
  });

  const cbexportPath = join(MINI, "batch/CBEXPORT.cbl");
  const cbexportSrc = existsSync(cbexportPath) ? readFileSync(cbexportPath, "utf8") : "";
  const cbexportInv = cbexportSrc
    ? inventoryCobolSource(cbexportSrc, "batch/CBEXPORT.cbl")
    : null;
  const cbexportCopy = resolveCobolCopybooks(cbexportInv?.copybooks || [], [copyDir]);
  const cbexportResolved = cbexportCopy.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  checks.push({
    id: "batch-cbexport-indexed-copy-holes",
    ok:
      !!cbexportInv &&
      cbexportInv.programIds.includes("CBEXPORT") &&
      (cbexportInv.organizationIndexed || 0) >= 2 &&
      cbexportResolved.includes("CVCUS01Y") &&
      cbexportResolved.includes("CVACT01Y") &&
      cbexportResolved.includes("CVEXPORT") &&
      /\bMOVE\s+'C'\s+TO\s+EXPORT-REC-TYPE\b/i.test(cbexportSrc) &&
      cbexportInv.unresolved.includes("indexed-file") &&
      cbexportInv.unresolved.includes("file-io") &&
      (cbexportInv.execCics || 0) === 0,
    reason: cbexportInv
      ? `indexed=${cbexportInv.organizationIndexed} copy=${cbexportResolved.join(",")} unresolved=${cbexportInv.unresolved.join(",")}`
      : "missing-CBEXPORT",
  });

  const cbimportPath = join(MINI, "batch/CBIMPORT.cbl");
  const cbimportSrc = existsSync(cbimportPath) ? readFileSync(cbimportPath, "utf8") : "";
  const cbimportInv = cbimportSrc
    ? inventoryCobolSource(cbimportSrc, "batch/CBIMPORT.cbl")
    : null;
  const cbimportCopy = resolveCobolCopybooks(cbimportInv?.copybooks || [], [copyDir]);
  const cbimportResolved = cbimportCopy.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  checks.push({
    id: "batch-cbimport-indexed-copy-holes",
    ok:
      !!cbimportInv &&
      cbimportInv.programIds.includes("CBIMPORT") &&
      (cbimportInv.organizationIndexed || 0) >= 1 &&
      cbimportResolved.includes("CVEXPORT") &&
      cbimportResolved.includes("CVCUS01Y") &&
      cbimportResolved.includes("CVACT01Y") &&
      /\bEVALUATE\s+EXPORT-REC-TYPE\b/i.test(cbimportSrc) &&
      /\bWHEN\s+'C'/i.test(cbimportSrc) &&
      /\bWHEN\s+'A'/i.test(cbimportSrc) &&
      cbimportInv.unresolved.includes("indexed-file") &&
      cbimportInv.unresolved.includes("file-io") &&
      (cbimportInv.execCics || 0) === 0,
    reason: cbimportInv
      ? `indexed=${cbimportInv.organizationIndexed} copy=${cbimportResolved.join(",")} unresolved=${cbimportInv.unresolved.join(",")}`
      : "missing-CBIMPORT",
  });

  const cbact01cPath = join(MINI, "batch/CBACT01C.cbl");
  const cbact01cSrc = existsSync(cbact01cPath) ? readFileSync(cbact01cPath, "utf8") : "";
  const cbact01cInv = cbact01cSrc
    ? inventoryCobolSource(cbact01cSrc, "batch/CBACT01C.cbl")
    : null;
  const cbact01cCopy = resolveCobolCopybooks(cbact01cInv?.copybooks || [], [copyDir]);
  const cbact01cResolved = cbact01cCopy.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  checks.push({
    id: "batch-cbact01c-indexed-copy-holes",
    ok:
      !!cbact01cInv &&
      cbact01cInv.programIds.includes("CBACT01C") &&
      (cbact01cInv.organizationIndexed || 0) >= 1 &&
      cbact01cResolved.includes("CVACT01Y") &&
      /\bREAD\s+ACCTFILE-FILE\s+INTO\s+ACCOUNT-RECORD\b/i.test(cbact01cSrc) &&
      cbact01cInv.unresolved.includes("indexed-file") &&
      cbact01cInv.unresolved.includes("file-io") &&
      (cbact01cInv.execCics || 0) === 0,
    reason: cbact01cInv
      ? `indexed=${cbact01cInv.organizationIndexed} copy=${cbact01cResolved.join(",")} unresolved=${cbact01cInv.unresolved.join(",")}`
      : "missing-CBACT01C",
  });

  const cbact02cPath = join(MINI, "batch/CBACT02C.cbl");
  const cbact02cSrc = existsSync(cbact02cPath) ? readFileSync(cbact02cPath, "utf8") : "";
  const cbact02cInv = cbact02cSrc
    ? inventoryCobolSource(cbact02cSrc, "batch/CBACT02C.cbl")
    : null;
  const cbact02cCopy = resolveCobolCopybooks(cbact02cInv?.copybooks || [], [copyDir]);
  const cbact02cResolved = cbact02cCopy.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  checks.push({
    id: "batch-cbact02c-indexed-copy-holes",
    ok:
      !!cbact02cInv &&
      cbact02cInv.programIds.includes("CBACT02C") &&
      (cbact02cInv.organizationIndexed || 0) >= 1 &&
      cbact02cResolved.includes("CVACT02Y") &&
      /\bREAD\s+CARDFILE-FILE\s+INTO\s+CARD-RECORD\b/i.test(cbact02cSrc) &&
      cbact02cInv.unresolved.includes("indexed-file") &&
      cbact02cInv.unresolved.includes("file-io") &&
      (cbact02cInv.execCics || 0) === 0,
    reason: cbact02cInv
      ? `indexed=${cbact02cInv.organizationIndexed} copy=${cbact02cResolved.join(",")} unresolved=${cbact02cInv.unresolved.join(",")}`
      : "missing-CBACT02C",
  });

  const cbact03cPath = join(MINI, "batch/CBACT03C.cbl");
  const cbact03cSrc = existsSync(cbact03cPath) ? readFileSync(cbact03cPath, "utf8") : "";
  const cbact03cInv = cbact03cSrc
    ? inventoryCobolSource(cbact03cSrc, "batch/CBACT03C.cbl")
    : null;
  const cbact03cCopy = resolveCobolCopybooks(cbact03cInv?.copybooks || [], [copyDir]);
  const cbact03cResolved = cbact03cCopy.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  checks.push({
    id: "batch-cbact03c-indexed-copy-holes",
    ok:
      !!cbact03cInv &&
      cbact03cInv.programIds.includes("CBACT03C") &&
      (cbact03cInv.organizationIndexed || 0) >= 1 &&
      cbact03cResolved.includes("CVACT03Y") &&
      /\bREAD\s+XREFFILE-FILE\s+INTO\s+CARD-XREF-RECORD\b/i.test(cbact03cSrc) &&
      cbact03cInv.unresolved.includes("indexed-file") &&
      cbact03cInv.unresolved.includes("file-io") &&
      (cbact03cInv.execCics || 0) === 0,
    reason: cbact03cInv
      ? `indexed=${cbact03cInv.organizationIndexed} copy=${cbact03cResolved.join(",")} unresolved=${cbact03cInv.unresolved.join(",")}`
      : "missing-CBACT03C",
  });

  const cbtrn01cPath = join(MINI, "batch/CBTRN01C.cbl");
  const cbtrn01cSrc = existsSync(cbtrn01cPath) ? readFileSync(cbtrn01cPath, "utf8") : "";
  const cbtrn01cInv = cbtrn01cSrc
    ? inventoryCobolSource(cbtrn01cSrc, "batch/CBTRN01C.cbl")
    : null;
  const cbtrn01cCopy = resolveCobolCopybooks(cbtrn01cInv?.copybooks || [], [copyDir]);
  const cbtrn01cResolved = cbtrn01cCopy.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  checks.push({
    id: "batch-cbtrn01c-indexed-copy-holes",
    ok:
      !!cbtrn01cInv &&
      cbtrn01cInv.programIds.includes("CBTRN01C") &&
      (cbtrn01cInv.organizationIndexed || 0) >= 2 &&
      cbtrn01cResolved.includes("CVTRA06Y") &&
      cbtrn01cResolved.includes("CVACT01Y") &&
      cbtrn01cResolved.includes("CVACT03Y") &&
      /\bREAD\s+DALYTRAN-FILE\s+INTO\s+DALYTRAN-RECORD\b/i.test(cbtrn01cSrc) &&
      cbtrn01cInv.unresolved.includes("indexed-file") &&
      cbtrn01cInv.unresolved.includes("file-io") &&
      (cbtrn01cInv.execCics || 0) === 0,
    reason: cbtrn01cInv
      ? `indexed=${cbtrn01cInv.organizationIndexed} copy=${cbtrn01cResolved.join(",")} unresolved=${cbtrn01cInv.unresolved.join(",")}`
      : "missing-CBTRN01C",
  });

  const cbtrn03cPath = join(MINI, "batch/CBTRN03C.cbl");
  const cbtrn03cSrc = existsSync(cbtrn03cPath) ? readFileSync(cbtrn03cPath, "utf8") : "";
  const cbtrn03cInv = cbtrn03cSrc
    ? inventoryCobolSource(cbtrn03cSrc, "batch/CBTRN03C.cbl")
    : null;
  const cbtrn03cCopy = resolveCobolCopybooks(cbtrn03cInv?.copybooks || [], [copyDir]);
  const cbtrn03cResolved = cbtrn03cCopy.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  checks.push({
    id: "batch-cbtrn03c-indexed-copy-holes",
    ok:
      !!cbtrn03cInv &&
      cbtrn03cInv.programIds.includes("CBTRN03C") &&
      (cbtrn03cInv.organizationIndexed || 0) >= 2 &&
      cbtrn03cResolved.includes("CVTRA05Y") &&
      cbtrn03cResolved.includes("CVTRA03Y") &&
      cbtrn03cResolved.includes("CVTRA07Y") &&
      /\bWRITE\s+FD-REPTFILE-REC\s+FROM\s+REPORT-NAME-HEADER\b/i.test(cbtrn03cSrc) &&
      cbtrn03cInv.unresolved.includes("indexed-file") &&
      cbtrn03cInv.unresolved.includes("file-io") &&
      (cbtrn03cInv.execCics || 0) === 0,
    reason: cbtrn03cInv
      ? `indexed=${cbtrn03cInv.organizationIndexed} copy=${cbtrn03cResolved.join(",")} unresolved=${cbtrn03cInv.unresolved.join(",")}`
      : "missing-CBTRN03C",
  });

  const cbstm03aPath = join(MINI, "batch/CBSTM03A.cbl");
  const cbstm03aSrc = existsSync(cbstm03aPath) ? readFileSync(cbstm03aPath, "utf8") : "";
  const cbstm03aInv = cbstm03aSrc
    ? inventoryCobolSource(cbstm03aSrc, "batch/CBSTM03A.cbl")
    : null;
  const cbstm03aCopy = resolveCobolCopybooks(cbstm03aInv?.copybooks || [], [copyDir]);
  const cbstm03aResolved = cbstm03aCopy.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  checks.push({
    id: "batch-cbstm03a-copy-call-holes",
    ok:
      !!cbstm03aInv &&
      cbstm03aInv.programIds.includes("CBSTM03A") &&
      cbstm03aResolved.includes("COSTM01") &&
      cbstm03aResolved.includes("CUSTREC") &&
      cbstm03aResolved.includes("CVACT01Y") &&
      /\bCALL\s+'CBSTM03B'/i.test(cbstm03aSrc) &&
      cbstm03aInv.unresolved.includes("file-io") &&
      cbstm03aInv.unresolved.includes("call") &&
      (cbstm03aInv.execCics || 0) === 0,
    reason: cbstm03aInv
      ? `copy=${cbstm03aResolved.join(",")} unresolved=${cbstm03aInv.unresolved.join(",")}`
      : "missing-CBSTM03A",
  });

  const cbstm03bPath = join(MINI, "batch/CBSTM03B.cbl");
  const cbstm03bSrc = existsSync(cbstm03bPath) ? readFileSync(cbstm03bPath, "utf8") : "";
  const cbstm03bInv = cbstm03bSrc
    ? inventoryCobolSource(cbstm03bSrc, "batch/CBSTM03B.cbl")
    : null;
  checks.push({
    id: "batch-cbstm03b-indexed-linkage-holes",
    ok:
      !!cbstm03bInv &&
      cbstm03bInv.programIds.includes("CBSTM03B") &&
      (cbstm03bInv.organizationIndexed || 0) >= 4 &&
      /\bPROCEDURE\s+DIVISION\s+USING\s+LK-M03B-AREA\b/i.test(cbstm03bSrc) &&
      /\bEVALUATE\s+LK-M03B-DD\b/i.test(cbstm03bSrc) &&
      cbstm03bInv.unresolved.includes("indexed-file") &&
      cbstm03bInv.unresolved.includes("file-io") &&
      (cbstm03bInv.execCics || 0) === 0,
    reason: cbstm03bInv
      ? `indexed=${cbstm03bInv.organizationIndexed} unresolved=${cbstm03bInv.unresolved.join(",")}`
      : "missing-CBSTM03B",
  });

  const cbcus01cPath = join(MINI, "batch/CBCUS01C.cbl");
  const cbcus01cSrc = existsSync(cbcus01cPath) ? readFileSync(cbcus01cPath, "utf8") : "";
  const cbcus01cInv = cbcus01cSrc
    ? inventoryCobolSource(cbcus01cSrc, "batch/CBCUS01C.cbl")
    : null;
  const cbcus01cCopy = resolveCobolCopybooks(cbcus01cInv?.copybooks || [], [copyDir]);
  const cbcus01cResolved = cbcus01cCopy.filter((r) => r.resolved).map((r) => r.name.toUpperCase());
  checks.push({
    id: "batch-cbcus01c-indexed-copy-holes",
    ok:
      !!cbcus01cInv &&
      cbcus01cInv.programIds.includes("CBCUS01C") &&
      (cbcus01cInv.organizationIndexed || 0) >= 1 &&
      cbcus01cResolved.includes("CVCUS01Y") &&
      /\bREAD\s+CUSTFILE-FILE\s+INTO\s+CUSTOMER-RECORD\b/i.test(cbcus01cSrc) &&
      cbcus01cInv.unresolved.includes("indexed-file") &&
      cbcus01cInv.unresolved.includes("file-io") &&
      (cbcus01cInv.execCics || 0) === 0,
    reason: cbcus01cInv
      ? `indexed=${cbcus01cInv.organizationIndexed} copy=${cbcus01cResolved.join(",")} unresolved=${cbcus01cInv.unresolved.join(",")}`
      : "missing-CBCUS01C",
  });

  const cobswaitPath = join(MINI, "batch/COBSWAIT.cbl");
  const cobswaitSrc = existsSync(cobswaitPath) ? readFileSync(cobswaitPath, "utf8") : "";
  const cobswaitInv = cobswaitSrc
    ? inventoryCobolSource(cobswaitSrc, "batch/COBSWAIT.cbl")
    : null;
  checks.push({
    id: "batch-cobswait-accept-call-holes",
    ok:
      !!cobswaitInv &&
      cobswaitInv.programIds.includes("COBSWAIT") &&
      /\bACCEPT\s+PARM-VALUE\s+FROM\s+SYSIN\b/i.test(cobswaitSrc) &&
      /\bCALL\s+'MVSWAIT'\s+USING\s+MVSWAIT-TIME\b/i.test(cobswaitSrc) &&
      cobswaitInv.unresolved.includes("call") &&
      cobswaitInv.unresolved.includes("accept") &&
      (cobswaitInv.execCics || 0) === 0 &&
      (cobswaitInv.organizationIndexed || 0) === 0,
    reason: cobswaitInv
      ? `unresolved=${cobswaitInv.unresolved.join(",")}`
      : "missing-COBSWAIT",
  });

  const csutldtcPath = join(MINI, "batch/CSUTLDTC.cbl");
  const csutldtcSrc = existsSync(csutldtcPath) ? readFileSync(csutldtcPath, "utf8") : "";
  const csutldtcInv = csutldtcSrc
    ? inventoryCobolSource(csutldtcSrc, "batch/CSUTLDTC.cbl")
    : null;
  checks.push({
    id: "batch-csutldtc-ceedays-call-holes",
    ok:
      !!csutldtcInv &&
      csutldtcInv.programIds.includes("CSUTLDTC") &&
      (csutldtcInv.procedureUsing || 0) >= 1 &&
      (csutldtcInv.procedureUsingArgs || []).includes("LS-DATE") &&
      (csutldtcInv.procedureUsingArgs || []).includes("LS-DATE-FORMAT") &&
      (csutldtcInv.procedureUsingArgs || []).includes("LS-RESULT") &&
      /\bCALL\s+"CEEDAYS"\s+USING\b/i.test(csutldtcSrc) &&
      (csutldtcInv.evaluateTrue || 0) >= 1 &&
      csutldtcInv.unresolved.includes("call") &&
      (csutldtcInv.execCics || 0) === 0,
    reason: csutldtcInv
      ? `using=${(csutldtcInv.procedureUsingArgs || []).join(",")} unresolved=${csutldtcInv.unresolved.join(",")}`
      : "missing-CSUTLDTC",
  });

  const idxnlnrnPath = join(MINI, "batch/IDXNLNRN.cbl");
  const idxnlnrnSrc = existsSync(idxnlnrnPath) ? readFileSync(idxnlnrnPath, "utf8") : "";
  const idxnlnrnInv = idxnlnrnSrc
    ? inventoryCobolSource(idxnlnrnSrc, "batch/IDXNLNRN.cbl")
    : null;
  checks.push({
    id: "batch-idxnlnrn-start-nless-next",
    ok:
      !!idxnlnrnInv &&
      idxnlnrnInv.programIds.includes("IDXNLNRN") &&
      (idxnlnrnInv.organizationIndexed || 0) >= 1 &&
      /\bSTART\s+IDX-FILE\s+KEY\s+IS\s+NOT\s+LESS\s+THAN\b/i.test(idxnlnrnSrc) &&
      /\bREAD\s+IDX-FILE\s+NEXT\b/i.test(idxnlnrnSrc) &&
      !/\bREAD\s+IDX-FILE\s+PREVIOUS\b/i.test(idxnlnrnSrc) &&
      !/\bREWRITE\s+/i.test(idxnlnrnSrc) &&
      idxnlnrnInv.unresolved.includes("indexed-file"),
    reason: idxnlnrnInv
      ? `indexed=${idxnlnrnInv.organizationIndexed} unresolved=${idxnlnrnInv.unresolved.join(",")}`
      : "missing-IDXNLNRN",
  });

  const idxltnrnPath = join(MINI, "batch/IDXLTNRN.cbl");
  const idxltnrnSrc = existsSync(idxltnrnPath) ? readFileSync(idxltnrnPath, "utf8") : "";
  const idxltnrnInv = idxltnrnSrc
    ? inventoryCobolSource(idxltnrnSrc, "batch/IDXLTNRN.cbl")
    : null;
  checks.push({
    id: "batch-idxltnrn-start-less-next",
    ok:
      !!idxltnrnInv &&
      idxltnrnInv.programIds.includes("IDXLTNRN") &&
      (idxltnrnInv.organizationIndexed || 0) >= 1 &&
      /\bSTART\s+IDX-FILE\s+KEY\s+IS\s+LESS\s+THAN\b/i.test(idxltnrnSrc) &&
      !/\bSTART\s+IDX-FILE\s+KEY\s+IS\s+NOT\s+LESS\s+THAN\b/i.test(idxltnrnSrc) &&
      /\bREAD\s+IDX-FILE\s+NEXT\b/i.test(idxltnrnSrc) &&
      !/\bREAD\s+IDX-FILE\s+PREVIOUS\b/i.test(idxltnrnSrc) &&
      !/\bREWRITE\s+/i.test(idxltnrnSrc) &&
      idxltnrnInv.unresolved.includes("indexed-file"),
    reason: idxltnrnInv
      ? `indexed=${idxltnrnInv.organizationIndexed} unresolved=${idxltnrnInv.unresolved.join(",")}`
      : "missing-IDXLTNRN",
  });

  const idxngprnPath = join(MINI, "batch/IDXNGPRN.cbl");
  const idxngprnSrc = existsSync(idxngprnPath) ? readFileSync(idxngprnPath, "utf8") : "";
  const idxngprnInv = idxngprnSrc
    ? inventoryCobolSource(idxngprnSrc, "batch/IDXNGPRN.cbl")
    : null;
  checks.push({
    id: "batch-idxngprn-start-ngt-prev",
    ok:
      !!idxngprnInv &&
      idxngprnInv.programIds.includes("IDXNGPRN") &&
      (idxngprnInv.organizationIndexed || 0) >= 1 &&
      /\bSTART\s+IDX-FILE\s+KEY\s+IS\s+NOT\s+GREATER\s+THAN\b/i.test(idxngprnSrc) &&
      /\bREAD\s+IDX-FILE\s+PREVIOUS\b/i.test(idxngprnSrc) &&
      !/\bREAD\s+IDX-FILE\s+NEXT\b/i.test(idxngprnSrc) &&
      !/\bREWRITE\s+/i.test(idxngprnSrc) &&
      idxngprnInv.unresolved.includes("indexed-file"),
    reason: idxngprnInv
      ? `indexed=${idxngprnInv.organizationIndexed} unresolved=${idxngprnInv.unresolved.join(",")}`
      : "missing-IDXNGPRN",
  });

  const upstreamCkprSrc = existsSync(UPSTREAM_CKPRST)
    ? readFileSync(UPSTREAM_CKPRST, "utf8")
    : "";
  const upstreamCkprInv = upstreamCkprSrc
    ? inventoryCobolSource(upstreamCkprSrc, "_upstream/CKPRST.cbl")
    : null;
  checks.push({
    id: "pattern-lift-evaluate-true",
    ok: !!ckprInv && ckprInv.evaluateTrue >= 1,
    reason: ckprInv ? undefined : "no-ckprstrn-inventory",
  });
  checks.push({
    id: "pattern-lift-procedure-using",
    ok:
      !!upstreamCkprInv &&
      upstreamCkprInv.procedureUsing >= 1 &&
      upstreamCkprInv.procedureUsingArgs.length >= 1,
    reason: upstreamCkprInv
      ? `using=${upstreamCkprInv.procedureUsing} args=${upstreamCkprInv.procedureUsingArgs.join(",")}`
      : "missing-upstream-CKPRST",
  });
  const structuredPath = join(ROOT, "fixtures/hub-gold-cobol-structured/hub.cob");
  const structuredSrc = existsSync(structuredPath) ? readFileSync(structuredPath, "utf8") : "";
  const structuredInv = structuredSrc
    ? inventoryCobolSource(structuredSrc, "hub-gold-cobol-structured/hub.cob")
    : null;
  const structuredRoutes = structuredSrc ? parseCobolRoutes(structuredSrc) : [];
  checks.push({
    id: "pattern-lift-section-routes",
    ok:
      !!structuredInv &&
      structuredInv.sectionNames.includes("MAIN-LOGIC") &&
      structuredRoutes.some((r) => r.path === "/main-logic") &&
      structuredRoutes.some((r) => r.path === "/health"),
    reason: structuredInv
      ? `sections=${structuredInv.sectionNames.join(",")} routes=${structuredRoutes.map((r) => r.path).join(",")}`
      : "missing-structured-fixture",
  });

  const entryProbeSrc = [
    "IDENTIFICATION DIVISION.",
    "PROGRAM-ID. ENTRYPROBE.",
    "PROCEDURE DIVISION.",
    "MAIN.",
    "    ENTRY 'ALT-ENTRY' USING WS-ARG.",
    "    GOBACK.",
  ].join("\n");
  const entryProbeInv = inventoryCobolSource(entryProbeSrc, "entry-probe.cbl");
  checks.push({
    id: "pattern-lift-entry-using",
    ok:
      entryProbeInv.entryCount >= 1 &&
      entryProbeInv.entryNames.includes("ALT-ENTRY") &&
      !!entryrnInv &&
      entryrnInv.entryNames.includes("ALTPHASE") &&
      !!upstreamCkprInv &&
      upstreamCkprInv.procedureUsing >= 1,
    reason: `probe=${entryProbeInv.entryNames.join(",")} entryrn=${entryrnInv?.entryNames?.join(",") ?? "missing"} upstreamUsing=${upstreamCkprInv?.procedureUsing ?? 0}`,
  });

  checks.push({
    id: "structural-floor",
    ok: struct.ratio >= 0.6,
    reason: struct.ratio >= 0.6 ? undefined : `structRatio=${struct.ratio.toFixed(2)}`,
  });

  checks.push({
    id: "docs-floor",
    ok: docs.ratio >= 0.4,
    reason: docs.ratio >= 0.4 ? undefined : `docsRatio=${docs.ratio.toFixed(2)}`,
  });

  checks.push({
    id: "behavioral-track",
    ok: behavioral.ok === true,
    reason: behavioral.reason,
  });

  const behavSubjects = Array.isArray(behavioral.subjects) ? behavioral.subjects : [];
  const behavIds = behavioral.skipped
    ? BEHAVIORAL_SUBJECTS.map((s) => s.id)
    : behavSubjects.filter((s) => s && /** @type {{ok?: boolean}} */ (s).ok).map((s) => /** @type {{id: string}} */ (s).id);
  checks.push({
    id: "behavioral-multi-subject",
    ok: behavioral.skipped
      ? BEHAVIORAL_SUBJECTS.every((s) => existsSync(s.cob) && existsSync(s.expected) && existsSync(s.py))
      : behavIds.length === BEHAVIORAL_SUBJECTS.length && behavioral.ok === true,
    reason: behavioral.skipped
      ? "toolchain-skip-files-present"
      : `green=${behavIds.join(",")} expected=${BEHAVIORAL_SUBJECTS.map((s) => s.id).join(",")}`,
  });

  /** Generated pattern-emit must match expected for every behavioral subject. */
  const pyBin = resolveHubPython();
  /** @type {Array<{ id: string, ok: boolean, pattern?: string, reason?: string }>} */
  const emitGenSubjects = [];
  for (const s of BEHAVIORAL_SUBJECTS) {
    if (!existsSync(s.cob) || !existsSync(s.expected)) {
      emitGenSubjects.push({ id: s.id, ok: false, reason: "missing-files" });
      continue;
    }
    const expected = readFileSync(s.expected, "utf8").trim();
    const src = readFileSync(s.cob, "utf8");
    const gen = emitFromCobolPatterns(src, "python", { subjectId: s.id });
    if (!gen.ok || !gen.code) {
      emitGenSubjects.push({ id: s.id, ok: false, reason: gen.reason || "emit-failed" });
      continue;
    }
    const genDir = join(ROOT, "generated", "_cobol-pattern-emit");
    mkdirSync(genDir, { recursive: true });
    const genPath = join(genDir, `clbs-${s.id}.py`);
    writeFileSync(genPath, gen.code);
    const run = spawnSync(pyBin, [genPath], { cwd: ROOT, encoding: "utf8" });
    const out = (run.stdout || "").trim();
    const ok = run.status === 0 && out === expected && gen.expected === expected;
    emitGenSubjects.push({
      id: s.id,
      ok,
      pattern: gen.pattern,
      reason: ok ? undefined : `out=${JSON.stringify(out)} expected=${JSON.stringify(expected)}`,
    });
  }
  const emitGenOk = emitGenSubjects.every((r) => r.ok);
  checks.push({
    id: "emit-generated-contracts",
    ok: emitGenOk,
    reason: emitGenOk
      ? undefined
      : emitGenSubjects
          .filter((r) => !r.ok)
          .map((r) => `${r.id}:${r.reason}`)
          .join(","),
  });

  const clbsRoot = process.env.CHRYSALIS_COBOL_CLBS_ROOT
    ? resolve(process.env.CHRYSALIS_COBOL_CLBS_ROOT)
    : existsSync(resolve(ROOT, "..", "COBOL-Legacy-Benchmark-Suite"))
      ? resolve(ROOT, "..", "COBOL-Legacy-Benchmark-Suite")
      : null;
  let clbsInventory = null;
  if (clbsRoot && existsSync(clbsRoot)) {
    const allSrc = walkCobolFiles(join(clbsRoot, "src"));
    // Prefer programs (*.cbl/*.cob) over copybooks — first-N alphabetically was all .cpy.
    const programFiles = allSrc.filter((f) => {
      const lower = f.toLowerCase().replace(/\\/g, "/");
      return (
        (lower.endsWith(".cbl") || lower.endsWith(".cob")) &&
        lower.includes("/programs/")
      );
    });
    const onlinePrograms = programFiles.filter((f) =>
      f.toLowerCase().replace(/\\/g, "/").includes("/programs/online/"),
    );
    const batchPrograms = programFiles.filter((f) =>
      f.toLowerCase().replace(/\\/g, "/").includes("/programs/batch/"),
    );
    const otherPrograms = programFiles.filter(
      (f) => !onlinePrograms.includes(f) && !batchPrograms.includes(f),
    );
    const copyFiles = allSrc.filter((f) => f.toLowerCase().endsWith(".cpy"));
    // Stratified sample so CICS (online) and SQL/batch both appear.
    const sampleFiles = [
      ...onlinePrograms.slice(0, 8),
      ...batchPrograms.slice(0, 8),
      ...otherPrograms.slice(0, 4),
      ...copyFiles.slice(0, 6),
    ];
    const sample = sampleFiles.map((f) => {
      const src = readFileSync(f, "utf8");
      return inventoryCobolSource(src, f.replace(clbsRoot, "").replace(/^[\\/]/, ""));
    });
    const sampleProgramIds = [...new Set(sample.flatMap((s) => s.programIds))];
    const sampleCopybooks = [...new Set(sample.flatMap((s) => s.copybooks))];
    const sampleExecCics = sample.reduce((n, s) => n + s.execCics, 0);
    const sampleExecSql = sample.reduce((n, s) => n + s.execSql, 0);
    const samplePerforms = sample.reduce((n, s) => n + s.performs.length, 0);
    clbsInventory = {
      root: clbsRoot,
      fileCount: allSrc.length,
      programFileCount: programFiles.length,
      onlineProgramCount: onlinePrograms.length,
      batchProgramCount: batchPrograms.length,
      copybookFileCount: copyFiles.length,
      sampleCount: sample.length,
      sampleProgramIds: sampleProgramIds.slice(0, 40),
      sampleCopybooks: sampleCopybooks.slice(0, 40),
      sampleExecCics,
      sampleExecSql,
      samplePerforms,
    };
    const inventoryOk =
      allSrc.length > 0 &&
      programFiles.length >= 5 &&
      sampleProgramIds.length >= 3 &&
      (sampleExecCics >= 1 || onlinePrograms.length === 0) &&
      (sampleExecSql >= 1 || batchPrograms.length === 0);
    checks.push({
      id: "clbs-root-inventory",
      ok: inventoryOk,
      reason: inventoryOk
        ? undefined
        : `files=${allSrc.length} programs=${programFiles.length} ids=${sampleProgramIds.length} cics=${sampleExecCics} sql=${sampleExecSql}`,
    });
  } else {
    checks.push({
      id: "clbs-root-inventory",
      ok: true,
      reason: "skipped-no-CHRYSALIS_COBOL_CLBS_ROOT",
    });
  }

  const failed = checks.filter((c) => !c.ok);
  const ok = failed.length === 0;
  progress.end("CLBS COBOL modernization prove", ok, t0);

  const report = {
    kind: "chrysalis.hub.cobol-clbs-prove-smoke",
    schemaVersion: 1,
    ok,
    northStar: {
      corpus: "https://github.com/sentientsergio/COBOL-Legacy-Benchmark-Suite",
      frameworks: ["LegacyCodeBench", "Legacy-Bench", "LegacyBridge/Azure-Legacy-Agents"],
      strategy: ["gnucobol-local", "direct-translate-small", "parallel-execution"],
      doc: "docs/COBOL-MODERNIZATION-PROVE.md",
    },
    scores: {
      structuralCompleteness: {
        weight: W_STRUCT,
        ...struct,
      },
      documentationQuality: {
        weight: W_DOCS,
        ...docs,
      },
      behavioralFidelity: {
        weight: W_BEHAV,
        skipped: behavioral.skipped === true,
        ratio: behavRatio,
        weighted: behavWeighted,
        detail: behavioral,
      },
      overallPercent: Number(overall.toFixed(1)),
      note: behavioral.skipped
        ? "Behavioral track skipped (no cobc) — overall excludes 50% weight; install GnuCOBOL for full score"
        : undefined,
    },
    onlineInventory: onlineInv,
    batchInventory: batchInv,
    ckprstrnInventory: ckprInv,
    deptpayInventory: deptInv,
    emppayrnInventory: emppayInv,
    seqsumInventory: seqsumInv,
    upstreamCkprstInventory: upstreamCkprInv
      ? {
          procedureUsing: upstreamCkprInv.procedureUsing,
          procedureUsingArgs: upstreamCkprInv.procedureUsingArgs,
          evaluateTrue: upstreamCkprInv.evaluateTrue,
          unresolved: upstreamCkprInv.unresolved,
        }
      : null,
    behavioralSubjects: BEHAVIORAL_SUBJECTS.map((s) => s.id),
    behavioralGreen: behavIds,
    emitGenerated: emitGenSubjects,
    onlineCicsOps: onlineInv.execCicsOps,
    cardonlnInventory: cardInv
      ? {
          programIds: cardInv.programIds,
          execCics: cardInv.execCics,
          execCicsOps: cardInv.execCicsOps,
          execCicsMaps: cardInv.execCicsMaps,
          execCicsMapsets: cardInv.execCicsMapsets,
          execCicsLinkPrograms: cardInv.execCicsLinkPrograms,
          execCicsXctlPrograms: cardInv.execCicsXctlPrograms,
          sectionCount: cardInv.sectionCount,
          evaluateWhens: cardInv.evaluateWhens,
          unresolved: cardInv.unresolved,
        }
      : null,
    portonlnInventory: portInv
      ? {
          programIds: portInv.programIds,
          execCics: portInv.execCics,
          execCicsOps: portInv.execCicsOps,
          sectionCount: portInv.sectionCount,
          evaluateWhens: portInv.evaluateWhens,
          unresolved: portInv.unresolved,
        }
      : null,
    clbsInventory,
    checks,
    failed: failed.slice(0, 20),
    generatedAt: new Date().toISOString(),
  };

  const outDir = join(ROOT, "reports", "cobol");
  try {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "clbs-prove.json"), `${JSON.stringify(report, null, 2)}\n`);
  } catch {
    /* reports/ may be gitignored — fine */
  }

  return report;
}

async function main() {
  const r = await runCobolClbsProveSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cobol-clbs-prove-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
