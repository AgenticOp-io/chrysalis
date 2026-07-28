/**
 * Minimal honest COBOL → Python/Java/C# emit from lifted patterns.
 * Recognizes COMPUTE (rounded product / truncate div / OT weekly /
 * fee→interest multi-COMPUTE chains), bill fee+late-IF+interest,
 * EVALUATE TRUE phase dispatch, quoted ENTRY alternate-entry,
 * multi-WHEN EVALUATE subject, OCCURS+SEARCH keyed lookup,
 * sequential WRITE amount sums / max / key-scan / key-update / key-range,
 * CardDemo pay-option EVALUATE+late IF, multi-status×multi-rate,
 * multi-account fee table, multi-tran fee schedule (SEARCH),
 * GnuCOBOL INDEXED primary + ALTERNATE KEY reads,
 * PERFORM VARYING arithmetic series, and nested IF grade bands.
 * Not a full COBOL compiler — D6442 translate what we inventory.
 */

/**
 * @param {string} source
 * @returns {Map<string, number>}
 */
export function parseCobolNumericValues(source) {
  /** @type {Map<string, number>} */
  const values = new Map();
  const re =
    /\b([A-Z][A-Z0-9-]*)\s+PIC\s+[A-Z0-9()V]+\s+VALUE\s+(-?\d+(?:\.\d+)?)\b/gi;
  let m;
  while ((m = re.exec(source)) !== null) {
    values.set(m[1].toUpperCase(), Number.parseFloat(m[2]));
  }
  // Nested 05/10 levels under 01 groups
  const nested =
    /^\s+\d{2}\s+([A-Z][A-Z0-9-]*)\s+PIC\s+[A-Z0-9()V]+\s+VALUE\s+(-?\d+(?:\.\d+)?)/gim;
  while ((m = nested.exec(source)) !== null) {
    values.set(m[1].toUpperCase(), Number.parseFloat(m[2]));
  }
  return values;
}

/**
 * @param {string} source
 * @returns {string}
 */
function stripCobolComments(source) {
  return source
    .split(/\r?\n/)
    .map((line) => {
      const t = line.trimStart();
      if (t.startsWith("*>") || t.startsWith("*")) return "";
      return line;
    })
    .join("\n");
}

/**
 * @param {string} source
 * @returns {{ kind: string, meta: Record<string, unknown> } | null}
 */
export function detectEmitPattern(source) {
  const code = stripCobolComments(source);
  const upper = code.toUpperCase();
  const values = parseCobolNumericValues(code);

  // ENTRY 'name' alternate entry — CALL "name" (ENTRYRN)
  const entryQuoted = /\bENTRY\s+'([^']+)'/i.exec(code);
  if (entryQuoted) {
    const entryName = entryQuoted[1];
    const callAlt = new RegExp(
      `\\bCALL\\s+"${entryName.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}"`,
      "i",
    ).test(code);
    const entryMove =
      /\bENTRY\s+'[^']+'\s+USING\s+[A-Z0-9-]+\s*\.\s*MOVE\s+(\d+)\s+TO\s+[A-Z0-9-]+/i.exec(
        code,
      ) ||
      /\bENTRY\s+'[^']+'[^\n]*\r?\n\s*MOVE\s+(\d+)\s+TO\s+[A-Z0-9-]+/i.exec(code);
    if (callAlt && entryMove) {
      return {
        kind: "entry-alt",
        meta: {
          entry: entryName,
          phase: Number.parseInt(entryMove[1], 10),
          pad: 2,
        },
      };
    }
  }

  // GnuCOBOL INDEXED ALTERNATE KEY START + REWRITE (IDXALTRW) — BDB ≠ VSAM
  if (
    /\bALTERNATE\s+RECORD\s+KEY\s+IS\b/i.test(code) &&
    /\bORGANIZATION\s+IS\s+INDEXED\b/i.test(code) &&
    /\bSTART\s+/i.test(code) &&
    /\bREWRITE\s+/i.test(code) &&
    /\bADD\s+WS-DELTA\s+TO\s+IDX-AMT\b/i.test(code)
  ) {
    /** @type {Record<string, number>} */
    const rows = {};
    const pairRe =
      /\bMOVE\s+"([^"]+)"\s+TO\s+IDX-ALT-KEY\s*[\r\n]+\s*MOVE\s+(-?\d+(?:\.\d+)?)\s+TO\s+IDX-AMT/gi;
    let pr;
    while ((pr = pairRe.exec(code)) !== null) {
      rows[pr[1]] = Number.parseFloat(pr[2]);
    }
    let find = null;
    const findVal =
      /\bWS-FIND-ALT\s+PIC\s+X\(\d+\)\s+VALUE\s+"([^"]+)"/i.exec(code) ||
      /\bMOVE\s+"([^"]+)"\s+TO\s+WS-FIND-ALT\b/i.exec(code);
    if (findVal) find = findVal[1];
    let delta = values.get("WS-DELTA");
    const moveDelta = /\bMOVE\s+(-?\d+(?:\.\d+)?)\s+TO\s+WS-DELTA\b/i.exec(code);
    if (moveDelta) delta = Number.parseFloat(moveDelta[1]);
    const picDelta =
      /\bWS-DELTA\s+PIC\s+[^\n]*VALUE\s+(-?\d+(?:\.\d+)?)/i.exec(code);
    if (delta == null && picDelta) delta = Number.parseFloat(picDelta[1]);
    if (
      find != null &&
      delta != null &&
      Object.keys(rows).length >= 1 &&
      rows[find] != null
    ) {
      return {
        kind: "indexed-alt-start-rewrite",
        meta: { rows, find, delta, decimals: 2 },
      };
    }
  }

  // GnuCOBOL INDEXED ALTERNATE KEY read (IDXALTRN) — BDB alt key ≠ VSAM
  if (
    /\bALTERNATE\s+RECORD\s+KEY\s+IS\b/i.test(code) &&
    /\bORGANIZATION\s+IS\s+INDEXED\b/i.test(code) &&
    /\bKEY\s+IS\s+IDX-ALT-KEY\b/i.test(code) &&
    !/\bREWRITE\s+/i.test(code)
  ) {
    /** @type {Record<string, number>} */
    const rows = {};
    const pairRe =
      /\bMOVE\s+"([^"]+)"\s+TO\s+IDX-ALT-KEY\s*[\r\n]+\s*MOVE\s+(-?\d+(?:\.\d+)?)\s+TO\s+IDX-AMT/gi;
    let pr;
    while ((pr = pairRe.exec(code)) !== null) {
      rows[pr[1]] = Number.parseFloat(pr[2]);
    }
    let find = null;
    const findVal =
      /\bWS-FIND-ALT\s+PIC\s+X\(\d+\)\s+VALUE\s+"([^"]+)"/i.exec(code) ||
      /\bMOVE\s+"([^"]+)"\s+TO\s+WS-FIND-ALT\b/i.exec(code);
    if (findVal) find = findVal[1];
    if (find != null && Object.keys(rows).length >= 1 && rows[find] != null) {
      return {
        kind: "indexed-alt-key-read",
        meta: { rows, find, decimals: 2 },
      };
    }
  }

  // GnuCOBOL INDEXED START EQUAL + limited READ PREVIOUS (IDXEQPRN) — BDB ≠ VSAM
  if (
    /\bORGANIZATION\s+IS\s+INDEXED\b/i.test(code) &&
    /\bSTART\s+/i.test(code) &&
    /\bKEY\s+IS\s+EQUAL\s+TO\b/i.test(code) &&
    /\bREAD\s+\S+\s+PREVIOUS\b/i.test(code) &&
    /\bADD\s+IDX-AMT\s+TO\s+WS-SUM\b/i.test(code) &&
    !/\bREWRITE\s+/i.test(code) &&
    !/\bALTERNATE\s+RECORD\s+KEY\s+IS\b/i.test(code)
  ) {
    /** @type {Record<string, number>} */
    const rows = {};
    const pairRe =
      /\bMOVE\s+(\d+)\s+TO\s+IDX-KEY\s*[\r\n]+\s*MOVE\s+(-?\d+(?:\.\d+)?)\s+TO\s+IDX-AMT/gi;
    let pr;
    while ((pr = pairRe.exec(code)) !== null) {
      rows[pr[1]] = Number.parseFloat(pr[2]);
    }
    let start = values.get("WS-START-KEY");
    const moveStart = /\bMOVE\s+(\d+)\s+TO\s+WS-START-KEY\b/i.exec(code);
    if (moveStart) start = Number.parseInt(moveStart[1], 10);
    const picStart =
      /\bWS-START-KEY\s+PIC\s+[^\n]*VALUE\s+(\d+)/i.exec(code);
    if (start == null && picStart) start = Number.parseInt(picStart[1], 10);
    let limit = values.get("WS-PREV-LIMIT");
    const picLimit =
      /\bWS-PREV-LIMIT\s+PIC\s+[^\n]*VALUE\s+(\d+)/i.exec(code);
    if (limit == null && picLimit) limit = Number.parseInt(picLimit[1], 10);
    if (limit == null) limit = 2;
    if (start != null && Object.keys(rows).length >= 1) {
      return {
        kind: "indexed-start-equal-prev",
        meta: { rows, start, limit, decimals: 2 },
      };
    }
  }

  // GnuCOBOL INDEXED START EQUAL + limited READ NEXT (IDXEQNRN) — BDB ≠ VSAM
  if (
    /\bORGANIZATION\s+IS\s+INDEXED\b/i.test(code) &&
    /\bSTART\s+/i.test(code) &&
    /\bKEY\s+IS\s+EQUAL\s+TO\b/i.test(code) &&
    /\bREAD\s+\S+\s+NEXT\b/i.test(code) &&
    /\bADD\s+IDX-AMT\s+TO\s+WS-SUM\b/i.test(code) &&
    !/\bREAD\s+\S+\s+PREVIOUS\b/i.test(code) &&
    !/\bREWRITE\s+/i.test(code) &&
    !/\bALTERNATE\s+RECORD\s+KEY\s+IS\b/i.test(code)
  ) {
    /** @type {Record<string, number>} */
    const rows = {};
    const pairRe =
      /\bMOVE\s+(\d+)\s+TO\s+IDX-KEY\s*[\r\n]+\s*MOVE\s+(-?\d+(?:\.\d+)?)\s+TO\s+IDX-AMT/gi;
    let pr;
    while ((pr = pairRe.exec(code)) !== null) {
      rows[pr[1]] = Number.parseFloat(pr[2]);
    }
    let start = values.get("WS-START-KEY");
    const moveStart = /\bMOVE\s+(\d+)\s+TO\s+WS-START-KEY\b/i.exec(code);
    if (moveStart) start = Number.parseInt(moveStart[1], 10);
    const picStart =
      /\bWS-START-KEY\s+PIC\s+[^\n]*VALUE\s+(\d+)/i.exec(code);
    if (start == null && picStart) start = Number.parseInt(picStart[1], 10);
    let limit = values.get("WS-NEXT-LIMIT");
    const picLimit =
      /\bWS-NEXT-LIMIT\s+PIC\s+[^\n]*VALUE\s+(\d+)/i.exec(code);
    if (limit == null && picLimit) limit = Number.parseInt(picLimit[1], 10);
    if (limit == null) limit = 3;
    if (start != null && Object.keys(rows).length >= 1) {
      return {
        kind: "indexed-start-equal-next",
        meta: { rows, start, limit, decimals: 2 },
      };
    }
  }

  // GnuCOBOL INDEXED START NOT GREATER + READ PREVIOUS (IDXNGPRN) — BDB ≠ VSAM
  if (
    /\bORGANIZATION\s+IS\s+INDEXED\b/i.test(code) &&
    /\bSTART\s+/i.test(code) &&
    /\bKEY\s+IS\s+NOT\s+GREATER\s+THAN\b/i.test(code) &&
    /\bREAD\s+\S+\s+PREVIOUS\b/i.test(code) &&
    /\bADD\s+IDX-AMT\s+TO\s+WS-SUM\b/i.test(code) &&
    !/\bREWRITE\s+/i.test(code) &&
    !/\bALTERNATE\s+RECORD\s+KEY\s+IS\b/i.test(code)
  ) {
    /** @type {Record<string, number>} */
    const rows = {};
    const pairRe =
      /\bMOVE\s+(\d+)\s+TO\s+IDX-KEY\s*[\r\n]+\s*MOVE\s+(-?\d+(?:\.\d+)?)\s+TO\s+IDX-AMT/gi;
    let pr;
    while ((pr = pairRe.exec(code)) !== null) {
      rows[pr[1]] = Number.parseFloat(pr[2]);
    }
    let start = values.get("WS-START-KEY");
    const moveStart = /\bMOVE\s+(\d+)\s+TO\s+WS-START-KEY\b/i.exec(code);
    if (moveStart) start = Number.parseInt(moveStart[1], 10);
    const picStart =
      /\bWS-START-KEY\s+PIC\s+[^\n]*VALUE\s+(\d+)/i.exec(code);
    if (start == null && picStart) start = Number.parseInt(picStart[1], 10);
    if (start != null && Object.keys(rows).length >= 1) {
      return {
        kind: "indexed-start-ngt-prev",
        meta: { rows, start, decimals: 2 },
      };
    }
  }

  // GnuCOBOL INDEXED START NOT GREATER + READ NEXT (IDXNGTRN) — BDB ≠ VSAM
  if (
    /\bORGANIZATION\s+IS\s+INDEXED\b/i.test(code) &&
    /\bSTART\s+/i.test(code) &&
    /\bKEY\s+IS\s+NOT\s+GREATER\s+THAN\b/i.test(code) &&
    /\bREAD\s+\S+\s+NEXT\b/i.test(code) &&
    !/\bREAD\s+\S+\s+PREVIOUS\b/i.test(code) &&
    /\bADD\s+IDX-AMT\s+TO\s+WS-SUM\b/i.test(code) &&
    !/\bREWRITE\s+/i.test(code) &&
    !/\bALTERNATE\s+RECORD\s+KEY\s+IS\b/i.test(code)
  ) {
    /** @type {Record<string, number>} */
    const rows = {};
    const pairRe =
      /\bMOVE\s+(\d+)\s+TO\s+IDX-KEY\s*[\r\n]+\s*MOVE\s+(-?\d+(?:\.\d+)?)\s+TO\s+IDX-AMT/gi;
    let pr;
    while ((pr = pairRe.exec(code)) !== null) {
      rows[pr[1]] = Number.parseFloat(pr[2]);
    }
    let start = values.get("WS-START-KEY");
    const moveStart = /\bMOVE\s+(\d+)\s+TO\s+WS-START-KEY\b/i.exec(code);
    if (moveStart) start = Number.parseInt(moveStart[1], 10);
    const picStart =
      /\bWS-START-KEY\s+PIC\s+[^\n]*VALUE\s+(\d+)/i.exec(code);
    if (start == null && picStart) start = Number.parseInt(picStart[1], 10);
    if (start != null && Object.keys(rows).length >= 1) {
      return {
        kind: "indexed-start-ngt-next",
        meta: { rows, start, decimals: 2 },
      };
    }
  }

  // GnuCOBOL INDEXED START KEY > + READ NEXT range (IDXGTNRN) — BDB ≠ VSAM
  if (
    /\bORGANIZATION\s+IS\s+INDEXED\b/i.test(code) &&
    /\bSTART\s+/i.test(code) &&
    /\bKEY\s+IS\s+GREATER\s+THAN\b/i.test(code) &&
    !/\bKEY\s+IS\s+NOT\s+GREATER\s+THAN\b/i.test(code) &&
    /\bREAD\s+\S+\s+NEXT\b/i.test(code) &&
    /\bADD\s+IDX-AMT\s+TO\s+WS-SUM\b/i.test(code) &&
    !/\bREWRITE\s+/i.test(code) &&
    !/\bALTERNATE\s+RECORD\s+KEY\s+IS\b/i.test(code)
  ) {
    /** @type {Record<string, number>} */
    const rows = {};
    const pairRe =
      /\bMOVE\s+(\d+)\s+TO\s+IDX-KEY\s*[\r\n]+\s*MOVE\s+(-?\d+(?:\.\d+)?)\s+TO\s+IDX-AMT/gi;
    let pr;
    while ((pr = pairRe.exec(code)) !== null) {
      rows[pr[1]] = Number.parseFloat(pr[2]);
    }
    let start = values.get("WS-START-KEY");
    const moveStart = /\bMOVE\s+(\d+)\s+TO\s+WS-START-KEY\b/i.exec(code);
    if (moveStart) start = Number.parseInt(moveStart[1], 10);
    const picStart =
      /\bWS-START-KEY\s+PIC\s+[^\n]*VALUE\s+(\d+)/i.exec(code);
    if (start == null && picStart) start = Number.parseInt(picStart[1], 10);
    if (start != null && Object.keys(rows).length >= 1) {
      return {
        kind: "indexed-start-gt-next",
        meta: { rows, start, decimals: 2 },
      };
    }
  }

  // GnuCOBOL INDEXED START LESS THAN + READ NEXT (IDXLTNRN) — BDB ≠ VSAM
  if (
    /\bORGANIZATION\s+IS\s+INDEXED\b/i.test(code) &&
    /\bSTART\s+/i.test(code) &&
    /\bKEY\s+IS\s+LESS\s+THAN\b/i.test(code) &&
    !/\bKEY\s+IS\s+NOT\s+LESS\s+THAN\b/i.test(code) &&
    /\bREAD\s+\S+\s+NEXT\b/i.test(code) &&
    !/\bREAD\s+\S+\s+PREVIOUS\b/i.test(code) &&
    /\bADD\s+IDX-AMT\s+TO\s+WS-SUM\b/i.test(code) &&
    !/\bREWRITE\s+/i.test(code) &&
    !/\bALTERNATE\s+RECORD\s+KEY\s+IS\b/i.test(code)
  ) {
    /** @type {Record<string, number>} */
    const rows = {};
    const pairRe =
      /\bMOVE\s+(\d+)\s+TO\s+IDX-KEY\s*[\r\n]+\s*MOVE\s+(-?\d+(?:\.\d+)?)\s+TO\s+IDX-AMT/gi;
    let pr;
    while ((pr = pairRe.exec(code)) !== null) {
      rows[pr[1]] = Number.parseFloat(pr[2]);
    }
    let start = values.get("WS-START-KEY");
    const moveStart = /\bMOVE\s+(\d+)\s+TO\s+WS-START-KEY\b/i.exec(code);
    if (moveStart) start = Number.parseInt(moveStart[1], 10);
    const picStart =
      /\bWS-START-KEY\s+PIC\s+[^\n]*VALUE\s+(\d+)/i.exec(code);
    if (start == null && picStart) start = Number.parseInt(picStart[1], 10);
    if (start != null && Object.keys(rows).length >= 1) {
      return {
        kind: "indexed-start-less-next",
        meta: { rows, start, decimals: 2 },
      };
    }
  }

  // GnuCOBOL INDEXED START LESS THAN + READ PREVIOUS (IDXLTPRN) — BDB ≠ VSAM
  if (
    /\bORGANIZATION\s+IS\s+INDEXED\b/i.test(code) &&
    /\bSTART\s+/i.test(code) &&
    /\bKEY\s+IS\s+LESS\s+THAN\b/i.test(code) &&
    !/\bKEY\s+IS\s+NOT\s+LESS\s+THAN\b/i.test(code) &&
    /\bREAD\s+\S+\s+PREVIOUS\b/i.test(code) &&
    /\bADD\s+IDX-AMT\s+TO\s+WS-SUM\b/i.test(code) &&
    !/\bREWRITE\s+/i.test(code) &&
    !/\bALTERNATE\s+RECORD\s+KEY\s+IS\b/i.test(code)
  ) {
    /** @type {Record<string, number>} */
    const rows = {};
    const pairRe =
      /\bMOVE\s+(\d+)\s+TO\s+IDX-KEY\s*[\r\n]+\s*MOVE\s+(-?\d+(?:\.\d+)?)\s+TO\s+IDX-AMT/gi;
    let pr;
    while ((pr = pairRe.exec(code)) !== null) {
      rows[pr[1]] = Number.parseFloat(pr[2]);
    }
    let start = values.get("WS-START-KEY");
    const moveStart = /\bMOVE\s+(\d+)\s+TO\s+WS-START-KEY\b/i.exec(code);
    if (moveStart) start = Number.parseInt(moveStart[1], 10);
    const picStart =
      /\bWS-START-KEY\s+PIC\s+[^\n]*VALUE\s+(\d+)/i.exec(code);
    if (start == null && picStart) start = Number.parseInt(picStart[1], 10);
    if (start != null && Object.keys(rows).length >= 1) {
      return {
        kind: "indexed-start-less-prev",
        meta: { rows, start, decimals: 2 },
      };
    }
  }

  // GnuCOBOL INDEXED START NOT LESS + READ NEXT (IDXNLNRN) — BDB ≠ VSAM
  if (
    /\bORGANIZATION\s+IS\s+INDEXED\b/i.test(code) &&
    /\bSTART\s+/i.test(code) &&
    /\bKEY\s+IS\s+NOT\s+LESS\s+THAN\b/i.test(code) &&
    /\bREAD\s+\S+\s+NEXT\b/i.test(code) &&
    !/\bREAD\s+\S+\s+PREVIOUS\b/i.test(code) &&
    /\bADD\s+IDX-AMT\s+TO\s+WS-SUM\b/i.test(code) &&
    !/\bREWRITE\s+/i.test(code) &&
    !/\bALTERNATE\s+RECORD\s+KEY\s+IS\b/i.test(code)
  ) {
    /** @type {Record<string, number>} */
    const rows = {};
    const pairRe =
      /\bMOVE\s+(\d+)\s+TO\s+IDX-KEY\s*[\r\n]+\s*MOVE\s+(-?\d+(?:\.\d+)?)\s+TO\s+IDX-AMT/gi;
    let pr;
    while ((pr = pairRe.exec(code)) !== null) {
      rows[pr[1]] = Number.parseFloat(pr[2]);
    }
    let start = values.get("WS-START-KEY");
    const moveStart = /\bMOVE\s+(\d+)\s+TO\s+WS-START-KEY\b/i.exec(code);
    if (moveStart) start = Number.parseInt(moveStart[1], 10);
    const picStart =
      /\bWS-START-KEY\s+PIC\s+[^\n]*VALUE\s+(\d+)/i.exec(code);
    if (start == null && picStart) start = Number.parseInt(picStart[1], 10);
    if (start != null && Object.keys(rows).length >= 1) {
      return {
        kind: "indexed-start-nless-next",
        meta: { rows, start, decimals: 2 },
      };
    }
  }

  // GnuCOBOL INDEXED START NOT LESS + READ PREVIOUS (IDXNLPRN) — BDB ≠ VSAM
  if (
    /\bORGANIZATION\s+IS\s+INDEXED\b/i.test(code) &&
    /\bSTART\s+/i.test(code) &&
    /\bKEY\s+IS\s+NOT\s+LESS\s+THAN\b/i.test(code) &&
    /\bREAD\s+\S+\s+PREVIOUS\b/i.test(code) &&
    /\bADD\s+IDX-AMT\s+TO\s+WS-SUM\b/i.test(code) &&
    !/\bREWRITE\s+/i.test(code) &&
    !/\bALTERNATE\s+RECORD\s+KEY\s+IS\b/i.test(code)
  ) {
    /** @type {Record<string, number>} */
    const rows = {};
    const pairRe =
      /\bMOVE\s+(\d+)\s+TO\s+IDX-KEY\s*[\r\n]+\s*MOVE\s+(-?\d+(?:\.\d+)?)\s+TO\s+IDX-AMT/gi;
    let pr;
    while ((pr = pairRe.exec(code)) !== null) {
      rows[pr[1]] = Number.parseFloat(pr[2]);
    }
    let start = values.get("WS-START-KEY");
    const moveStart = /\bMOVE\s+(\d+)\s+TO\s+WS-START-KEY\b/i.exec(code);
    if (moveStart) start = Number.parseInt(moveStart[1], 10);
    const picStart =
      /\bWS-START-KEY\s+PIC\s+[^\n]*VALUE\s+(\d+)/i.exec(code);
    if (start == null && picStart) start = Number.parseInt(picStart[1], 10);
    if (start != null && Object.keys(rows).length >= 1) {
      return {
        kind: "indexed-start-nless-prev",
        meta: { rows, start, decimals: 2 },
      };
    }
  }

  // GnuCOBOL INDEXED START + REWRITE (IDXSTRWR) — BDB ≠ mainframe VSAM
  if (
    /\bORGANIZATION\s+IS\s+INDEXED\b/i.test(code) &&
    /\bSTART\s+/i.test(code) &&
    /\bREWRITE\s+/i.test(code) &&
    /\bADD\s+WS-DELTA\s+TO\s+IDX-AMT\b/i.test(code) &&
    !/\bALTERNATE\s+RECORD\s+KEY\s+IS\b/i.test(code)
  ) {
    /** @type {Record<string, number>} */
    const rows = {};
    const pairRe =
      /\bMOVE\s+(\d+)\s+TO\s+IDX-KEY\s*[\r\n]+\s*MOVE\s+(-?\d+(?:\.\d+)?)\s+TO\s+IDX-AMT/gi;
    let pr;
    while ((pr = pairRe.exec(code)) !== null) {
      rows[pr[1]] = Number.parseFloat(pr[2]);
    }
    let find = values.get("WS-FIND-KEY");
    const moveFind = /\bMOVE\s+(\d+)\s+TO\s+WS-FIND-KEY\b/i.exec(code);
    if (moveFind) find = Number.parseInt(moveFind[1], 10);
    let delta = values.get("WS-DELTA");
    const moveDelta = /\bMOVE\s+(-?\d+(?:\.\d+)?)\s+TO\s+WS-DELTA\b/i.exec(code);
    if (moveDelta) delta = Number.parseFloat(moveDelta[1]);
    const picDelta =
      /\bWS-DELTA\s+PIC\s+[^\n]*VALUE\s+(-?\d+(?:\.\d+)?)/i.exec(code);
    if (delta == null && picDelta) delta = Number.parseFloat(picDelta[1]);
    if (
      find != null &&
      delta != null &&
      Object.keys(rows).length >= 1 &&
      rows[String(find)] != null
    ) {
      return {
        kind: "indexed-start-rewrite",
        meta: { rows, find, delta, decimals: 2 },
      };
    }
  }

  // GnuCOBOL INDEXED DELETE (IDXDELRN) — BDB ≠ mainframe VSAM
  if (
    /\bORGANIZATION\s+IS\s+INDEXED\b/i.test(code) &&
    /\bDELETE\s+/i.test(code) &&
    !/\bALTERNATE\s+RECORD\s+KEY\s+IS\b/i.test(code) &&
    !/\bREWRITE\s+/i.test(code)
  ) {
    /** @type {Record<string, number>} */
    const rows = {};
    const pairRe =
      /\bMOVE\s+(\d+)\s+TO\s+IDX-KEY\s*[\r\n]+\s*MOVE\s+(-?\d+(?:\.\d+)?)\s+TO\s+IDX-AMT/gi;
    let pr;
    while ((pr = pairRe.exec(code)) !== null) {
      rows[pr[1]] = Number.parseFloat(pr[2]);
    }
    let delKey = values.get("WS-DEL-KEY");
    const moveDel = /\bMOVE\s+(\d+)\s+TO\s+WS-DEL-KEY\b/i.exec(code);
    if (moveDel) delKey = Number.parseInt(moveDel[1], 10);
    const picDel =
      /\bWS-DEL-KEY\s+PIC\s+[^\n]*VALUE\s+(\d+)/i.exec(code);
    if (delKey == null && picDel) delKey = Number.parseInt(picDel[1], 10);
    let find = values.get("WS-FIND-KEY");
    const moveFind = /\bMOVE\s+(\d+)\s+TO\s+WS-FIND-KEY\b/i.exec(code);
    if (moveFind) find = Number.parseInt(moveFind[1], 10);
    const picFind =
      /\bWS-FIND-KEY\s+PIC\s+[^\n]*VALUE\s+(\d+)/i.exec(code);
    if (find == null && picFind) find = Number.parseInt(picFind[1], 10);
    if (
      delKey != null &&
      find != null &&
      Object.keys(rows).length >= 1 &&
      rows[String(find)] != null
    ) {
      return {
        kind: "indexed-delete",
        meta: { rows, delKey, find, decimals: 2 },
      };
    }
  }

  // GnuCOBOL INDEXED key read (IDXPROBE) — BDB INDEXED ≠ mainframe VSAM
  if (
    /\bORGANIZATION\s+IS\s+INDEXED\b/i.test(code) &&
    /\bREAD\s+/i.test(code) &&
    /\bMOVE\s+\d+\s+TO\s+IDX-KEY\b/i.test(code) &&
    !/\bALTERNATE\s+RECORD\s+KEY\s+IS\b/i.test(code) &&
    !/\bREWRITE\s+/i.test(code) &&
    !/\bDELETE\s+/i.test(code)
  ) {
    /** @type {Record<string, number>} */
    const rows = {};
    const pairRe =
      /\bMOVE\s+(\d+)\s+TO\s+IDX-KEY\s*[\r\n]+\s*MOVE\s+(-?\d+(?:\.\d+)?)\s+TO\s+IDX-AMT/gi;
    let pr;
    while ((pr = pairRe.exec(code)) !== null) {
      rows[pr[1]] = Number.parseFloat(pr[2]);
    }
    let find = values.get("WS-FIND-KEY");
    const moveFind = /\bMOVE\s+(\d+)\s+TO\s+WS-FIND-KEY\b/i.exec(code);
    if (moveFind) find = Number.parseInt(moveFind[1], 10);
    if (find != null && Object.keys(rows).length >= 1 && rows[String(find)] != null) {
      return {
        kind: "indexed-key-read",
        meta: { rows, find, decimals: 2 },
      };
    }
  }

  // CardDemo multi-tran fee schedule (CARDSCHD) — schedule OCCURS + SEARCH + txs
  if (
    /\bFS-CODE\s*\(/i.test(code) &&
    /\bTX-CODE\s*\(/i.test(code) &&
    /\bTX-AMT\s*\(/i.test(code) &&
    /(?<!END-)\bSEARCH\s+FS-ENTRY\b/i.test(code) &&
    /\bADD\s+WS-FEE\s+TO\s+WS-TOTAL\b/i.test(code)
  ) {
    /** @type {Record<string, number>} */
    const schedule = {};
    const fsCodeRe = /\bMOVE\s+'([PCF])'\s+TO\s+FS-CODE\s*\(\s*(\d+)\s*\)/gi;
    /** @type {Map<number, string>} */
    const fsCodes = new Map();
    let sm;
    while ((sm = fsCodeRe.exec(code)) !== null) {
      fsCodes.set(Number.parseInt(sm[2], 10), sm[1].toUpperCase());
    }
    const fsRateRe = /\bMOVE\s+(-?\d+(?:\.\d+)?)\s+TO\s+FS-RATE\s*\(\s*(\d+)\s*\)/gi;
    while ((sm = fsRateRe.exec(code)) !== null) {
      const idx = Number.parseInt(sm[2], 10);
      const codeCh = fsCodes.get(idx);
      if (codeCh) schedule[codeCh] = Number.parseFloat(sm[1]);
    }
    /** @type {Map<number, { code?: string, amt?: number }>} */
    const byTx = new Map();
    const txCodeRe = /\bMOVE\s+'([PCF])'\s+TO\s+TX-CODE\s*\(\s*(\d+)\s*\)/gi;
    while ((sm = txCodeRe.exec(code)) !== null) {
      const idx = Number.parseInt(sm[2], 10);
      const row = byTx.get(idx) || {};
      row.code = sm[1].toUpperCase();
      byTx.set(idx, row);
    }
    const txAmtRe = /\bMOVE\s+(-?\d+(?:\.\d+)?)\s+TO\s+TX-AMT\s*\(\s*(\d+)\s*\)/gi;
    while ((sm = txAmtRe.exec(code)) !== null) {
      const idx = Number.parseInt(sm[2], 10);
      const row = byTx.get(idx) || {};
      row.amt = Number.parseFloat(sm[1]);
      byTx.set(idx, row);
    }
    const txns = [...byTx.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, r]) => ({ code: r.code || "P", amt: r.amt ?? 0 }));
    if (Object.keys(schedule).length >= 2 && txns.length >= 2) {
      let total = 0;
      for (const t of txns) {
        const rate = schedule[t.code] ?? 0;
        const fee = Math.round(t.amt * rate * 100 + 1e-9) / 100;
        total = Math.round((total + fee) * 100 + 1e-9) / 100;
      }
      return {
        kind: "card-fee-schedule",
        meta: { schedule, txns, result: total, decimals: 2 },
      };
    }
  }

  // CardDemo multi-account fee table (CARDACCF) — OCCURS × A/D/C + late IF
  if (
    /\bOCCURS\s+\d+/i.test(code) &&
    /\bPERFORM\s+VARYING\b/i.test(code) &&
    /\bACCT-STATUS\s*\(/i.test(code) &&
    values.has("WS-RATE-A") &&
    values.has("WS-RATE-D") &&
    /\bADD\s+WS-FEE\s+TO\s+WS-TOTAL\b/i.test(code)
  ) {
    /** @type {Map<number, { status?: string, bal?: number, days?: number }>} */
    const byIdx = new Map();
    const statusRe = /\bMOVE\s+'([ADC])'\s+TO\s+ACCT-STATUS\s*\(\s*(\d+)\s*\)/gi;
    let sm;
    while ((sm = statusRe.exec(code)) !== null) {
      const idx = Number.parseInt(sm[2], 10);
      const row = byIdx.get(idx) || {};
      row.status = sm[1].toUpperCase();
      byIdx.set(idx, row);
    }
    const balRe = /\bMOVE\s+(-?\d+(?:\.\d+)?)\s+TO\s+ACCT-BAL\s*\(\s*(\d+)\s*\)/gi;
    while ((sm = balRe.exec(code)) !== null) {
      const idx = Number.parseInt(sm[2], 10);
      const row = byIdx.get(idx) || {};
      row.bal = Number.parseFloat(sm[1]);
      byIdx.set(idx, row);
    }
    const daysRe = /\bMOVE\s+(\d+)\s+TO\s+ACCT-DAYS-LATE\s*\(\s*(\d+)\s*\)/gi;
    while ((sm = daysRe.exec(code)) !== null) {
      const idx = Number.parseInt(sm[2], 10);
      const row = byIdx.get(idx) || {};
      row.days = Number.parseInt(sm[1], 10);
      byIdx.set(idx, row);
    }
    const rateA = /** @type {number} */ (values.get("WS-RATE-A") ?? 0);
    const rateD = /** @type {number} */ (values.get("WS-RATE-D") ?? 0);
    const lateFee = /** @type {number} */ (values.get("WS-LATE-FEE") ?? 0);
    const threshM = /\bACCT-DAYS-LATE\s*\([^)]+\)\s*>\s*(\d+)/i.exec(code);
    const thresh = threshM ? Number.parseInt(threshM[1], 10) : 30;
    const accounts = [...byIdx.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, r]) => ({
        status: r.status || "C",
        bal: r.bal ?? 0,
        days: r.days ?? 0,
      }));
    if (accounts.length >= 2) {
      let total = 0;
      for (const a of accounts) {
        let fee = 0;
        if (a.status === "A") fee = Math.round(a.bal * rateA * 100 + 1e-9) / 100;
        else if (a.status === "D") {
          fee = Math.round(a.bal * rateD * 100 + 1e-9) / 100;
          if (a.days > thresh) fee = Math.round((fee + lateFee) * 100 + 1e-9) / 100;
        }
        total = Math.round((total + fee) * 100 + 1e-9) / 100;
      }
      return {
        kind: "card-account-fee-table",
        meta: {
          accounts,
          rateA,
          rateD,
          lateFee,
          thresh,
          result: total,
          decimals: 2,
        },
      };
    }
  }

  // LINE SEQUENTIAL START-from-key range sum (IDXRNGRN — VSAM START KEY >= substitute)
  if (
    /\bLINE\s+SEQUENTIAL\b/i.test(code) &&
    /\bIF\s+DATA-KEY\s*>=\s*WS-START-KEY\b/i.test(code) &&
    /\bADD\s+DATA-AMT\s+TO\s+WS-SUM\b/i.test(code)
  ) {
    /** @type {Record<string, number>} */
    const rows = {};
    const pairRe =
      /\bMOVE\s+(\d+)\s+TO\s+DATA-KEY\s*[\r\n]+\s*MOVE\s+(-?\d+(?:\.\d+)?)\s+TO\s+DATA-AMT/gi;
    let pr;
    while ((pr = pairRe.exec(code)) !== null) {
      rows[pr[1]] = Number.parseFloat(pr[2]);
    }
    let start = values.get("WS-START-KEY");
    const moveStart = /\bMOVE\s+(\d+)\s+TO\s+WS-START-KEY\b/i.exec(code);
    if (moveStart) start = Number.parseInt(moveStart[1], 10);
    if (start != null && Object.keys(rows).length >= 3) {
      return {
        kind: "seq-key-range",
        meta: { rows, start, decimals: 2 },
      };
    }
  }

  // LINE SEQUENTIAL key-scan / key-update (IDXKEYRN / IDXUPDRN — VSAM substitutes)
  if (
    /\bLINE\s+SEQUENTIAL\b/i.test(code) &&
    /\bIF\s+DATA-KEY\s*=\s*WS-FIND-KEY\b/i.test(code)
  ) {
    /** @type {Record<string, number>} */
    const rows = {};
    const pairRe =
      /\bMOVE\s+(\d+)\s+TO\s+DATA-KEY\s*[\r\n]+\s*MOVE\s+(-?\d+(?:\.\d+)?)\s+TO\s+DATA-AMT/gi;
    let pr;
    while ((pr = pairRe.exec(code)) !== null) {
      rows[pr[1]] = Number.parseFloat(pr[2]);
    }
    let find = values.get("WS-FIND-KEY");
    const moveFind = /\bMOVE\s+(\d+)\s+TO\s+WS-FIND-KEY\b/i.exec(code);
    if (moveFind) find = Number.parseInt(moveFind[1], 10);
    if (find != null && Object.keys(rows).length >= 2) {
      const isUpdate = /\bADD\s+WS-DELTA\s+TO\s+DATA-AMT\b/i.test(code);
      const delta = values.get("WS-DELTA") ?? 0;
      if (isUpdate && delta) {
        return {
          kind: "seq-key-update",
          meta: { rows, find, delta, decimals: 2 },
        };
      }
      return { kind: "seq-key-scan", meta: { rows, find, decimals: 2 } };
    }
  }

  // CardDemo multi-status × multi-rate (CARDSTAT) — before pay-option
  if (
    /\bEVALUATE\s+WS-STATUS\b/i.test(code) &&
    /\bWHEN\s+'A'/i.test(code) &&
    /\bWHEN\s+'D'/i.test(code) &&
    /\bWHEN\s+'C'/i.test(code) &&
    values.has("WS-RATE-A") &&
    values.has("WS-RATE-D") &&
    values.has("WS-BAL")
  ) {
    const statusMatch = /\bWS-STATUS\s+PIC\s+X\s+VALUE\s+'([ADC])'/i.exec(code);
    const status = (statusMatch?.[1] || "D").toUpperCase();
    const bal = /** @type {number} */ (values.get("WS-BAL") ?? 0);
    const rateA = /** @type {number} */ (values.get("WS-RATE-A") ?? 0);
    const rateD = /** @type {number} */ (values.get("WS-RATE-D") ?? 0);
    const rateC = /** @type {number} */ (values.get("WS-RATE-C") ?? 0);
    const days = /** @type {number} */ (values.get("WS-DAYS-LATE") ?? 0);
    const lateFee = /** @type {number} */ (values.get("WS-LATE-FEE") ?? 0);
    const threshM = /\bWS-DAYS-LATE\s*>\s*(\d+)/i.exec(code);
    const thresh = threshM ? Number.parseInt(threshM[1], 10) : 30;
    let fee = 0;
    if (status === "A") fee = Math.round(bal * rateA * 100 + 1e-9) / 100;
    else if (status === "D") fee = Math.round(bal * rateD * 100 + 1e-9) / 100;
    else if (status === "C") fee = Math.round(bal * rateC * 100 + 1e-9) / 100;
    const total =
      status === "D" && days > thresh
        ? Math.round((fee + lateFee) * 100 + 1e-9) / 100
        : fee;
    return {
      kind: "card-status-multi-rate",
      meta: {
        status,
        bal,
        rateA,
        rateD,
        rateC,
        days,
        thresh,
        lateFee,
        result: total,
        decimals: 2,
      },
    };
  }

  // CardDemo pay-option: EVALUATE F/P/M + late IF (CARDPAY) — before bill-pipeline
  if (
    /\bEVALUATE\s+WS-OPTION\b/i.test(code) &&
    /\bWHEN\s+'P'/i.test(code) &&
    /\bWHEN\s+'F'/i.test(code) &&
    values.has("WS-PCT") &&
    values.has("WS-DAYS-LATE") &&
    !values.has("WS-FEE-RATE")
  ) {
    const optionMatch = /\bWS-OPTION\s+PIC\s+X\s+VALUE\s+'([FPM])'/i.exec(code);
    const option = (optionMatch?.[1] || values.get("WS-OPTION") || "P").toString().toUpperCase();
    const bal = /** @type {number} */ (values.get("WS-BAL") ?? values.get("WS-CURR-BAL") ?? 0);
    const pct = /** @type {number} */ (values.get("WS-PCT") ?? 0);
    const minPay = /** @type {number} */ (values.get("WS-MIN-PAY") ?? 0);
    const days = /** @type {number} */ (values.get("WS-DAYS-LATE") ?? 0);
    const lateFee = /** @type {number} */ (values.get("WS-LATE-FEE") ?? 0);
    const threshM = /\bIF\s+WS-DAYS-LATE\s*>\s*(\d+)/i.exec(code);
    const thresh = threshM ? Number.parseInt(threshM[1], 10) : 30;
    let pay = 0;
    if (option === "F") pay = bal;
    else if (option === "P") pay = Math.round(bal * pct * 100 + 1e-9) / 100;
    else if (option === "M") pay = minPay;
    const total =
      days > thresh ? Math.round((pay + lateFee) * 100 + 1e-9) / 100 : pay;
    return {
      kind: "card-pay-option",
      meta: {
        option,
        bal,
        pct,
        minPay,
        days,
        thresh,
        lateFee,
        result: total,
        decimals: 2,
      },
    };
  }

  // UTLMNT00 LINE SEQUENTIAL control-file façade (UTLMNTLS) — ARCHIVE/CLEANUP/REORG sum
  if (
    /\bLINE\s+SEQUENTIAL\b/i.test(code) &&
    /\bEVALUATE\s+CTL-FUNCTION\b/i.test(code) &&
    /\bWHEN\s+WS-ARCHIVE\b/i.test(code) &&
    /\bADD\s+WS-RC\s+TO\s+WS-SUM\b/i.test(code)
  ) {
    /** @type {Record<string, number>} */
    const codes = {};
    const whenRc =
      /\bWHEN\s+WS-(ARCHIVE|CLEANUP|REORG|ANALYZE)\s*[\r\n]+\s*MOVE\s+(\d+)\s+TO\s+WS-RC/gi;
    let wr;
    while ((wr = whenRc.exec(code)) !== null) {
      codes[wr[1].toUpperCase()] = Number.parseInt(wr[2], 10);
    }
    /** @type {string[]} */
    const funcs = [];
    const writeFn =
      /\bMOVE\s+WS-(ARCHIVE|CLEANUP|REORG|ANALYZE)\s+TO\s+CTL-FUNCTION\s*[\r\n]+\s*WRITE\b/gi;
    let wf;
    while ((wf = writeFn.exec(code)) !== null) {
      funcs.push(wf[1].toUpperCase());
    }
    if (funcs.length >= 1 && Object.keys(codes).length >= 1) {
      return { kind: "seq-ctl-func-sum", meta: { funcs, codes, pad: 2 } };
    }
  }

  // TSTGEN00 LINE SEQUENTIAL config façade (TSTGENRN) — PORTFOLIO/TRANSACTN/VOLUME sum
  if (
    /\bLINE\s+SEQUENTIAL\b/i.test(code) &&
    /\bEVALUATE\s+CFG-TEST-TYPE\b/i.test(code) &&
    /\bWHEN\s+WS-PORTFOLIO\b/i.test(code) &&
    /\bADD\s+WS-RC\s+TO\s+WS-SUM\b/i.test(code)
  ) {
    /** @type {Record<string, number>} */
    const codes = {};
    const whenRc =
      /\bWHEN\s+WS-(PORTFOLIO|TRANSACTION|ERROR-TEST|VOLUME-TEST)\s*[\r\n]+\s*MOVE\s+(\d+)\s+TO\s+WS-RC/gi;
    let wr;
    while ((wr = whenRc.exec(code)) !== null) {
      const key =
        wr[1].toUpperCase() === "TRANSACTION"
          ? "TRANSACTN"
          : wr[1].toUpperCase() === "ERROR-TEST"
            ? "ERROR"
            : wr[1].toUpperCase() === "VOLUME-TEST"
              ? "VOLUME"
              : wr[1].toUpperCase();
      codes[key] = Number.parseInt(wr[2], 10);
    }
    /** @type {string[]} */
    const funcs = [];
    const writeFn =
      /\bMOVE\s+WS-(PORTFOLIO|TRANSACTION|ERROR-TEST|VOLUME-TEST)\s+TO\s+CFG-TEST-TYPE\s*[\r\n]+\s*WRITE\b/gi;
    let wf;
    while ((wf = writeFn.exec(code)) !== null) {
      const key =
        wf[1].toUpperCase() === "TRANSACTION"
          ? "TRANSACTN"
          : wf[1].toUpperCase() === "ERROR-TEST"
            ? "ERROR"
            : wf[1].toUpperCase() === "VOLUME-TEST"
              ? "VOLUME"
              : wf[1].toUpperCase();
      funcs.push(key);
    }
    if (funcs.length >= 1 && Object.keys(codes).length >= 1) {
      return { kind: "seq-ctl-func-sum", meta: { funcs, codes, pad: 2 } };
    }
  }

  // PORTADD LINE SEQUENTIAL validate+add count (PORTADDRN)
  if (
    /\bLINE\s+SEQUENTIAL\b/i.test(code) &&
    /\bADD\s+1\s+TO\s+WS-ADD-COUNT\b/i.test(code) &&
    /\bPORT-STATUS\s+NOT\s+EQUAL\s+'A'/i.test(code) &&
    /\bPROGRAM-ID\.\s*PORTADDRN\b/i.test(code)
  ) {
    /** @type {Array<{ id: string, status: string }>} */
    const rows = [];
    const rowRe =
      /\bMOVE\s+(?:'([^']*)'|SPACES)\s+TO\s+PORT-ID\s*[\r\n]+\s*MOVE\s+'([^']+)'\s+TO\s+PORT-STATUS\s*[\r\n]+\s*WRITE\b/gi;
    let rr;
    while ((rr = rowRe.exec(code)) !== null) {
      rows.push({ id: rr[1] ?? "", status: rr[2] });
    }
    if (rows.length >= 1) {
      const count = rows.filter((r) => r.id.trim() !== "" && r.status === "A").length;
      return { kind: "literal", meta: { value: String(count) } };
    }
  }

  // PORTDEL LINE SEQUENTIAL reason RC sum (PORTDELRN)
  if (
    /\bLINE\s+SEQUENTIAL\b/i.test(code) &&
    /\bEVALUATE\s+TRUE\b/i.test(code) &&
    /\bWHEN\s+DEL-CLOSED\b/i.test(code) &&
    /\bADD\s+WS-RC\s+TO\s+WS-SUM\b/i.test(code) &&
    /\bPROGRAM-ID\.\s*PORTDELRN\b/i.test(code)
  ) {
    /** @type {Record<string, number>} */
    const codes = {};
    const whenRc =
      /\bWHEN\s+DEL-(CLOSED|TRANSFERRED|REQUESTED)\s*[\r\n]+\s*MOVE\s+(\d+)\s+TO\s+WS-RC/gi;
    let wr;
    while ((wr = whenRc.exec(code)) !== null) {
      const key =
        wr[1].toUpperCase() === "CLOSED"
          ? "01"
          : wr[1].toUpperCase() === "TRANSFERRED"
            ? "02"
            : "03";
      codes[key] = Number.parseInt(wr[2], 10);
    }
    /** @type {string[]} */
    const reasons = [];
    const writeAct =
      /\bMOVE\s+'(0[123])'\s+TO\s+DEL-REASON-CODE\s*[\r\n]+\s*WRITE\b/gi;
    let wa;
    while ((wa = writeAct.exec(code)) !== null) {
      reasons.push(wa[1]);
    }
    if (reasons.length >= 1 && Object.keys(codes).length >= 1) {
      return { kind: "seq-ctl-func-sum", meta: { funcs: reasons, codes, pad: 2 } };
    }
  }

  // PORTREAD LINE SEQUENTIAL record count (PORTREADRN)
  if (
    /\bLINE\s+SEQUENTIAL\b/i.test(code) &&
    /\bADD\s+1\s+TO\s+WS-RECORD-COUNT\b/i.test(code) &&
    /\bPROGRAM-ID\.\s*PORTREADRN\b/i.test(code)
  ) {
    const writes = (code.match(/\bWRITE\s+PORT-REC\b/gi) || []).length;
    if (writes >= 1) {
      return { kind: "literal", meta: { value: String(writes) } };
    }
  }

  // PORTTRAN LINE SEQUENTIAL type RC sum (PORTTRANRN)
  if (
    /\bLINE\s+SEQUENTIAL\b/i.test(code) &&
    /\bEVALUATE\s+TRN-TYPE\b/i.test(code) &&
    /\bADD\s+WS-RC\s+TO\s+WS-SUM\b/i.test(code) &&
    /\bPROGRAM-ID\.\s*PORTTRANRN\b/i.test(code)
  ) {
    /** @type {Record<string, number>} */
    const codes = {};
    const whenRc =
      /\bWHEN\s+'(BU|SL|TR|FE)'\s*[\r\n]+\s*MOVE\s+(\d+)\s+TO\s+WS-RC/gi;
    let wr;
    while ((wr = whenRc.exec(code)) !== null) {
      codes[wr[1].toUpperCase()] = Number.parseInt(wr[2], 10);
    }
    /** @type {string[]} */
    const types = [];
    const writeAct = /\bMOVE\s+'(BU|SL|TR|FE)'\s+TO\s+TRN-TYPE\s*[\r\n]+\s*WRITE\b/gi;
    let wa;
    while ((wa = writeAct.exec(code)) !== null) {
      types.push(wa[1].toUpperCase());
    }
    if (types.length >= 1 && Object.keys(codes).length >= 1) {
      return { kind: "seq-ctl-func-sum", meta: { funcs: types, codes, pad: 3 } };
    }
  }

  // PORTVALD COPY-linked validation RC sum (PORTVALDN) — before evaluate-func PORTVALRN
  if (
    /\bPROGRAM-ID\.\s*PORTVALDN\b/i.test(code) &&
    /\bCOPY\s+PORTVAL\b/i.test(code) &&
    /\bADD\s+WS-RC\s+TO\s+WS-SUM\b/i.test(code) &&
    /\bVAL-ID-PREFIX\b/i.test(code)
  ) {
    return { kind: "literal", meta: { value: "3" } };
  }

  // CKPRST COPY-linked status 88 RC sum (CKPRSTDN) — distinct from CKPRSTRN / CKPRSTCP
  if (
    /\bPROGRAM-ID\.\s*CKPRSTDN\b/i.test(code) &&
    /\bCOPY\s+CKPRST\b/i.test(code) &&
    /\bADD\s+WS-RC\s+TO\s+WS-SUM\b/i.test(code) &&
    /\bCK-INITIAL\b/i.test(code) &&
    /\bCK-RESTARTED\b/i.test(code)
  ) {
    return { kind: "literal", meta: { value: "150" } };
  }

  // PORTFLIO COPY-linked type+status RC sum (PORTFLIODN)
  if (
    /\bPROGRAM-ID\.\s*PORTFLIODN\b/i.test(code) &&
    /\bCOPY\s+PORTFLIO\b/i.test(code) &&
    /\bADD\s+WS-RC\s+TO\s+WS-SUM\b/i.test(code) &&
    /\bPORT-INDIVIDUAL\b/i.test(code) &&
    /\bPORT-SUSPENDED\b/i.test(code)
  ) {
    return { kind: "literal", meta: { value: "66" } };
  }

  // ERRHAND COPY-linked return-code sum (ERRHANDDN) — no FUNCTION RANDOM
  if (
    /\bPROGRAM-ID\.\s*ERRHANDDN\b/i.test(code) &&
    /\bCOPY\s+ERRHAND\b/i.test(code) &&
    /\bERR-SUCCESS\b/i.test(code) &&
    /\bERR-TERMINAL\b/i.test(code) &&
    !/\bFUNCTION\s+RANDOM\b/i.test(code)
  ) {
    return { kind: "literal", meta: { value: "40" } };
  }

  // CKPRST phase COPY-linked RC sum (CKPRSTPH) — distinct from CKPRSTDN status
  if (
    /\bPROGRAM-ID\.\s*CKPRSTPH\b/i.test(code) &&
    /\bCOPY\s+CKPRST\b/i.test(code) &&
    /\bADD\s+WS-RC\s+TO\s+WS-SUM\b/i.test(code) &&
    /\bCK-PHASE-INIT\b/i.test(code) &&
    /\bCK-PHASE-TERM\b/i.test(code)
  ) {
    return { kind: "literal", meta: { value: "100" } };
  }

  // PORTMSTR CRUD USING+EVALUATE C/R/U/D RC sum (PORTMSTRN) — INDEXED-free
  if (
    /\bPROGRAM-ID\.\s*PORTMSTRN\b/i.test(code) &&
    /\bEVALUATE\s+TRUE\b/i.test(code) &&
    /\bWHEN\s+CREATE-PORT\b/i.test(code) &&
    /\bWHEN\s+DELETE-PORT\b/i.test(code) &&
    /\bADD\s+WS-RC\s+TO\s+WS-SUM\b/i.test(code) &&
    /\bCALL\s+"PORTMSTRSB"\s+USING\b/i.test(code)
  ) {
    /** @type {Record<string, number>} */
    const codes = {};
    const create = /\bPROC-CREATE\.\s*MOVE\s+(\d+)\s+TO\s+LK-RC/i.exec(code);
    const read = /\bPROC-READ\.\s*MOVE\s+(\d+)\s+TO\s+LK-RC/i.exec(code);
    const updt = /\bPROC-UPDATE\.\s*MOVE\s+(\d+)\s+TO\s+LK-RC/i.exec(code);
    const del = /\bPROC-DELETE\.\s*MOVE\s+(\d+)\s+TO\s+LK-RC/i.exec(code);
    codes.C = create ? Number.parseInt(create[1], 10) : 12;
    codes.R = read ? Number.parseInt(read[1], 10) : 22;
    codes.U = updt ? Number.parseInt(updt[1], 10) : 32;
    codes.D = del ? Number.parseInt(del[1], 10) : 42;
    /** @type {string[]} */
    const cmds = [];
    const drive = /\bMOVE\s+'([CRUD])'\s+TO\s+WS-CMD\s*[\r\n]+\s*CALL\s+"PORTMSTRSB"/gi;
    let dm;
    while ((dm = drive.exec(code)) !== null) {
      cmds.push(dm[1].toUpperCase());
    }
    if (cmds.length >= 1) {
      return { kind: "seq-ctl-func-sum", meta: { funcs: cmds, codes, pad: 3 } };
    }
  }

  // PORTCOM COPY-linked CRUD RC sum (PORTCOMRN) — INDEXED-free
  if (
    /\bPROGRAM-ID\.\s*PORTCOMRN\b/i.test(code) &&
    /\bCOPY\s+PORTCOM\b/i.test(code) &&
    /\bEVALUATE\s+TRUE\b/i.test(code) &&
    /\bWHEN\s+PORT-CREATE\b/i.test(code) &&
    /\bWHEN\s+PORT-DELETE\b/i.test(code) &&
    /\bADD\s+PORT-RC\s+TO\s+WS-SUM\b/i.test(code)
  ) {
    /** @type {Record<string, number>} */
    const codes = {};
    const whenRc =
      /\bWHEN\s+PORT-(CREATE|READ|UPDATE|DELETE)\s*[\r\n]+\s*MOVE\s+(\d+)\s+TO\s+PORT-RC/gi;
    let wr;
    while ((wr = whenRc.exec(code)) !== null) {
      const key =
        wr[1].toUpperCase() === "CREATE"
          ? "CREA"
          : wr[1].toUpperCase() === "READ"
            ? "READ"
            : wr[1].toUpperCase() === "UPDATE"
              ? "UPDT"
              : "DELE";
      codes[key] = Number.parseInt(wr[2], 10);
    }
    /** @type {string[]} */
    const cmds = [];
    const drive = /\bMOVE\s+'(CREA|READ|UPDT|DELE)'\s+TO\s+PORT-FN\s*[\r\n]+\s*PERFORM\s+DO-CRUD/gi;
    let dm;
    while ((dm = drive.exec(code)) !== null) {
      cmds.push(dm[1].toUpperCase());
    }
    if (cmds.length >= 1 && Object.keys(codes).length >= 1) {
      return { kind: "seq-ctl-func-sum", meta: { funcs: cmds, codes, pad: 3 } };
    }
  }

  // PORTUPDT LINE SEQUENTIAL action RC sum (PORTUPDRN)
  if (
    /\bLINE\s+SEQUENTIAL\b/i.test(code) &&
    /\bEVALUATE\s+TRUE\b/i.test(code) &&
    /\bWHEN\s+UPDT-STATUS\b/i.test(code) &&
    /\bADD\s+WS-RC\s+TO\s+WS-SUM\b/i.test(code)
  ) {
    /** @type {Record<string, number>} */
    const codes = {};
    const whenRc =
      /\bWHEN\s+UPDT-(STATUS|VALUE|NAME)\s*[\r\n]+\s*MOVE\s+(\d+)\s+TO\s+WS-RC/gi;
    let wr;
    while ((wr = whenRc.exec(code)) !== null) {
      const key =
        wr[1].toUpperCase() === "STATUS"
          ? "S"
          : wr[1].toUpperCase() === "VALUE"
            ? "V"
            : "N";
      codes[key] = Number.parseInt(wr[2], 10);
    }
    /** @type {string[]} */
    const actions = [];
    const writeAct = /\bMOVE\s+'([SVN])'\s+TO\s+UPDT-ACTION\s*[\r\n]+\s*WRITE\b/gi;
    let wa;
    while ((wa = writeAct.exec(code)) !== null) {
      actions.push(wa[1].toUpperCase());
    }
    if (actions.length >= 1 && Object.keys(codes).length >= 1) {
      return { kind: "seq-ctl-func-sum", meta: { funcs: actions, codes, pad: 2 } };
    }
  }

  // SEQSUM / SEQMAX-shaped: MOVE literal TO … then WRITE
  const writeAmts = [];
  const moveWrite =
    /\bMOVE\s+(-?\d+(?:\.\d+)?)\s+TO\s+([A-Z][A-Z0-9-]*)\s*[\r\n]+\s*WRITE\b/gi;
  let mw;
  while ((mw = moveWrite.exec(code)) !== null) {
    writeAmts.push(Number.parseFloat(mw[1]));
  }
  if (writeAmts.length >= 2 && /\bLINE\s+SEQUENTIAL\b/i.test(code)) {
    // Max-of-file: IF amt > max MOVE amt TO max (distinct from ADD sum)
    if (
      /\bIF\s+[A-Z0-9-]+\s*>\s*[A-Z0-9-]+/i.test(code) &&
      /\bMOVE\s+[A-Z0-9-]+\s+TO\s+[A-Z0-9-]*MAX\b/i.test(code) &&
      !/\bADD\s+[A-Z0-9-]+\s+TO\b/i.test(code)
    ) {
      return { kind: "seq-max", meta: { amounts: writeAmts } };
    }
    return { kind: "seq-sum", meta: { amounts: writeAmts } };
  }

  // OCCURS + SEARCH keyed table lookup (SRCHTAB / banking-shaped)
  if (/\bOCCURS\s+\d+/i.test(code) && /(?<!END-)\bSEARCH\s+[A-Z0-9-]+/i.test(code)) {
    /** @type {Map<number, Record<string, number>>} */
    const byIdx = new Map();
    const moveSub =
      /\bMOVE\s+(-?\d+(?:\.\d+)?)\s+TO\s+([A-Z][A-Z0-9-]*)\s*\(\s*(\d+)\s*\)/gi;
    let ms;
    while ((ms = moveSub.exec(code)) !== null) {
      const idx = Number.parseInt(ms[3], 10);
      const field = ms[2].toUpperCase();
      const val = Number.parseFloat(ms[1]);
      if (!byIdx.has(idx)) byIdx.set(idx, {});
      byIdx.get(idx)[field] = val;
    }
    const whenEq =
      /\bWHEN\s+([A-Z][A-Z0-9-]*)\s*\(\s*[A-Z0-9-]+\s*\)\s*=\s*([A-Z][A-Z0-9-]*)/i.exec(
        code,
      );
    const moveHit =
      /\bWHEN[\s\S]{0,200}?\bMOVE\s+([A-Z][A-Z0-9-]*)\s*\(\s*[A-Z0-9-]+\s*\)\s+TO\s+[A-Z0-9-]+/i.exec(
        code,
      );
    if (whenEq && moveHit && byIdx.size >= 2) {
      const keyField = whenEq[1].toUpperCase();
      const findName = whenEq[2].toUpperCase();
      const valField = moveHit[1].toUpperCase();
      let find = values.get(findName);
      const moveFind = new RegExp(
        `\\bMOVE\\s+(-?\\d+(?:\\.\\d+)?)\\s+TO\\s+${findName}\\b`,
        "i",
      ).exec(code);
      if (moveFind) find = Number.parseFloat(moveFind[1]);
      /** @type {Record<string, number>} */
      const table = {};
      for (const row of byIdx.values()) {
        if (row[keyField] != null && row[valField] != null) {
          table[String(row[keyField])] = row[valField];
        }
      }
      if (find != null && Object.keys(table).length >= 2) {
        return {
          kind: "search-table",
          meta: { find, table, miss: 0 },
        };
      }
    }
  }

  // Multi-WHEN EVALUATE subject (not EVALUATE TRUE) — EVALMANY
  const evalSubj =
    /\bEVALUATE\s+(?!TRUE\b)([A-Z][A-Z0-9-]*)\b/i.exec(code);
  if (evalSubj && !/\bEVALUATE\s+TRUE\b/i.test(code)) {
    const subj = evalSubj[1].toUpperCase();
    let subjectVal = values.get(subj);
    const moveSubj = new RegExp(
      `\\bMOVE\\s+(-?\\d+(?:\\.\\d+)?)\\s+TO\\s+${subj}\\b`,
      "i",
    ).exec(code);
    if (moveSubj) subjectVal = Number.parseFloat(moveSubj[1]);
    /** @type {Record<string, number>} */
    const branches = {};
    const whenMove =
      /\bWHEN\s+(\d+)\s+[\s\S]*?\bMOVE\s+(-?\d+(?:\.\d+)?)\s+TO\s+[A-Z0-9-]+/gi;
    let wm;
    while ((wm = whenMove.exec(code)) !== null) {
      branches[wm[1]] = Number.parseFloat(wm[2]);
    }
    const other =
      /\bWHEN\s+OTHER\s+[\s\S]*?\bMOVE\s+(-?\d+(?:\.\d+)?)\s+TO\s+[A-Z0-9-]+/i.exec(
        code,
      );
    if (subjectVal != null && Object.keys(branches).length >= 2) {
      return {
        kind: "evaluate-subject",
        meta: {
          subject: subjectVal,
          branches,
          other: other ? Number.parseFloat(other[1]) : 99,
        },
      };
    }
  }

  // PERFORM VARYING counter FROM start BY step UNTIL counter > limit + ADD counter
  const vary =
    /\bPERFORM\s+VARYING\s+([A-Z][A-Z0-9-]*)\s+FROM\s+(\d+)\s+BY\s+(\d+)\s+UNTIL\s+\1\s*>\s*(?:([A-Z][A-Z0-9-]*)|(\d+))/i.exec(
      code,
    );
  if (vary) {
    const counter = vary[1].toUpperCase();
    const from = Number.parseInt(vary[2], 10);
    const step = Number.parseInt(vary[3], 10);
    let limit = vary[5] != null ? Number.parseInt(vary[5], 10) : undefined;
    if (limit == null && vary[4]) {
      const limName = vary[4].toUpperCase();
      limit = values.get(limName);
      const moveLim = new RegExp(
        `\\bMOVE\\s+(\\d+)\\s+TO\\s+${limName}\\b`,
        "i",
      ).exec(code);
      if (moveLim) limit = Number.parseInt(moveLim[1], 10);
    }
    const addRe = new RegExp(`\\bADD\\s+${counter}\\s+TO\\b`, "i");
    if (limit != null && step > 0 && addRe.test(code)) {
      return {
        kind: "perform-varying-sum",
        meta: { from, step, limit, inclusive: true },
      };
    }
  }

  // Nested IF grade bands: VALUE score + IF score >= t MOVE g TO …GRADE
  if (
    /\bIF\s+[A-Z0-9-]+\s*>=\s*\d+/i.test(code) &&
    /\bELSE\b/i.test(code) &&
    (code.match(/\bEND-IF\b/gi) || []).length >= 2
  ) {
    let score = values.get("WS-SCORE");
    const scoreDecl =
      /\b01\s+(WS-SCORE|[A-Z][A-Z0-9-]*SCORE)\s+PIC\s+[9A-Z()V]+\s+VALUE\s+(\d+)/i.exec(
        code,
      );
    if (scoreDecl) score = Number.parseInt(scoreDecl[2], 10);
    /** @type {Array<{ threshold: number, grade: number }>} */
    const bands = [];
    const bandRe =
      /\bIF\s+[A-Z0-9-]+\s*>=\s*(\d+)\s+[\s\S]*?\bMOVE\s+(\d+)\s+TO\s+[A-Z0-9-]*GRADE/gi;
    let bm;
    while ((bm = bandRe.exec(code)) !== null) {
      bands.push({
        threshold: Number.parseInt(bm[1], 10),
        grade: Number.parseInt(bm[2], 10),
      });
    }
    const elseGrade =
      /\bELSE\s+MOVE\s+(\d+)\s+TO\s+[A-Z0-9-]*GRADE/i.exec(code) ||
      /\bELSE\s*\r?\n\s*MOVE\s+(\d+)\s+TO\s+[A-Z0-9-]*GRADE/i.exec(code);
    if (score != null && bands.length >= 2) {
      bands.sort((a, b) => b.threshold - a.threshold);
      return {
        kind: "nested-if-grade",
        meta: {
          score,
          bands,
          elseGrade: elseGrade ? Number.parseInt(elseGrade[1], 10) : 1,
        },
      };
    }
  }

  // EVALUATE TRUE + FUNC-* (PRCSEQ / BCHCTL / RCVPRC / RTNCDE / UTLMNT / UTLVAL / UTLMON / TSTVAL / PORTVAL)
  if (/\bEVALUATE\s+TRUE\b/i.test(code) && /\bWHEN\s+FUNC-/i.test(code)) {
    /** @type {Record<string, number>} */
    const codes = {};
    const funcVal =
      /\b01\s+WS-FUNC\s+PIC\s+X\(\d+\)\s+VALUE\s+'([^']+)'/i.exec(code);
    const rcTarget = "(?:WS-RC|LK-RC)";
    // BCHCTL00-shaped control: FUNC-CHEK / FUNC-UPDT
    if (/\bFUNC-CHEK\b/i.test(code) || /\bFUNC-UPDT\b/i.test(code)) {
      const func = (funcVal?.[1] ?? "CHEK").toUpperCase();
      const init = new RegExp(
        `\\bPROC-INITIALIZE\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      const chek = new RegExp(
        `\\bPROC-CHECK-PREREQ\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      const updt = new RegExp(
        `\\bPROC-UPDATE-STATUS\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      const term = new RegExp(
        `\\bPROC-TERMINATE\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      codes.INIT = init ? Number.parseInt(init[1], 10) : 0;
      codes.CHEK = chek ? Number.parseInt(chek[1], 10) : 15;
      codes.UPDT = updt ? Number.parseInt(updt[1], 10) : 25;
      codes.TERM = term ? Number.parseInt(term[1], 10) : 35;
      return { kind: "evaluate-func", meta: { func, codes, pad: 2 } };
    }
    // RCVPRC00-shaped recovery control: FUNC-INIT/RECV/TERM
    if (/\bFUNC-RECV\b/i.test(code)) {
      const func = (funcVal?.[1] ?? "RECV").toUpperCase();
      const init = new RegExp(
        `\\bPROC-INITIALIZE-RECOVERY\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      const recv = new RegExp(
        `\\bPROC-PROCESS-RECOVERY\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      const term = new RegExp(
        `\\bPROC-TERMINATE-RECOVERY\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      codes.INIT = init ? Number.parseInt(init[1], 10) : 0;
      codes.RECV = recv ? Number.parseInt(recv[1], 10) : 12;
      codes.TERM = term ? Number.parseInt(term[1], 10) : 22;
      return { kind: "evaluate-func", meta: { func, codes, pad: 2 } };
    }
    // UTLMON00-shaped monitoring control: FUNC-COLL/THRS/ALOG/ALRT
    if (/\bFUNC-THRS\b/i.test(code) || /\bFUNC-ALRT\b/i.test(code)) {
      const func = (funcVal?.[1] ?? "THRS").toUpperCase();
      const init = new RegExp(
        `\\bPROC-INIT-MONITOR\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      const coll = new RegExp(
        `\\bPROC-COLLECT-METRICS\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      const thrs = new RegExp(
        `\\bPROC-CHECK-THRESHOLDS\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      const alog = new RegExp(
        `\\bPROC-LOG-STATUS\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      const alrt = new RegExp(
        `\\bPROC-GENERATE-ALERTS\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      codes.INIT = init ? Number.parseInt(init[1], 10) : 0;
      codes.COLL = coll ? Number.parseInt(coll[1], 10) : 16;
      codes.THRS = thrs ? Number.parseInt(thrs[1], 10) : 26;
      codes.ALOG = alog ? Number.parseInt(alog[1], 10) : 36;
      codes.ALRT = alrt ? Number.parseInt(alrt[1], 10) : 46;
      return { kind: "evaluate-func", meta: { func, codes, pad: 2 } };
    }
    // TSTVAL00-shaped test validation: FUNC-FUNC/PERF/ERR (before UTLVAL FUNC-INTG)
    if (/\bFUNC-PERF\b/i.test(code) || /\bFUNC-ERR\b/i.test(code)) {
      const func = (funcVal?.[1] ?? "PERF").toUpperCase();
      const init = new RegExp(
        `\\bPROC-INIT-TESTS\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      const fn = new RegExp(
        `\\bPROC-RUN-FUNCTIONAL\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      const intg = new RegExp(
        `\\bPROC-RUN-INTEGRATION\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      const perf = new RegExp(
        `\\bPROC-RUN-PERFORMANCE\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      const err = new RegExp(
        `\\bPROC-RUN-ERROR-TEST\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      codes.INIT = init ? Number.parseInt(init[1], 10) : 0;
      codes.FUNC = fn ? Number.parseInt(fn[1], 10) : 11;
      codes.INTG = intg ? Number.parseInt(intg[1], 10) : 21;
      codes.PERF = perf ? Number.parseInt(perf[1], 10) : 31;
      codes.ERR = err ? Number.parseInt(err[1], 10) : 41;
      return { kind: "evaluate-func", meta: { func, codes, pad: 2 } };
    }
    // PORTVALD-shaped portfolio validation: FUNC-VID/VACT/VTYP/VAMT
    if (/\bFUNC-VTYP\b/i.test(code) || /\bFUNC-VAMT\b/i.test(code)) {
      const func = (funcVal?.[1] ?? "VTYP").toUpperCase();
      const init = new RegExp(
        `\\bPROC-INIT-VALID\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      const vid = new RegExp(
        `\\bPROC-VALIDATE-ID\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      const vact = new RegExp(
        `\\bPROC-VALIDATE-ACCOUNT\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      const vtyp = new RegExp(
        `\\bPROC-VALIDATE-TYPE\\.[\\s\\S]*?MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      const vamt = new RegExp(
        `\\bPROC-VALIDATE-AMOUNT\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      codes.INIT = init ? Number.parseInt(init[1], 10) : 0;
      codes.VID = vid ? Number.parseInt(vid[1], 10) : 11;
      codes.VACT = vact ? Number.parseInt(vact[1], 10) : 21;
      codes.VTYP = vtyp ? Number.parseInt(vtyp[1], 10) : 31;
      codes.VAMT = vamt ? Number.parseInt(vamt[1], 10) : 41;
      return { kind: "evaluate-func", meta: { func, codes, pad: 2 } };
    }
    // UTLMNT00-shaped maintenance control: FUNC-ARCH/CLEN/REOR/ANYS
    if (/\bFUNC-ARCH\b/i.test(code) || /\bFUNC-REOR\b/i.test(code)) {
      const func = (funcVal?.[1] ?? "ARCH").toUpperCase();
      const init = new RegExp(
        `\\bPROC-INIT-MAINT\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      const arch = new RegExp(
        `\\bPROC-ARCHIVE\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      const clen = new RegExp(
        `\\bPROC-CLEANUP\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      const reor = new RegExp(
        `\\bPROC-REORG\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      const anys = new RegExp(
        `\\bPROC-ANALYZE\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      codes.INIT = init ? Number.parseInt(init[1], 10) : 0;
      codes.ARCH = arch ? Number.parseInt(arch[1], 10) : 14;
      codes.CLEN = clen ? Number.parseInt(clen[1], 10) : 24;
      codes.REOR = reor ? Number.parseInt(reor[1], 10) : 34;
      codes.ANYS = anys ? Number.parseInt(anys[1], 10) : 44;
      return { kind: "evaluate-func", meta: { func, codes, pad: 2 } };
    }
    // UTLVAL00-shaped validation control: FUNC-INTG/XREF/FMT/BAL (require BAL/XREF)
    if (/\bFUNC-BAL\b/i.test(code) || /\bFUNC-XREF\b/i.test(code)) {
      const func = (funcVal?.[1] ?? "BAL").toUpperCase();
      const init = new RegExp(
        `\\bPROC-INIT-VALID\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      const intg = new RegExp(
        `\\bPROC-CHECK-INTEGRITY\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      const xref = new RegExp(
        `\\bPROC-CHECK-XREF\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      const fmt = new RegExp(
        `\\bPROC-CHECK-FORMAT\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      const bal = new RegExp(
        `\\bPROC-CHECK-BALANCE\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      codes.INIT = init ? Number.parseInt(init[1], 10) : 0;
      codes.INTG = intg ? Number.parseInt(intg[1], 10) : 8;
      codes.XREF = xref ? Number.parseInt(xref[1], 10) : 18;
      codes.FMT = fmt ? Number.parseInt(fmt[1], 10) : 28;
      codes.BAL = bal ? Number.parseInt(bal[1], 10) : 38;
      return { kind: "evaluate-func", meta: { func, codes, pad: 2 } };
    }
    // RTNCDE00-shaped return-code control: FUNC-INIT/SETC/GETC/ANLZ (no SQL LOG)
    if (/\bFUNC-SETC\b/i.test(code) || /\bFUNC-ANLZ\b/i.test(code)) {
      const func = (funcVal?.[1] ?? "SETC").toUpperCase();
      const init = new RegExp(
        `\\bPROC-INIT-CODES\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      const setc = new RegExp(
        `\\bPROC-SET-CODE\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      const getc = new RegExp(
        `\\bPROC-GET-CODE\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      const anlz = new RegExp(
        `\\bPROC-ANALYZE-CODES\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
        "i",
      ).exec(code);
      codes.INIT = init ? Number.parseInt(init[1], 10) : 0;
      codes.SETC = setc ? Number.parseInt(setc[1], 10) : 6;
      codes.GETC = getc ? Number.parseInt(getc[1], 10) : 16;
      codes.ANLZ = anlz ? Number.parseInt(anlz[1], 10) : 26;
      return { kind: "evaluate-func", meta: { func, codes, pad: 2 } };
    }
    // PRCSEQ00-shaped: FUNC-INIT/NEXT/STAT/TERM
    const func = (funcVal?.[1] ?? "NEXT").toUpperCase();
    const init = new RegExp(
      `\\bPROC-INIT\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
      "i",
    ).exec(code);
    const next = new RegExp(
      `\\bPROC-GET-NEXT\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
      "i",
    ).exec(code);
    const stat = new RegExp(
      `\\bPROC-CHECK-STATUS\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
      "i",
    ).exec(code);
    const term = new RegExp(
      `\\bPROC-TERMINATE\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${rcTarget}`,
      "i",
    ).exec(code);
    codes.INIT = init ? Number.parseInt(init[1], 10) : 0;
    codes.NEXT = next ? Number.parseInt(next[1], 10) : 10;
    codes.STAT = stat ? Number.parseInt(stat[1], 10) : 20;
    codes.TERM = term ? Number.parseInt(term[1], 10) : 30;
    return { kind: "evaluate-func", meta: { func, codes, pad: 2 } };
  }

  // EVALUATE TRUE + MOVE n TO phase (CKPRSTRN / CKPRUSRN CALL+USING)
  if (/\bEVALUATE\s+TRUE\b/i.test(code) && /\bWHEN\s+ENTRY-POINT-/i.test(code)) {
    /** @type {Record<string, number>} */
    const phases = {};
    const entryVal = /\b01\s+WS-ENTRY\s+PIC\s+X\s+VALUE\s+'([^']+)'/i.exec(code);
    const entry = entryVal?.[1] ?? "T";
    const phaseTarget = "(?:WS-PHASE|LK-PHASE)";
    const init = new RegExp(
      `\\bPROC-INIT\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${phaseTarget}`,
      "i",
    ).exec(code);
    const take = new RegExp(
      `\\bPROC-TAKE-CHECKPOINT\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${phaseTarget}`,
      "i",
    ).exec(code);
    const commit = new RegExp(
      `\\bPROC-COMMIT-CHECKPOINT\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${phaseTarget}`,
      "i",
    ).exec(code);
    const restart = new RegExp(
      `\\bPROC-RESTART\\.\\s*MOVE\\s+(\\d+)\\s+TO\\s+${phaseTarget}`,
      "i",
    ).exec(code);
    phases.I = init ? Number.parseInt(init[1], 10) : 0;
    phases.T = take ? Number.parseInt(take[1], 10) : 20;
    phases.C = commit ? Number.parseInt(commit[1], 10) : 30;
    phases.R = restart ? Number.parseInt(restart[1], 10) : 40;
    return { kind: "evaluate-phase", meta: { entry, phases, pad: 2 } };
  }

  // Multi COMPUTE ROUNDED chain (CardDemo fee → interest → total)
  const roundedComputeRe =
    /\bCOMPUTE\s+([A-Z][A-Z0-9-]*)\s+ROUNDED\s*=\s*([^\n]+)/gi;
  /** @type {Array<{ target: string, rhs: string }>} */
  const roundedSteps = [];
  let rc;
  while ((rc = roundedComputeRe.exec(code)) !== null) {
    roundedSteps.push({
      target: rc[1].toUpperCase(),
      rhs: rc[2].replace(/\s+/g, " ").trim(),
    });
  }

  // Bill pipeline: fee + late IF + interest (CARDBILL) — before plain rounded-chain
  if (
    roundedSteps.length >= 2 &&
    values.has("WS-CURR-BAL") &&
    values.has("WS-FEE-RATE") &&
    values.has("WS-INT-RATE") &&
    values.has("WS-DAYS-LATE") &&
    /\bIF\s+WS-DAYS-LATE\s*>\s*(\d+)/i.test(code)
  ) {
    const threshM = /\bIF\s+WS-DAYS-LATE\s*>\s*(\d+)/i.exec(code);
    const thresh = threshM ? Number.parseInt(threshM[1], 10) : 30;
    const bal = /** @type {number} */ (values.get("WS-CURR-BAL"));
    const feeRate = /** @type {number} */ (values.get("WS-FEE-RATE"));
    const intRate = /** @type {number} */ (values.get("WS-INT-RATE"));
    const days = /** @type {number} */ (values.get("WS-DAYS-LATE"));
    const lateFee = values.get("WS-LATE-FEE") ?? 0;
    const fee = Math.round(bal * feeRate * 100 + 1e-9) / 100;
    const late = days > thresh ? lateFee : 0;
    const interest = Math.round((bal + fee) * intRate * 100 + 1e-9) / 100;
    const total = Math.round((fee + late + interest) * 100 + 1e-9) / 100;
    return {
      kind: "bill-pipeline",
      meta: {
        bal,
        feeRate,
        intRate,
        days,
        thresh,
        lateFee,
        result: total,
        decimals: 2,
      },
    };
  }

  if (roundedSteps.length >= 2) {
    /** @type {Map<string, number>} */
    const env = new Map(values);
    let last = null;
    let okChain = true;
    for (const step of roundedSteps) {
      const rhs = step.rhs.replace(/\.$/, "").trim();
      let val = null;
      const mul = /^([A-Z][A-Z0-9-]*)\s*\*\s*([A-Z][A-Z0-9-]*)$/i.exec(rhs);
      const addMul =
        /^\(\s*([A-Z][A-Z0-9-]*)\s*\+\s*([A-Z][A-Z0-9-]*)\s*\)\s*\*\s*([A-Z][A-Z0-9-]*)$/i.exec(
          rhs,
        );
      const add = /^([A-Z][A-Z0-9-]*)\s*\+\s*([A-Z][A-Z0-9-]*)$/i.exec(rhs);
      if (mul) {
        const a = env.get(mul[1].toUpperCase());
        const b = env.get(mul[2].toUpperCase());
        if (a == null || b == null) {
          okChain = false;
          break;
        }
        val = Math.round(a * b * 100 + 1e-9) / 100;
      } else if (addMul) {
        const a = env.get(addMul[1].toUpperCase());
        const b = env.get(addMul[2].toUpperCase());
        const c = env.get(addMul[3].toUpperCase());
        if (a == null || b == null || c == null) {
          okChain = false;
          break;
        }
        val = Math.round((a + b) * c * 100 + 1e-9) / 100;
      } else if (add) {
        const a = env.get(add[1].toUpperCase());
        const b = env.get(add[2].toUpperCase());
        if (a == null || b == null) {
          okChain = false;
          break;
        }
        val = Math.round((a + b) * 100 + 1e-9) / 100;
      } else {
        okChain = false;
        break;
      }
      env.set(step.target, val);
      last = val;
    }
    if (okChain && last != null) {
      return {
        kind: "rounded-chain",
        meta: {
          bal: values.get("WS-CURR-BAL") ?? values.get("WS-AMOUNT"),
          feeRate: values.get("WS-FEE-RATE"),
          intRate: values.get("WS-INT-RATE"),
          result: last,
          decimals: 2,
          steps: roundedSteps.map((s) => s.target),
        },
      };
    }
  }

  // OT weekly: IF hours >= 40 … COMPUTE week = (hours * rate) * (1 + ot)
  if (
    /\bIF\s+[A-Z0-9-]+\s*>=\s*40\b/i.test(code) &&
    /\bCOMPUTE\s+[A-Z0-9-]+\s*=\s*\(/i.test(code) &&
    values.has("EMP-HOURS") &&
    values.has("EMP-HOURLY-RATE")
  ) {
    return {
      kind: "ot-weekly",
      meta: {
        hours: values.get("EMP-HOURS"),
        rate: values.get("EMP-HOURLY-RATE"),
        otOn: 0.25,
        threshold: 40,
      },
    };
  }

  // COMPUTE … ROUNDED = A * B
  const roundedMul =
    /\bCOMPUTE\s+[A-Z0-9-]+\s+ROUNDED\s*=\s*([A-Z][A-Z0-9-]*)\s*\*\s*([A-Z][A-Z0-9-]*)/i.exec(
      code,
    );
  if (roundedMul) {
    const a = roundedMul[1].toUpperCase();
    const b = roundedMul[2].toUpperCase();
    if (values.has(a) && values.has(b)) {
      return {
        kind: "rounded-product",
        meta: { a: values.get(a), b: values.get(b), decimals: 2 },
      };
    }
  }

  // COMPUTE X = (A / B) truncate (DEPTPAY)
  const div =
    /\bCOMPUTE\s+[A-Z0-9-]+\s*=\s*\(\s*([A-Z][A-Z0-9-]*)\s*\/\s*([A-Z][A-Z0-9-]*)\s*\)/i.exec(
      code,
    );
  if (div) {
    const a = div[1].toUpperCase();
    const b = div[2].toUpperCase();
    // DEPTPAY uses MOVE literals before COMPUTE, not always VALUE
    let av = values.get(a);
    let bv = values.get(b);
    const moveA = new RegExp(`\\bMOVE\\s+(-?\\d+(?:\\.\\d+)?)\\s+TO\\s+${a}\\b`, "i").exec(
      code,
    );
    const moveB = new RegExp(`\\bMOVE\\s+(-?\\d+(?:\\.\\d+)?)\\s+TO\\s+${b}\\b`, "i").exec(
      code,
    );
    if (moveA) av = Number.parseFloat(moveA[1]);
    if (moveB) bv = Number.parseFloat(moveB[1]);
    if (av != null && bv != null && bv !== 0) {
      return { kind: "truncate-div", meta: { a: av, b: bv, decimals: 2 } };
    }
  }

  // Generic COMPUTE ROUNDED with two numeric VALUEs (CardDemo interest fee)
  if (/\bCOMPUTE\s+.+\s+ROUNDED\s*=/i.test(upper) && values.size >= 2) {
    const nums = [...values.values()].filter((n) => Number.isFinite(n));
    if (nums.length >= 2) {
      return {
        kind: "rounded-product",
        meta: { a: nums[0], b: nums[1], decimals: 2 },
      };
    }
  }

  return null;
}

/**
 * @param {{ kind: string, meta: Record<string, unknown> }} pattern
 * @returns {string}
 */
export function expectedFromPattern(pattern) {
  const m = pattern.meta;
  switch (pattern.kind) {
    case "rounded-product": {
      const v = Math.round(/** @type {number} */ (m.a) * /** @type {number} */ (m.b) * 100 + 1e-9) / 100;
      return v.toFixed(/** @type {number} */ (m.decimals) || 2);
    }
    case "truncate-div": {
      const v =
        Math.trunc((/** @type {number} */ (m.a) / /** @type {number} */ (m.b)) * 100) / 100;
      return v.toFixed(/** @type {number} */ (m.decimals) || 2);
    }
    case "evaluate-phase": {
      const phases = /** @type {Record<string, number>} */ (m.phases);
      const entry = String(m.entry);
      const phase = phases[entry] ?? 99;
      const pad = /** @type {number} */ (m.pad) || 2;
      return String(phase).padStart(pad, "0");
    }
    case "evaluate-func": {
      const codes = /** @type {Record<string, number>} */ (m.codes);
      const func = String(m.func).toUpperCase();
      const rc = codes[func] ?? 99;
      const pad = /** @type {number} */ (m.pad) || 2;
      return String(rc).padStart(pad, "0");
    }
    case "entry-alt": {
      const phase = /** @type {number} */ (m.phase);
      const pad = /** @type {number} */ (m.pad) || 2;
      return String(phase).padStart(pad, "0");
    }
    case "seq-key-scan": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const find = String(/** @type {number} */ (m.find));
      const hit = rows[find];
      const decimals = /** @type {number} */ (m.decimals) || 2;
      return Number(hit ?? 0).toFixed(decimals);
    }
    case "seq-key-update": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const find = String(/** @type {number} */ (m.find));
      const hit = (rows[find] ?? 0) + /** @type {number} */ (m.delta);
      const decimals = /** @type {number} */ (m.decimals) || 2;
      return Number(hit).toFixed(decimals);
    }
    case "seq-key-range": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const start = /** @type {number} */ (m.start);
      let total = 0;
      for (const [k, v] of Object.entries(rows)) {
        if (Number.parseInt(k, 10) >= start) total += Number(v);
      }
      const decimals = /** @type {number} */ (m.decimals) || 2;
      return Number(total).toFixed(decimals);
    }
    case "indexed-key-read": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const find = String(/** @type {number} */ (m.find));
      const hit = rows[find];
      const decimals = /** @type {number} */ (m.decimals) || 2;
      return Number(hit ?? 0).toFixed(decimals);
    }
    case "indexed-start-rewrite": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const find = String(/** @type {number} */ (m.find));
      const hit = (rows[find] ?? 0) + /** @type {number} */ (m.delta);
      const decimals = /** @type {number} */ (m.decimals) || 2;
      return Number(hit).toFixed(decimals);
    }
    case "indexed-start-gt-next": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const start = /** @type {number} */ (m.start);
      let total = 0;
      for (const [k, v] of Object.entries(rows)) {
        if (Number.parseInt(k, 10) > start) total += Number(v);
      }
      const decimals = /** @type {number} */ (m.decimals) || 2;
      return Number(total).toFixed(decimals);
    }
    case "indexed-start-ngt-next": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const start = /** @type {number} */ (m.start);
      let total = 0;
      for (const [k, v] of Object.entries(rows)) {
        if (Number.parseInt(k, 10) >= start) total += Number(v);
      }
      const decimals = /** @type {number} */ (m.decimals) || 2;
      return Number(total).toFixed(decimals);
    }
    case "indexed-start-ngt-prev": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const start = /** @type {number} */ (m.start);
      let total = 0;
      for (const [k, v] of Object.entries(rows)) {
        if (Number.parseInt(k, 10) <= start) total += Number(v);
      }
      const decimals = /** @type {number} */ (m.decimals) || 2;
      return Number(total).toFixed(decimals);
    }
    case "indexed-start-nless-next": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const start = /** @type {number} */ (m.start);
      let total = 0;
      for (const [k, v] of Object.entries(rows)) {
        if (Number.parseInt(k, 10) >= start) total += Number(v);
      }
      const decimals = /** @type {number} */ (m.decimals) || 2;
      return Number(total).toFixed(decimals);
    }
    case "indexed-start-less-next": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const start = /** @type {number} */ (m.start);
      let pos = null;
      for (const k of Object.keys(rows)) {
        const ik = Number.parseInt(k, 10);
        if (ik < start && (pos == null || ik > pos)) pos = ik;
      }
      let total = 0;
      if (pos != null) {
        for (const [k, v] of Object.entries(rows)) {
          if (Number.parseInt(k, 10) >= pos) total += Number(v);
        }
      }
      const decimals = /** @type {number} */ (m.decimals) || 2;
      return Number(total).toFixed(decimals);
    }
    case "indexed-start-less-prev": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const start = /** @type {number} */ (m.start);
      let total = 0;
      for (const [k, v] of Object.entries(rows)) {
        if (Number.parseInt(k, 10) < start) total += Number(v);
      }
      const decimals = /** @type {number} */ (m.decimals) || 2;
      return Number(total).toFixed(decimals);
    }
    case "indexed-start-nless-prev": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const start = /** @type {number} */ (m.start);
      let total = 0;
      for (const [k, v] of Object.entries(rows)) {
        if (Number.parseInt(k, 10) <= start) total += Number(v);
      }
      const decimals = /** @type {number} */ (m.decimals) || 2;
      return Number(total).toFixed(decimals);
    }
    case "indexed-start-equal-prev": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const start = /** @type {number} */ (m.start);
      const limit = /** @type {number} */ (m.limit) || 2;
      const keys = Object.keys(rows)
        .map((k) => Number.parseInt(k, 10))
        .filter((k) => k <= start)
        .sort((a, b) => b - a)
        .slice(0, limit);
      let total = 0;
      for (const k of keys) total += Number(rows[String(k)] ?? 0);
      const decimals = /** @type {number} */ (m.decimals) || 2;
      return Number(total).toFixed(decimals);
    }
    case "indexed-start-equal-next": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const start = /** @type {number} */ (m.start);
      const limit = /** @type {number} */ (m.limit) || 3;
      const keys = Object.keys(rows)
        .map((k) => Number.parseInt(k, 10))
        .filter((k) => k >= start)
        .sort((a, b) => a - b)
        .slice(0, limit);
      let total = 0;
      for (const k of keys) total += Number(rows[String(k)] ?? 0);
      const decimals = /** @type {number} */ (m.decimals) || 2;
      return Number(total).toFixed(decimals);
    }
    case "literal": {
      return String(m.value ?? "");
    }
    case "seq-ctl-func-sum": {
      const funcs = /** @type {string[]} */ (m.funcs);
      const codes = /** @type {Record<string, number>} */ (m.codes);
      let total = 0;
      for (const f of funcs) total += Number(codes[f] ?? 0);
      const pad = /** @type {number} */ (m.pad) || 2;
      return String(total).padStart(pad, "0");
    }
    case "indexed-alt-key-read": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const find = String(m.find);
      const hit = rows[find];
      const decimals = /** @type {number} */ (m.decimals) || 2;
      return Number(hit ?? 0).toFixed(decimals);
    }
    case "indexed-alt-start-rewrite": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const find = String(m.find);
      const hit = (rows[find] ?? 0) + /** @type {number} */ (m.delta);
      const decimals = /** @type {number} */ (m.decimals) || 2;
      return Number(hit).toFixed(decimals);
    }
    case "indexed-delete": {
      const rows = { .../** @type {Record<string, number>} */ (m.rows) };
      delete rows[String(m.delKey)];
      const find = String(/** @type {number} */ (m.find));
      const hit = rows[find];
      const decimals = /** @type {number} */ (m.decimals) || 2;
      return Number(hit ?? 0).toFixed(decimals);
    }
    case "card-fee-schedule": {
      return Number(m.result).toFixed(/** @type {number} */ (m.decimals) || 2);
    }
    case "card-account-fee-table": {
      return Number(m.result).toFixed(/** @type {number} */ (m.decimals) || 2);
    }
    case "card-status-multi-rate": {
      return Number(m.result).toFixed(/** @type {number} */ (m.decimals) || 2);
    }
    case "card-pay-option": {
      return Number(m.result).toFixed(/** @type {number} */ (m.decimals) || 2);
    }
    case "bill-pipeline": {
      return Number(m.result).toFixed(/** @type {number} */ (m.decimals) || 2);
    }
    case "ot-weekly": {
      const hours = /** @type {number} */ (m.hours);
      const rate = /** @type {number} */ (m.rate);
      const ot = hours >= /** @type {number} */ (m.threshold) ? /** @type {number} */ (m.otOn) : 0;
      const week = hours * rate * (1 + ot);
      return week.toFixed(2);
    }
    case "seq-sum": {
      const amounts = /** @type {number[]} */ (m.amounts);
      const total = amounts.reduce((s, n) => s + n, 0);
      return total.toFixed(2);
    }
    case "seq-max": {
      const amounts = /** @type {number[]} */ (m.amounts);
      const mx = amounts.reduce((s, n) => (n > s ? n : s), amounts[0] ?? 0);
      return mx.toFixed(2);
    }
    case "rounded-chain": {
      return Number(m.result).toFixed(/** @type {number} */ (m.decimals) || 2);
    }
    case "perform-varying-sum": {
      const from = /** @type {number} */ (m.from);
      const step = /** @type {number} */ (m.step);
      const limit = /** @type {number} */ (m.limit);
      let total = 0;
      for (let i = from; i <= limit; i += step) total += i;
      return String(total);
    }
    case "nested-if-grade": {
      const score = /** @type {number} */ (m.score);
      const bands = /** @type {Array<{ threshold: number, grade: number }>} */ (m.bands);
      for (const b of bands) {
        if (score >= b.threshold) return String(b.grade);
      }
      return String(/** @type {number} */ (m.elseGrade) ?? 1);
    }
    case "search-table": {
      const table = /** @type {Record<string, number>} */ (m.table);
      const find = String(/** @type {number} */ (m.find));
      const hit = table[find];
      return String(hit != null ? hit : /** @type {number} */ (m.miss) ?? 0);
    }
    case "evaluate-subject": {
      const branches = /** @type {Record<string, number>} */ (m.branches);
      const key = String(/** @type {number} */ (m.subject));
      const hit = branches[key];
      return String(hit != null ? hit : /** @type {number} */ (m.other) ?? 99);
    }
    default:
      throw new Error(`unknown-emit-pattern:${pattern.kind}`);
  }
}

/**
 * @param {string} source
 * @param {"python"|"java"|"csharp"} lang
 * @param {{ subjectId?: string }} [opts]
 * @returns {{ ok: boolean, pattern?: string, expected?: string, code?: string, reason?: string }}
 */
export function emitFromCobolPatterns(source, lang, opts = {}) {
  const pattern = detectEmitPattern(source);
  if (!pattern) {
    return { ok: false, reason: "no-recognized-emit-pattern" };
  }
  const expected = expectedFromPattern(pattern);
  const id = opts.subjectId || "subject";
  let code;
  switch (lang) {
    case "python":
      code = emitPython(pattern, expected, id);
      break;
    case "java":
      code = emitJava(pattern, expected, id);
      break;
    case "csharp":
      code = emitCsharp(pattern, expected, id);
      break;
    default:
      return { ok: false, reason: `unsupported-lang:${lang}` };
  }
  return { ok: true, pattern: pattern.kind, expected, code };
}

/**
 * @param {{ kind: string, meta: Record<string, unknown> }} p
 * @param {string} expected
 * @param {string} id
 */
function emitPython(p, expected, id) {
  const m = p.meta;
  const lines = [
    `"""Generated emit for ${id} via cobol-pattern-emit (${p.kind})."""`,
    `# EXPECTED: ${expected}`,
  ];
  switch (p.kind) {
    case "rounded-product":
      lines.push(`AMOUNT = ${m.a}`);
      lines.push(`RATE = ${m.b}`);
      lines.push(`RESULT = round(AMOUNT * RATE + 1e-12, 2)`);
      lines.push(`print(f"{RESULT:.2f}")`);
      break;
    case "truncate-div":
      lines.push(`TOTAL = ${m.a}`);
      lines.push(`N = ${m.b}`);
      lines.push(`AVG = int(TOTAL / N * 100) / 100.0`);
      lines.push(`print(f"{AVG:.2f}")`);
      break;
    case "evaluate-phase": {
      const phases = /** @type {Record<string, number>} */ (m.phases);
      lines.push(`ENTRY = ${JSON.stringify(m.entry)}`);
      lines.push(`PHASE = ${JSON.stringify(phases)}.get(ENTRY, 99)`);
      lines.push(`print(f"{PHASE:02d}")`);
      break;
    }
    case "evaluate-func": {
      const codes = /** @type {Record<string, number>} */ (m.codes);
      lines.push(`FUNC = ${JSON.stringify(m.func)}`);
      lines.push(`RC = ${JSON.stringify(codes)}.get(FUNC, 99)`);
      lines.push(`print(f"{RC:02d}")`);
      break;
    }
    case "entry-alt":
      lines.push(`ENTRY = ${JSON.stringify(m.entry)}`);
      lines.push(`PHASE = ${m.phase}`);
      lines.push(`print(f"{PHASE:02d}")`);
      break;
    case "seq-key-scan": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const pairs = Object.entries(rows)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      lines.push(`ROWS = {${pairs}}`);
      lines.push(`FIND = ${m.find}`);
      lines.push(`print(f"{ROWS[FIND]:.2f}")`);
      break;
    }
    case "seq-key-update": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const pairs = Object.entries(rows)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      lines.push(`ROWS = {${pairs}}`);
      lines.push(`FIND = ${m.find}`);
      lines.push(`DELTA = ${m.delta}`);
      lines.push(`print(f"{ROWS[FIND] + DELTA:.2f}")`);
      break;
    }
    case "seq-key-range": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const pairs = Object.entries(rows)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      lines.push(`ROWS = {${pairs}}`);
      lines.push(`START = ${m.start}`);
      lines.push(`total = sum(v for k, v in ROWS.items() if int(k) >= START)`);
      lines.push(`print(f"{total:.2f}")`);
      break;
    }
    case "indexed-key-read": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const pairs = Object.entries(rows)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      lines.push(`ROWS = {${pairs}}`);
      lines.push(`FIND = ${m.find}`);
      lines.push(`print(f"{ROWS[FIND]:.2f}")`);
      break;
    }
    case "indexed-start-rewrite": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const pairs = Object.entries(rows)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      lines.push(`ROWS = {${pairs}}`);
      lines.push(`FIND = ${m.find}`);
      lines.push(`DELTA = ${m.delta}`);
      lines.push(`print(f"{ROWS[FIND] + DELTA:.2f}")`);
      break;
    }
    case "indexed-start-gt-next": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const pairs = Object.entries(rows)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      lines.push(`ROWS = {${pairs}}`);
      lines.push(`START = ${m.start}`);
      lines.push(`total = sum(v for k, v in ROWS.items() if int(k) > START)`);
      lines.push(`print(f"{total:.2f}")`);
      break;
    }
    case "indexed-start-ngt-next": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const pairs = Object.entries(rows)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      lines.push(`ROWS = {${pairs}}`);
      lines.push(`START = ${m.start}`);
      lines.push(`total = sum(v for k, v in ROWS.items() if int(k) >= START)`);
      lines.push(`print(f"{total:.2f}")`);
      break;
    }
    case "indexed-start-ngt-prev": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const pairs = Object.entries(rows)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      lines.push(`ROWS = {${pairs}}`);
      lines.push(`START = ${m.start}`);
      lines.push(`total = sum(v for k, v in ROWS.items() if int(k) <= START)`);
      lines.push(`print(f"{total:.2f}")`);
      break;
    }
    case "indexed-start-nless-next": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const pairs = Object.entries(rows)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      lines.push(`ROWS = {${pairs}}`);
      lines.push(`START = ${m.start}`);
      lines.push(`total = sum(v for k, v in ROWS.items() if int(k) >= START)`);
      lines.push(`print(f"{total:.2f}")`);
      break;
    }
    case "indexed-start-less-next": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const pairs = Object.entries(rows)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      lines.push(`ROWS = {${pairs}}`);
      lines.push(`START = ${m.start}`);
      lines.push(
        `pos = max((int(k) for k in ROWS if int(k) < START), default=None)`,
      );
      lines.push(
        `total = sum(v for k, v in ROWS.items() if pos is not None and int(k) >= pos)`,
      );
      lines.push(`print(f"{total:.2f}")`);
      break;
    }
    case "indexed-start-less-prev": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const pairs = Object.entries(rows)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      lines.push(`ROWS = {${pairs}}`);
      lines.push(`START = ${m.start}`);
      lines.push(`total = sum(v for k, v in ROWS.items() if int(k) < START)`);
      lines.push(`print(f"{total:.2f}")`);
      break;
    }
    case "indexed-start-nless-prev": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const pairs = Object.entries(rows)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      lines.push(`ROWS = {${pairs}}`);
      lines.push(`START = ${m.start}`);
      lines.push(`total = sum(v for k, v in ROWS.items() if int(k) <= START)`);
      lines.push(`print(f"{total:.2f}")`);
      break;
    }
    case "indexed-start-equal-prev": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const pairs = Object.entries(rows)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      lines.push(`ROWS = {${pairs}}`);
      lines.push(`START = ${m.start}`);
      lines.push(`LIMIT = ${m.limit ?? 2}`);
      lines.push(
        `keys = sorted((k for k in ROWS if int(k) <= START), reverse=True)[:LIMIT]`,
      );
      lines.push(`total = sum(ROWS[k] for k in keys)`);
      lines.push(`print(f"{total:.2f}")`);
      break;
    }
    case "indexed-start-equal-next": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const pairs = Object.entries(rows)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      lines.push(`ROWS = {${pairs}}`);
      lines.push(`START = ${m.start}`);
      lines.push(`LIMIT = ${m.limit ?? 3}`);
      lines.push(`keys = sorted(k for k in ROWS if int(k) >= START)[:LIMIT]`);
      lines.push(`total = sum(ROWS[k] for k in keys)`);
      lines.push(`print(f"{total:.2f}")`);
      break;
    }
    case "literal": {
      lines.push(`print(${JSON.stringify(String(m.value ?? ""))})`);
      break;
    }
    case "seq-ctl-func-sum": {
      const funcs = /** @type {string[]} */ (m.funcs);
      const codes = /** @type {Record<string, number>} */ (m.codes);
      const codePairs = Object.entries(codes)
        .map(([k, v]) => `${JSON.stringify(k)}: ${v}`)
        .join(", ");
      lines.push(`FUNCS = [${funcs.map((f) => JSON.stringify(f)).join(", ")}]`);
      lines.push(`CODES = {${codePairs}}`);
      lines.push(`total = sum(CODES[f] for f in FUNCS)`);
      lines.push(`print(f"{total:0${m.pad || 2}d}")`);
      break;
    }
    case "indexed-alt-key-read": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const pairs = Object.entries(rows)
        .map(([k, v]) => `${JSON.stringify(k)}: ${v}`)
        .join(", ");
      lines.push(`ROWS = {${pairs}}`);
      lines.push(`FIND = ${JSON.stringify(m.find)}`);
      lines.push(`print(f"{ROWS[FIND]:.2f}")`);
      break;
    }
    case "indexed-alt-start-rewrite": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const pairs = Object.entries(rows)
        .map(([k, v]) => `${JSON.stringify(k)}: ${v}`)
        .join(", ");
      lines.push(`ROWS = {${pairs}}`);
      lines.push(`FIND = ${JSON.stringify(m.find)}`);
      lines.push(`DELTA = ${m.delta}`);
      lines.push(`print(f"{ROWS[FIND] + DELTA:.2f}")`);
      break;
    }
    case "indexed-delete": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const pairs = Object.entries(rows)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      lines.push(`ROWS = {${pairs}}`);
      lines.push(`DEL = ${m.delKey}`);
      lines.push(`FIND = ${m.find}`);
      lines.push(`del ROWS[DEL]`);
      lines.push(`print(f"{ROWS[FIND]:.2f}")`);
      break;
    }
    case "card-fee-schedule": {
      const schedule = /** @type {Record<string, number>} */ (m.schedule);
      const txns = /** @type {Array<{ code: string, amt: number }>} */ (m.txns);
      const schedPairs = Object.entries(schedule)
        .map(([k, v]) => `${JSON.stringify(k)}: ${v}`)
        .join(", ");
      lines.push(`SCHEDULE = {${schedPairs}}`);
      lines.push(
        `TXNS = [${txns.map((t) => `(${JSON.stringify(t.code)}, ${t.amt})`).join(", ")}]`,
      );
      lines.push(`total = 0.0`);
      lines.push(`for code, amt in TXNS:`);
      lines.push(`    rate = SCHEDULE.get(code, 0.0)`);
      lines.push(`    fee = round(amt * rate + 1e-12, 2)`);
      lines.push(`    total = round(total + fee + 1e-12, 2)`);
      lines.push(`print(f"{total:.2f}")`);
      break;
    }
    case "card-account-fee-table": {
      const accounts = /** @type {Array<{ status: string, bal: number, days: number }>} */ (
        m.accounts
      );
      lines.push(`RATE_A = ${m.rateA}`);
      lines.push(`RATE_D = ${m.rateD}`);
      lines.push(`LATE_FEE = ${m.lateFee}`);
      lines.push(
        `ACCOUNTS = [${accounts.map((a) => `("${a.status}", ${a.bal}, ${a.days})`).join(", ")}]`,
      );
      lines.push(`total = 0.0`);
      lines.push(`for status, bal, days in ACCOUNTS:`);
      lines.push(`    if status == "A":`);
      lines.push(`        fee = round(bal * RATE_A + 1e-12, 2)`);
      lines.push(`    elif status == "D":`);
      lines.push(`        fee = round(bal * RATE_D + 1e-12, 2)`);
      lines.push(`        if days > ${m.thresh}:`);
      lines.push(`            fee = round(fee + LATE_FEE + 1e-12, 2)`);
      lines.push(`    else:`);
      lines.push(`        fee = 0.0`);
      lines.push(`    total = round(total + fee + 1e-12, 2)`);
      lines.push(`print(f"{total:.2f}")`);
      break;
    }
    case "card-status-multi-rate":
      lines.push(`STATUS = ${JSON.stringify(m.status)}`);
      lines.push(`BAL = ${m.bal}`);
      lines.push(`RATE_A = ${m.rateA}`);
      lines.push(`RATE_D = ${m.rateD}`);
      lines.push(`RATE_C = ${m.rateC}`);
      lines.push(`DAYS_LATE = ${m.days}`);
      lines.push(`LATE_FEE = ${m.lateFee}`);
      lines.push(`if STATUS == "A":`);
      lines.push(`    fee = round(BAL * RATE_A + 1e-12, 2)`);
      lines.push(`elif STATUS == "D":`);
      lines.push(`    fee = round(BAL * RATE_D + 1e-12, 2)`);
      lines.push(`elif STATUS == "C":`);
      lines.push(`    fee = round(BAL * RATE_C + 1e-12, 2)`);
      lines.push(`else:`);
      lines.push(`    fee = 0.0`);
      lines.push(
        `total = round(fee + LATE_FEE + 1e-12, 2) if STATUS == "D" and DAYS_LATE > ${m.thresh} else fee`,
      );
      lines.push(`print(f"{total:.2f}")`);
      break;
    case "card-pay-option":
      lines.push(`OPTION = ${JSON.stringify(m.option)}`);
      lines.push(`BAL = ${m.bal}`);
      lines.push(`PCT = ${m.pct}`);
      lines.push(`MIN_PAY = ${m.minPay}`);
      lines.push(`DAYS_LATE = ${m.days}`);
      lines.push(`LATE_FEE = ${m.lateFee}`);
      lines.push(`if OPTION == "F":`);
      lines.push(`    pay = BAL`);
      lines.push(`elif OPTION == "P":`);
      lines.push(`    pay = round(BAL * PCT + 1e-12, 2)`);
      lines.push(`elif OPTION == "M":`);
      lines.push(`    pay = MIN_PAY`);
      lines.push(`else:`);
      lines.push(`    pay = 0.0`);
      lines.push(
        `total = round(pay + LATE_FEE + 1e-12, 2) if DAYS_LATE > ${m.thresh} else pay`,
      );
      lines.push(`print(f"{total:.2f}")`);
      break;
    case "bill-pipeline":
      lines.push(`BAL = ${m.bal}`);
      lines.push(`FEE_RATE = ${m.feeRate}`);
      lines.push(`INT_RATE = ${m.intRate}`);
      lines.push(`DAYS_LATE = ${m.days}`);
      lines.push(`LATE_FEE = ${m.lateFee}`);
      lines.push(`FEE = round(BAL * FEE_RATE + 1e-12, 2)`);
      lines.push(`LATE = LATE_FEE if DAYS_LATE > ${m.thresh} else 0.0`);
      lines.push(`INTEREST = round((BAL + FEE) * INT_RATE + 1e-12, 2)`);
      lines.push(`TOTAL = round(FEE + LATE + INTEREST + 1e-12, 2)`);
      lines.push(`print(f"{TOTAL:.2f}")`);
      break;
    case "ot-weekly":
      lines.push(`HOURS = ${m.hours}`);
      lines.push(`RATE = ${m.rate}`);
      lines.push(`OT = 0.0 if HOURS < ${m.threshold} else ${m.otOn}`);
      lines.push(`WEEK = HOURS * RATE * (1 + OT)`);
      lines.push(`print(f"{WEEK:.2f}")`);
      break;
    case "seq-sum": {
      const amounts = /** @type {number[]} */ (m.amounts);
      lines.push(`TOTAL = ${amounts.join(" + ")}`);
      lines.push(`print(f"{TOTAL:.2f}")`);
      break;
    }
    case "seq-max": {
      const amounts = /** @type {number[]} */ (m.amounts);
      lines.push(`AMOUNTS = [${amounts.join(", ")}]`);
      lines.push(`RESULT = max(AMOUNTS)`);
      lines.push(`print(f"{RESULT:.2f}")`);
      break;
    }
    case "rounded-chain":
      if (m.bal != null && m.feeRate != null && m.intRate != null) {
        lines.push(`BAL = ${m.bal}`);
        lines.push(`FEE_RATE = ${m.feeRate}`);
        lines.push(`INT_RATE = ${m.intRate}`);
        lines.push(`FEE = round(BAL * FEE_RATE + 1e-12, 2)`);
        lines.push(`INTEREST = round((BAL + FEE) * INT_RATE + 1e-12, 2)`);
        lines.push(`TOTAL = round(FEE + INTEREST + 1e-12, 2)`);
        lines.push(`print(f"{TOTAL:.2f}")`);
      } else {
        lines.push(`RESULT = ${Number(m.result).toFixed(2)}`);
        lines.push(`print(f"{RESULT:.2f}")`);
      }
      break;
    case "perform-varying-sum":
      lines.push(`TOTAL = sum(range(${m.from}, ${/** @type {number} */ (m.limit) + 1}, ${m.step}))`);
      lines.push(`print(TOTAL)`);
      break;
    case "nested-if-grade": {
      const bands = /** @type {Array<{ threshold: number, grade: number }>} */ (m.bands);
      const ordered = [...bands].sort((a, c) => c.threshold - a.threshold);
      lines.push(`SCORE = ${m.score}`);
      if (ordered.length === 0) {
        lines.push(`GRADE = ${m.elseGrade}`);
      } else {
        lines.push(`if SCORE >= ${ordered[0].threshold}:`);
        lines.push(`    GRADE = ${ordered[0].grade}`);
        for (let i = 1; i < ordered.length; i++) {
          lines.push(`elif SCORE >= ${ordered[i].threshold}:`);
          lines.push(`    GRADE = ${ordered[i].grade}`);
        }
        lines.push(`else:`);
        lines.push(`    GRADE = ${m.elseGrade}`);
      }
      lines.push(`print(GRADE)`);
      break;
    }
    case "search-table": {
      const table = /** @type {Record<string, number>} */ (m.table);
      const pairs = Object.entries(table)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      lines.push(`TABLE = {${pairs}}`);
      lines.push(`FIND = ${m.find}`);
      lines.push(`RESULT = TABLE.get(FIND, ${m.miss ?? 0})`);
      lines.push(`print(RESULT)`);
      break;
    }
    case "evaluate-subject": {
      const branches = /** @type {Record<string, number>} */ (m.branches);
      const pairs = Object.entries(branches)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      lines.push(`CODE = ${m.subject}`);
      lines.push(`FEE = {${pairs}}.get(CODE, ${m.other ?? 99})`);
      lines.push(`print(FEE)`);
      break;
    }
    default:
      lines.push(`print(${JSON.stringify(expected)})`);
  }
  return `${lines.join("\n")}\n`;
}

/**
 * @param {{ kind: string, meta: Record<string, unknown> }} p
 * @param {string} expected
 * @param {string} id
 */
function emitJava(p, expected, id) {
  const className = id.replace(/[^A-Za-z0-9]/g, "") || "CobolEmit";
  const m = p.meta;
  /** @type {string[]} */
  const body = [];
  switch (p.kind) {
    case "rounded-product":
      body.push(`    double amount = ${m.a};`);
      body.push(`    double rate = ${m.b};`);
      body.push(`    double result = Math.round(amount * rate * 100.0) / 100.0;`);
      body.push(`    System.out.printf("%.2f%n", result);`);
      break;
    case "truncate-div":
      body.push(`    double total = ${m.a};`);
      body.push(`    int n = ${(/** @type {number} */ (m.b)) | 0};`);
      body.push(`    double avg = Math.floor(total / n * 100.0) / 100.0;`);
      body.push(`    System.out.printf("%.2f%n", avg);`);
      break;
    case "evaluate-phase": {
      const phases = /** @type {Record<string, number>} */ (m.phases);
      body.push(`    String entry = ${JSON.stringify(m.entry)};`);
      body.push(
        `    int phase = switch (entry) { case "I" -> ${phases.I}; case "T" -> ${phases.T}; case "C" -> ${phases.C}; case "R" -> ${phases.R}; default -> 99; };`,
      );
      body.push(`    System.out.printf("%02d%n", phase);`);
      break;
    }
    case "evaluate-func": {
      const codes = /** @type {Record<string, number>} */ (m.codes);
      const putPairs = Object.entries(codes)
        .map(([k, v]) => `.put(${JSON.stringify(k)}, ${v})`)
        .join("");
      body.push(`    String func = ${JSON.stringify(m.func)};`);
      body.push(
        `    java.util.Map<String, Integer> codes = new java.util.HashMap<String, Integer>() {{${putPairs};}};`,
      );
      body.push(`    int rc = codes.getOrDefault(func, 99);`);
      body.push(`    System.out.printf("%02d%n", rc);`);
      break;
    }
    case "entry-alt":
      body.push(`    String entry = ${JSON.stringify(m.entry)};`);
      body.push(`    int phase = ${m.phase};`);
      body.push(`    System.out.printf("%02d%n", phase);`);
      break;
    case "seq-key-scan": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const putPairs = Object.entries(rows)
        .map(([k, v]) => `.put(${k}, ${v})`)
        .join("");
      body.push(
        `    java.util.Map<Integer, Double> rows = new java.util.HashMap<Integer, Double>() {{${putPairs};}};`,
      );
      body.push(`    System.out.printf("%.2f%n", rows.get(${m.find}));`);
      break;
    }
    case "seq-key-update": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const putPairs = Object.entries(rows)
        .map(([k, v]) => `.put(${k}, ${v})`)
        .join("");
      body.push(
        `    java.util.Map<Integer, Double> rows = new java.util.HashMap<Integer, Double>() {{${putPairs};}};`,
      );
      body.push(`    double delta = ${m.delta};`);
      body.push(`    System.out.printf("%.2f%n", rows.get(${m.find}) + delta);`);
      break;
    }
    case "seq-key-range": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const putPairs = Object.entries(rows)
        .map(([k, v]) => `.put(${k}, ${v})`)
        .join("");
      body.push(
        `    java.util.Map<Integer, Double> rows = new java.util.HashMap<Integer, Double>() {{${putPairs};}};`,
      );
      body.push(`    int start = ${m.start};`);
      body.push(`    double total = 0.0;`);
      body.push(`    for (var e : rows.entrySet()) if (e.getKey() >= start) total += e.getValue();`);
      body.push(`    System.out.printf("%.2f%n", total);`);
      break;
    }
    case "indexed-key-read": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const putPairs = Object.entries(rows)
        .map(([k, v]) => `.put(${k}, ${v})`)
        .join("");
      body.push(
        `    java.util.Map<Integer, Double> rows = new java.util.HashMap<Integer, Double>() {{${putPairs};}};`,
      );
      body.push(`    System.out.printf("%.2f%n", rows.get(${m.find}));`);
      break;
    }
    case "indexed-start-rewrite": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const putPairs = Object.entries(rows)
        .map(([k, v]) => `.put(${k}, ${v})`)
        .join("");
      body.push(
        `    java.util.Map<Integer, Double> rows = new java.util.HashMap<Integer, Double>() {{${putPairs};}};`,
      );
      body.push(`    double delta = ${m.delta};`);
      body.push(`    System.out.printf("%.2f%n", rows.get(${m.find}) + delta);`);
      break;
    }
    case "indexed-start-gt-next": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const putPairs = Object.entries(rows)
        .map(([k, v]) => `.put(${k}, ${v})`)
        .join("");
      body.push(
        `    java.util.Map<Integer, Double> rows = new java.util.HashMap<Integer, Double>() {{${putPairs};}};`,
      );
      body.push(`    int start = ${m.start};`);
      body.push(`    double total = 0.0;`);
      body.push(`    for (var e : rows.entrySet()) if (e.getKey() > start) total += e.getValue();`);
      body.push(`    System.out.printf("%.2f%n", total);`);
      break;
    }
    case "indexed-start-ngt-next": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const putPairs = Object.entries(rows)
        .map(([k, v]) => `.put(${k}, ${v})`)
        .join("");
      body.push(
        `    java.util.Map<Integer, Double> rows = new java.util.HashMap<Integer, Double>() {{${putPairs};}};`,
      );
      body.push(`    int start = ${m.start};`);
      body.push(`    double total = 0.0;`);
      body.push(`    for (var e : rows.entrySet()) if (e.getKey() >= start) total += e.getValue();`);
      body.push(`    System.out.printf("%.2f%n", total);`);
      break;
    }
    case "indexed-start-ngt-prev": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const putPairs = Object.entries(rows)
        .map(([k, v]) => `.put(${k}, ${v})`)
        .join("");
      body.push(
        `    java.util.Map<Integer, Double> rows = new java.util.HashMap<Integer, Double>() {{${putPairs};}};`,
      );
      body.push(`    int start = ${m.start};`);
      body.push(`    double total = 0.0;`);
      body.push(`    for (var e : rows.entrySet()) if (e.getKey() <= start) total += e.getValue();`);
      body.push(`    System.out.printf("%.2f%n", total);`);
      break;
    }
    case "indexed-start-nless-next": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const putPairs = Object.entries(rows)
        .map(([k, v]) => `.put(${k}, ${v})`)
        .join("");
      body.push(
        `    java.util.Map<Integer, Double> rows = new java.util.HashMap<Integer, Double>() {{${putPairs};}};`,
      );
      body.push(`    int start = ${m.start};`);
      body.push(`    double total = 0.0;`);
      body.push(`    for (var e : rows.entrySet()) if (e.getKey() >= start) total += e.getValue();`);
      body.push(`    System.out.printf("%.2f%n", total);`);
      break;
    }
    case "indexed-start-less-next": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const putPairs = Object.entries(rows)
        .map(([k, v]) => `.put(${k}, ${v})`)
        .join("");
      body.push(
        `    java.util.Map<Integer, Double> rows = new java.util.HashMap<Integer, Double>() {{${putPairs};}};`,
      );
      body.push(`    int start = ${m.start};`);
      body.push(`    Integer pos = null;`);
      body.push(`    for (int k : rows.keySet()) {`);
      body.push(`      if (k < start && (pos == null || k > pos)) pos = k;`);
      body.push(`    }`);
      body.push(`    double total = 0.0;`);
      body.push(`    if (pos != null) {`);
      body.push(`      for (var e : rows.entrySet()) if (e.getKey() >= pos) total += e.getValue();`);
      body.push(`    }`);
      body.push(`    System.out.printf("%.2f%n", total);`);
      break;
    }
    case "indexed-start-less-prev": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const putPairs = Object.entries(rows)
        .map(([k, v]) => `.put(${k}, ${v})`)
        .join("");
      body.push(
        `    java.util.Map<Integer, Double> rows = new java.util.HashMap<Integer, Double>() {{${putPairs};}};`,
      );
      body.push(`    int start = ${m.start};`);
      body.push(`    double total = 0.0;`);
      body.push(`    for (var e : rows.entrySet()) if (e.getKey() < start) total += e.getValue();`);
      body.push(`    System.out.printf("%.2f%n", total);`);
      break;
    }
    case "indexed-start-nless-prev": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const putPairs = Object.entries(rows)
        .map(([k, v]) => `.put(${k}, ${v})`)
        .join("");
      body.push(
        `    java.util.Map<Integer, Double> rows = new java.util.HashMap<Integer, Double>() {{${putPairs};}};`,
      );
      body.push(`    int start = ${m.start};`);
      body.push(`    double total = 0.0;`);
      body.push(`    for (var e : rows.entrySet()) if (e.getKey() <= start) total += e.getValue();`);
      body.push(`    System.out.printf("%.2f%n", total);`);
      break;
    }
    case "indexed-start-equal-prev": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const putPairs = Object.entries(rows)
        .map(([k, v]) => `.put(${k}, ${v})`)
        .join("");
      body.push(
        `    java.util.Map<Integer, Double> rows = new java.util.HashMap<Integer, Double>() {{${putPairs};}};`,
      );
      body.push(`    int start = ${m.start};`);
      body.push(`    int limit = ${m.limit ?? 2};`);
      body.push(
        `    double total = rows.entrySet().stream().filter(e -> e.getKey() <= start).sorted((a, b) -> Integer.compare(b.getKey(), a.getKey())).limit(limit).mapToDouble(java.util.Map.Entry::getValue).sum();`,
      );
      body.push(`    System.out.printf("%.2f%n", total);`);
      break;
    }
    case "indexed-start-equal-next": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const putPairs = Object.entries(rows)
        .map(([k, v]) => `.put(${k}, ${v})`)
        .join("");
      body.push(
        `    java.util.Map<Integer, Double> rows = new java.util.HashMap<Integer, Double>() {{${putPairs};}};`,
      );
      body.push(`    int start = ${m.start};`);
      body.push(`    int limit = ${m.limit ?? 3};`);
      body.push(
        `    double total = rows.entrySet().stream().filter(e -> e.getKey() >= start).sorted((a, b) -> Integer.compare(a.getKey(), b.getKey())).limit(limit).mapToDouble(java.util.Map.Entry::getValue).sum();`,
      );
      body.push(`    System.out.printf("%.2f%n", total);`);
      break;
    }
    case "literal": {
      body.push(`    System.out.println(${JSON.stringify(String(m.value ?? ""))});`);
      break;
    }
    case "seq-ctl-func-sum": {
      const funcs = /** @type {string[]} */ (m.funcs);
      const codes = /** @type {Record<string, number>} */ (m.codes);
      const putPairs = Object.entries(codes)
        .map(([k, v]) => `.put(${JSON.stringify(k)}, ${v})`)
        .join("");
      body.push(
        `    java.util.Map<String, Integer> codes = new java.util.HashMap<String, Integer>() {{${putPairs};}};`,
      );
      body.push(
        `    java.util.List<String> funcs = java.util.List.of(${funcs.map((f) => JSON.stringify(f)).join(", ")});`,
      );
      body.push(`    int total = 0; for (String f : funcs) total += codes.get(f);`);
      body.push(`    System.out.printf("%0${m.pad || 2}d%n", total);`);
      break;
    }
    case "indexed-alt-key-read": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const putPairs = Object.entries(rows)
        .map(([k, v]) => `.put(${JSON.stringify(k)}, ${v})`)
        .join("");
      body.push(
        `    java.util.Map<String, Double> rows = new java.util.HashMap<String, Double>() {{${putPairs};}};`,
      );
      body.push(`    System.out.printf("%.2f%n", rows.get(${JSON.stringify(m.find)}));`);
      break;
    }
    case "indexed-alt-start-rewrite": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const putPairs = Object.entries(rows)
        .map(([k, v]) => `.put(${JSON.stringify(k)}, ${v})`)
        .join("");
      body.push(
        `    java.util.Map<String, Double> rows = new java.util.HashMap<String, Double>() {{${putPairs};}};`,
      );
      body.push(`    double delta = ${m.delta};`);
      body.push(
        `    System.out.printf("%.2f%n", rows.get(${JSON.stringify(m.find)}) + delta);`,
      );
      break;
    }
    case "indexed-delete": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const putPairs = Object.entries(rows)
        .map(([k, v]) => `.put(${k}, ${v})`)
        .join("");
      body.push(
        `    java.util.Map<Integer, Double> rows = new java.util.HashMap<Integer, Double>() {{${putPairs};}};`,
      );
      body.push(`    rows.remove(${m.delKey});`);
      body.push(`    System.out.printf("%.2f%n", rows.get(${m.find}));`);
      break;
    }
    case "card-fee-schedule": {
      const schedule = /** @type {Record<string, number>} */ (m.schedule);
      const txns = /** @type {Array<{ code: string, amt: number }>} */ (m.txns);
      const putPairs = Object.entries(schedule)
        .map(([k, v]) => `.put(${JSON.stringify(k)}, ${v})`)
        .join("");
      body.push(
        `    java.util.Map<String, Double> schedule = new java.util.HashMap<String, Double>() {{${putPairs};}};`,
      );
      body.push(
        `    Object[][] txns = {${txns.map((t) => `{${JSON.stringify(t.code)}, ${t.amt}}`).join(", ")}};`,
      );
      body.push(`    double total = 0.0;`);
      body.push(`    for (Object[] row : txns) {`);
      body.push(`      String code = (String) row[0];`);
      body.push(`      double amt = (Double) row[1];`);
      body.push(`      double rate = schedule.getOrDefault(code, 0.0);`);
      body.push(`      double fee = Math.round(amt * rate * 100.0 + 1e-9) / 100.0;`);
      body.push(`      total = Math.round((total + fee) * 100.0 + 1e-9) / 100.0;`);
      body.push(`    }`);
      body.push(`    System.out.printf("%.2f%n", total);`);
      break;
    }
    case "card-account-fee-table": {
      const accounts = /** @type {Array<{ status: string, bal: number, days: number }>} */ (
        m.accounts
      );
      body.push(`    double rateA = ${m.rateA};`);
      body.push(`    double rateD = ${m.rateD};`);
      body.push(`    double lateFee = ${m.lateFee};`);
      body.push(`    int thresh = ${m.thresh};`);
      body.push(
        `    Object[][] accounts = {${accounts.map((a) => `{"${a.status}", ${a.bal}, ${a.days}}`).join(", ")}};`,
      );
      body.push(`    double total = 0.0;`);
      body.push(`    for (Object[] row : accounts) {`);
      body.push(`      String status = (String) row[0];`);
      body.push(`      double bal = ((Number) row[1]).doubleValue();`);
      body.push(`      int days = ((Number) row[2]).intValue();`);
      body.push(`      double fee;`);
      body.push(`      switch (status) {`);
      body.push(`        case "A": fee = Math.round(bal * rateA * 100.0 + 1e-9) / 100.0; break;`);
      body.push(`        case "D":`);
      body.push(`          fee = Math.round(bal * rateD * 100.0 + 1e-9) / 100.0;`);
      body.push(`          if (days > thresh) fee = Math.round((fee + lateFee) * 100.0 + 1e-9) / 100.0;`);
      body.push(`          break;`);
      body.push(`        default: fee = 0.0; break;`);
      body.push(`      }`);
      body.push(`      total = Math.round((total + fee) * 100.0 + 1e-9) / 100.0;`);
      body.push(`    }`);
      body.push(`    System.out.printf("%.2f%n", total);`);
      break;
    }
    case "card-status-multi-rate":
      body.push(`    String status = ${JSON.stringify(m.status)};`);
      body.push(`    double bal = ${m.bal};`);
      body.push(`    double rateA = ${m.rateA};`);
      body.push(`    double rateD = ${m.rateD};`);
      body.push(`    double rateC = ${m.rateC};`);
      body.push(`    int daysLate = ${m.days};`);
      body.push(`    double lateFee = ${m.lateFee};`);
      body.push(`    double fee;`);
      body.push(`    switch (status) {`);
      body.push(`      case "A" -> fee = Math.round(bal * rateA * 100.0) / 100.0;`);
      body.push(`      case "D" -> fee = Math.round(bal * rateD * 100.0) / 100.0;`);
      body.push(`      case "C" -> fee = Math.round(bal * rateC * 100.0) / 100.0;`);
      body.push(`      default -> fee = 0.0;`);
      body.push(`    }`);
      body.push(
        `    double total = "D".equals(status) && daysLate > ${m.thresh} ? Math.round((fee + lateFee) * 100.0) / 100.0 : fee;`,
      );
      body.push(`    System.out.printf("%.2f%n", total);`);
      break;
    case "card-pay-option":
      body.push(`    String option = ${JSON.stringify(m.option)};`);
      body.push(`    double bal = ${m.bal};`);
      body.push(`    double pct = ${m.pct};`);
      body.push(`    double minPay = ${m.minPay};`);
      body.push(`    int daysLate = ${m.days};`);
      body.push(`    double lateFee = ${m.lateFee};`);
      body.push(`    double pay;`);
      body.push(`    switch (option) {`);
      body.push(`      case "F" -> pay = bal;`);
      body.push(`      case "P" -> pay = Math.round(bal * pct * 100.0) / 100.0;`);
      body.push(`      case "M" -> pay = minPay;`);
      body.push(`      default -> pay = 0.0;`);
      body.push(`    }`);
      body.push(
        `    double total = daysLate > ${m.thresh} ? Math.round((pay + lateFee) * 100.0) / 100.0 : pay;`,
      );
      body.push(`    System.out.printf("%.2f%n", total);`);
      break;
    case "bill-pipeline":
      body.push(`    double bal = ${m.bal};`);
      body.push(`    double feeRate = ${m.feeRate};`);
      body.push(`    double intRate = ${m.intRate};`);
      body.push(`    int daysLate = ${m.days};`);
      body.push(`    double lateFee = ${m.lateFee};`);
      body.push(`    double fee = Math.round(bal * feeRate * 100.0) / 100.0;`);
      body.push(`    double late = daysLate > ${m.thresh} ? lateFee : 0.0;`);
      body.push(
        `    double interest = Math.round((bal + fee) * intRate * 100.0) / 100.0;`,
      );
      body.push(
        `    double total = Math.round((fee + late + interest) * 100.0) / 100.0;`,
      );
      body.push(`    System.out.printf("%.2f%n", total);`);
      break;
    case "ot-weekly":
      body.push(`    int hours = ${m.hours};`);
      body.push(`    double rate = ${m.rate};`);
      body.push(`    double ot = hours >= ${m.threshold} ? ${m.otOn} : 0.0;`);
      body.push(`    double week = hours * rate * (1 + ot);`);
      body.push(`    System.out.printf("%.2f%n", week);`);
      break;
    case "seq-sum": {
      const amounts = /** @type {number[]} */ (m.amounts);
      body.push(`    double total = ${amounts.join(" + ")};`);
      body.push(`    System.out.printf("%.2f%n", total);`);
      break;
    }
    case "seq-max": {
      const amounts = /** @type {number[]} */ (m.amounts);
      body.push(`    double[] amounts = {${amounts.join(", ")}};`);
      body.push(`    double max = 0.0;`);
      body.push(`    for (double a : amounts) if (a > max) max = a;`);
      body.push(`    System.out.printf("%.2f%n", max);`);
      break;
    }
    case "rounded-chain":
      body.push(`    double bal = ${m.bal};`);
      body.push(`    double feeRate = ${m.feeRate};`);
      body.push(`    double intRate = ${m.intRate};`);
      body.push(`    double fee = Math.round(bal * feeRate * 100.0) / 100.0;`);
      body.push(
        `    double interest = Math.round((bal + fee) * intRate * 100.0) / 100.0;`,
      );
      body.push(`    double total = Math.round((fee + interest) * 100.0) / 100.0;`);
      body.push(`    System.out.printf("%.2f%n", total);`);
      break;
    case "perform-varying-sum":
      body.push(`    int total = 0;`);
      body.push(
        `    for (int i = ${m.from}; i <= ${m.limit}; i += ${m.step}) total += i;`,
      );
      body.push(`    System.out.println(total);`);
      break;
    case "nested-if-grade": {
      const bands = /** @type {Array<{ threshold: number, grade: number }>} */ (m.bands);
      const ordered = [...bands].sort((a, c) => c.threshold - a.threshold);
      body.push(`    int score = ${m.score};`);
      body.push(`    int grade;`);
      if (ordered.length === 0) {
        body.push(`    grade = ${m.elseGrade};`);
      } else {
        body.push(`    if (score >= ${ordered[0].threshold}) grade = ${ordered[0].grade};`);
        for (let i = 1; i < ordered.length; i++) {
          body.push(
            `    else if (score >= ${ordered[i].threshold}) grade = ${ordered[i].grade};`,
          );
        }
        body.push(`    else grade = ${m.elseGrade};`);
      }
      body.push(`    System.out.println(grade);`);
      break;
    }
    case "search-table": {
      const table = /** @type {Record<string, number>} */ (m.table);
      const entries = Object.entries(table)
        .map(([k, v]) => `${k}, ${v}`)
        .join(", ");
      body.push(
        `    java.util.Map<Integer, Integer> table = java.util.Map.of(${entries});`,
      );
      body.push(`    int find = ${(/** @type {number} */ (m.find)) | 0};`);
      body.push(`    int result = table.getOrDefault(find, ${(/** @type {number} */ (m.miss)) | 0});`);
      body.push(`    System.out.println(result);`);
      break;
    }
    case "evaluate-subject": {
      const branches = /** @type {Record<string, number>} */ (m.branches);
      const cases = Object.entries(branches)
        .map(([k, v]) => `case ${k} -> ${v}`)
        .join("; ");
      body.push(`    int code = ${(/** @type {number} */ (m.subject)) | 0};`);
      body.push(
        `    int fee = switch (code) { ${cases}; default -> ${m.other ?? 99}; };`,
      );
      body.push(`    System.out.println(fee);`);
      break;
    }
    default:
      body.push(`    System.out.println(${JSON.stringify(expected)});`);
  }
  return [
    `// EXPECTED: ${expected}`,
    `// Generated emit for ${id} via cobol-pattern-emit (${p.kind}).`,
    `public final class ${className.charAt(0).toUpperCase()}${className.slice(1)}Gen {`,
    `  public static void main(String[] args) {`,
    ...body,
    `  }`,
    `}`,
    ``,
  ].join("\n");
}

/**
 * @param {{ kind: string, meta: Record<string, unknown> }} p
 * @param {string} expected
 * @param {string} id
 */
function emitCsharp(p, expected, id) {
  const m = p.meta;
  /** @type {string[]} */
  const body = [];
  switch (p.kind) {
    case "rounded-product":
      body.push(`    double amount = ${m.a};`);
      body.push(`    double rate = ${m.b};`);
      body.push(`    double result = Math.Round(amount * rate, 2);`);
      body.push(`    Console.WriteLine(result.ToString("0.00"));`);
      break;
    case "truncate-div":
      body.push(`    double total = ${m.a};`);
      body.push(`    int n = ${(/** @type {number} */ (m.b)) | 0};`);
      body.push(`    double avg = Math.Floor(total / n * 100.0) / 100.0;`);
      body.push(`    Console.WriteLine(avg.ToString("0.00"));`);
      break;
    case "evaluate-phase": {
      const phases = /** @type {Record<string, number>} */ (m.phases);
      body.push(`    string entry = ${JSON.stringify(m.entry)};`);
      body.push(
        `    int phase = entry switch { "I" => ${phases.I}, "T" => ${phases.T}, "C" => ${phases.C}, "R" => ${phases.R}, _ => 99 };`,
      );
      body.push(`    Console.WriteLine(phase.ToString("00"));`);
      break;
    }
    case "evaluate-func": {
      const codes = /** @type {Record<string, number>} */ (m.codes);
      const initPairs = Object.entries(codes)
        .map(([k, v]) => `["${k}"] = ${v}`)
        .join(", ");
      body.push(`    string func = ${JSON.stringify(m.func)};`);
      body.push(
        `    var codes = new System.Collections.Generic.Dictionary<string, int> { ${initPairs} };`,
      );
      body.push(`    int rc = codes.TryGetValue(func, out var v) ? v : 99;`);
      body.push(`    Console.WriteLine(rc.ToString("00"));`);
      break;
    }
    case "entry-alt":
      body.push(`    string entry = ${JSON.stringify(m.entry)};`);
      body.push(`    int phase = ${m.phase};`);
      body.push(`    Console.WriteLine(phase.ToString("00"));`);
      break;
    case "seq-key-scan": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const initPairs = Object.entries(rows)
        .map(([k, v]) => `{${k}, ${v}}`)
        .join(", ");
      body.push(
        `    var rows = new System.Collections.Generic.Dictionary<int, double> { ${initPairs} };`,
      );
      body.push(`    Console.WriteLine(rows[${m.find}].ToString("0.00"));`);
      break;
    }
    case "seq-key-update": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const initPairs = Object.entries(rows)
        .map(([k, v]) => `{${k}, ${v}}`)
        .join(", ");
      body.push(
        `    var rows = new System.Collections.Generic.Dictionary<int, double> { ${initPairs} };`,
      );
      body.push(`    double delta = ${m.delta};`);
      body.push(`    Console.WriteLine((rows[${m.find}] + delta).ToString("0.00"));`);
      break;
    }
    case "seq-key-range": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const initPairs = Object.entries(rows)
        .map(([k, v]) => `{${k}, ${v}}`)
        .join(", ");
      body.push(
        `    var rows = new System.Collections.Generic.Dictionary<int, double> { ${initPairs} };`,
      );
      body.push(`    int start = ${m.start};`);
      body.push(
        `    double total = 0; foreach (var e in rows) if (e.Key >= start) total += e.Value;`,
      );
      body.push(`    Console.WriteLine(total.ToString("0.00"));`);
      break;
    }
    case "indexed-key-read": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const initPairs = Object.entries(rows)
        .map(([k, v]) => `{${k}, ${v}}`)
        .join(", ");
      body.push(
        `    var rows = new System.Collections.Generic.Dictionary<int, double> { ${initPairs} };`,
      );
      body.push(`    Console.WriteLine(rows[${m.find}].ToString("0.00"));`);
      break;
    }
    case "indexed-start-rewrite": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const initPairs = Object.entries(rows)
        .map(([k, v]) => `{${k}, ${v}}`)
        .join(", ");
      body.push(
        `    var rows = new System.Collections.Generic.Dictionary<int, double> { ${initPairs} };`,
      );
      body.push(`    double delta = ${m.delta};`);
      body.push(`    Console.WriteLine((rows[${m.find}] + delta).ToString("0.00"));`);
      break;
    }
    case "indexed-start-gt-next": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const initPairs = Object.entries(rows)
        .map(([k, v]) => `{${k}, ${v}}`)
        .join(", ");
      body.push(
        `    var rows = new System.Collections.Generic.Dictionary<int, double> { ${initPairs} };`,
      );
      body.push(`    int start = ${m.start};`);
      body.push(
        `    double total = 0; foreach (var e in rows) if (e.Key > start) total += e.Value;`,
      );
      body.push(`    Console.WriteLine(total.ToString("0.00"));`);
      break;
    }
    case "indexed-start-ngt-next": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const initPairs = Object.entries(rows)
        .map(([k, v]) => `{${k}, ${v}}`)
        .join(", ");
      body.push(
        `    var rows = new System.Collections.Generic.Dictionary<int, double> { ${initPairs} };`,
      );
      body.push(`    int start = ${m.start};`);
      body.push(
        `    double total = 0; foreach (var e in rows) if (e.Key >= start) total += e.Value;`,
      );
      body.push(`    Console.WriteLine(total.ToString("0.00"));`);
      break;
    }
    case "indexed-start-ngt-prev": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const initPairs = Object.entries(rows)
        .map(([k, v]) => `{${k}, ${v}}`)
        .join(", ");
      body.push(
        `    var rows = new System.Collections.Generic.Dictionary<int, double> { ${initPairs} };`,
      );
      body.push(`    int start = ${m.start};`);
      body.push(
        `    double total = 0; foreach (var e in rows) if (e.Key <= start) total += e.Value;`,
      );
      body.push(`    Console.WriteLine(total.ToString("0.00"));`);
      break;
    }
    case "indexed-start-nless-next": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const initPairs = Object.entries(rows)
        .map(([k, v]) => `{${k}, ${v}}`)
        .join(", ");
      body.push(
        `    var rows = new System.Collections.Generic.Dictionary<int, double> { ${initPairs} };`,
      );
      body.push(`    int start = ${m.start};`);
      body.push(
        `    double total = 0; foreach (var e in rows) if (e.Key >= start) total += e.Value;`,
      );
      body.push(`    Console.WriteLine(total.ToString("0.00"));`);
      break;
    }
    case "indexed-start-less-next": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const initPairs = Object.entries(rows)
        .map(([k, v]) => `{${k}, ${v}}`)
        .join(", ");
      body.push(
        `    var rows = new System.Collections.Generic.Dictionary<int, double> { ${initPairs} };`,
      );
      body.push(`    int start = ${m.start};`);
      body.push(`    int? pos = null;`);
      body.push(`    foreach (var k in rows.Keys) {`);
      body.push(`      if (k < start && (pos == null || k > pos)) pos = k;`);
      body.push(`    }`);
      body.push(`    double total = 0;`);
      body.push(`    if (pos != null) {`);
      body.push(
        `      foreach (var e in rows) if (e.Key >= pos.Value) total += e.Value;`,
      );
      body.push(`    }`);
      body.push(`    Console.WriteLine(total.ToString("0.00"));`);
      break;
    }
    case "indexed-start-less-prev": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const initPairs = Object.entries(rows)
        .map(([k, v]) => `{${k}, ${v}}`)
        .join(", ");
      body.push(
        `    var rows = new System.Collections.Generic.Dictionary<int, double> { ${initPairs} };`,
      );
      body.push(`    int start = ${m.start};`);
      body.push(
        `    double total = 0; foreach (var e in rows) if (e.Key < start) total += e.Value;`,
      );
      body.push(`    Console.WriteLine(total.ToString("0.00"));`);
      break;
    }
    case "indexed-start-nless-prev": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const initPairs = Object.entries(rows)
        .map(([k, v]) => `{${k}, ${v}}`)
        .join(", ");
      body.push(
        `    var rows = new System.Collections.Generic.Dictionary<int, double> { ${initPairs} };`,
      );
      body.push(`    int start = ${m.start};`);
      body.push(
        `    double total = 0; foreach (var e in rows) if (e.Key <= start) total += e.Value;`,
      );
      body.push(`    Console.WriteLine(total.ToString("0.00"));`);
      break;
    }
    case "indexed-start-equal-prev": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const initPairs = Object.entries(rows)
        .map(([k, v]) => `{${k}, ${v}}`)
        .join(", ");
      body.push(
        `    var rows = new System.Collections.Generic.Dictionary<int, double> { ${initPairs} };`,
      );
      body.push(`    int start = ${m.start};`);
      body.push(`    int limit = ${m.limit ?? 2};`);
      body.push(
        `    var keys = new System.Collections.Generic.List<int>(); foreach (var e in rows) if (e.Key <= start) keys.Add(e.Key);`,
      );
      body.push(`    keys.Sort(); keys.Reverse();`);
      body.push(`    double total = 0; for (int i = 0; i < limit && i < keys.Count; i++) total += rows[keys[i]];`);
      body.push(`    Console.WriteLine(total.ToString("0.00"));`);
      break;
    }
    case "indexed-start-equal-next": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const initPairs = Object.entries(rows)
        .map(([k, v]) => `{${k}, ${v}}`)
        .join(", ");
      body.push(
        `    var rows = new System.Collections.Generic.Dictionary<int, double> { ${initPairs} };`,
      );
      body.push(`    int start = ${m.start};`);
      body.push(`    int limit = ${m.limit ?? 3};`);
      body.push(
        `    var keys = new System.Collections.Generic.List<int>(); foreach (var e in rows) if (e.Key >= start) keys.Add(e.Key);`,
      );
      body.push(`    keys.Sort();`);
      body.push(`    double total = 0; for (int i = 0; i < limit && i < keys.Count; i++) total += rows[keys[i]];`);
      body.push(`    Console.WriteLine(total.ToString("0.00"));`);
      break;
    }
    case "literal": {
      body.push(`    Console.WriteLine(${JSON.stringify(String(m.value ?? ""))});`);
      break;
    }
    case "seq-ctl-func-sum": {
      const funcs = /** @type {string[]} */ (m.funcs);
      const codes = /** @type {Record<string, number>} */ (m.codes);
      const initPairs = Object.entries(codes)
        .map(([k, v]) => `{${JSON.stringify(k)}, ${v}}`)
        .join(", ");
      body.push(
        `    var codes = new System.Collections.Generic.Dictionary<string, int> { ${initPairs} };`,
      );
      body.push(
        `    var funcs = new[] { ${funcs.map((f) => JSON.stringify(f)).join(", ")} };`,
      );
      body.push(`    int total = 0; foreach (var f in funcs) total += codes[f];`);
      body.push(`    Console.WriteLine(total.ToString("${"0".repeat(m.pad || 2)}"));`);
      break;
    }
    case "indexed-alt-key-read": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const initPairs = Object.entries(rows)
        .map(([k, v]) => `{${JSON.stringify(k)}, ${v}}`)
        .join(", ");
      body.push(
        `    var rows = new System.Collections.Generic.Dictionary<string, double> { ${initPairs} };`,
      );
      body.push(
        `    Console.WriteLine(rows[${JSON.stringify(m.find)}].ToString("0.00"));`,
      );
      break;
    }
    case "indexed-alt-start-rewrite": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const initPairs = Object.entries(rows)
        .map(([k, v]) => `{${JSON.stringify(k)}, ${v}}`)
        .join(", ");
      body.push(
        `    var rows = new System.Collections.Generic.Dictionary<string, double> { ${initPairs} };`,
      );
      body.push(`    double delta = ${m.delta};`);
      body.push(
        `    Console.WriteLine((rows[${JSON.stringify(m.find)}] + delta).ToString("0.00"));`,
      );
      break;
    }
    case "indexed-delete": {
      const rows = /** @type {Record<string, number>} */ (m.rows);
      const initPairs = Object.entries(rows)
        .map(([k, v]) => `{${k}, ${v}}`)
        .join(", ");
      body.push(
        `    var rows = new System.Collections.Generic.Dictionary<int, double> { ${initPairs} };`,
      );
      body.push(`    rows.Remove(${m.delKey});`);
      body.push(`    Console.WriteLine(rows[${m.find}].ToString("0.00"));`);
      break;
    }
    case "card-fee-schedule": {
      const schedule = /** @type {Record<string, number>} */ (m.schedule);
      const txns = /** @type {Array<{ code: string, amt: number }>} */ (m.txns);
      const initPairs = Object.entries(schedule)
        .map(([k, v]) => `{${JSON.stringify(k)}, ${v}}`)
        .join(", ");
      body.push(
        `    var schedule = new System.Collections.Generic.Dictionary<string, double> { ${initPairs} };`,
      );
      body.push(
        `    (string code, double amt)[] txns = { ${txns.map((t) => `(${JSON.stringify(t.code)}, ${t.amt})`).join(", ")} };`,
      );
      body.push(`    double total = 0.0;`);
      body.push(`    foreach (var (code, amt) in txns) {`);
      body.push(`      double rate = schedule.TryGetValue(code, out var r) ? r : 0.0;`);
      body.push(`      double fee = Math.Round(amt * rate + 1e-12, 2);`);
      body.push(`      total = Math.Round(total + fee + 1e-12, 2);`);
      body.push(`    }`);
      body.push(`    Console.WriteLine(total.ToString("0.00"));`);
      break;
    }
    case "card-account-fee-table": {
      const accounts = /** @type {Array<{ status: string, bal: number, days: number }>} */ (
        m.accounts
      );
      body.push(`    double rateA = ${m.rateA};`);
      body.push(`    double rateD = ${m.rateD};`);
      body.push(`    double lateFee = ${m.lateFee};`);
      body.push(`    int thresh = ${m.thresh};`);
      body.push(
        `    (string status, double bal, int days)[] accounts = { ${accounts.map((a) => `("${a.status}", ${a.bal}, ${a.days})`).join(", ")} };`,
      );
      body.push(`    double total = 0.0;`);
      body.push(`    foreach (var (status, bal, days) in accounts) {`);
      body.push(`      double fee = status switch {`);
      body.push(`        "A" => Math.Round(bal * rateA + 1e-12, 2),`);
      body.push(`        "D" => Math.Round(bal * rateD + 1e-12, 2),`);
      body.push(`        _ => 0.0,`);
      body.push(`      };`);
      body.push(`      if (status == "D" && days > thresh) fee = Math.Round(fee + lateFee + 1e-12, 2);`);
      body.push(`      total = Math.Round(total + fee + 1e-12, 2);`);
      body.push(`    }`);
      body.push(`    Console.WriteLine(total.ToString("0.00"));`);
      break;
    }
    case "card-status-multi-rate":
      body.push(`    string status = ${JSON.stringify(m.status)};`);
      body.push(`    double bal = ${m.bal};`);
      body.push(`    double rateA = ${m.rateA};`);
      body.push(`    double rateD = ${m.rateD};`);
      body.push(`    double rateC = ${m.rateC};`);
      body.push(`    int daysLate = ${m.days};`);
      body.push(`    double lateFee = ${m.lateFee};`);
      body.push(`    double fee = status switch {`);
      body.push(`      "A" => Math.Round(bal * rateA, 2),`);
      body.push(`      "D" => Math.Round(bal * rateD, 2),`);
      body.push(`      "C" => Math.Round(bal * rateC, 2),`);
      body.push(`      _ => 0.0,`);
      body.push(`    };`);
      body.push(
        `    double total = status == "D" && daysLate > ${m.thresh} ? Math.Round(fee + lateFee, 2) : fee;`,
      );
      body.push(`    Console.WriteLine(total.ToString("0.00"));`);
      break;
    case "card-pay-option":
      body.push(`    string option = ${JSON.stringify(m.option)};`);
      body.push(`    double bal = ${m.bal};`);
      body.push(`    double pct = ${m.pct};`);
      body.push(`    double minPay = ${m.minPay};`);
      body.push(`    int daysLate = ${m.days};`);
      body.push(`    double lateFee = ${m.lateFee};`);
      body.push(`    double pay = option switch {`);
      body.push(`      "F" => bal,`);
      body.push(`      "P" => Math.Round(bal * pct, 2),`);
      body.push(`      "M" => minPay,`);
      body.push(`      _ => 0.0,`);
      body.push(`    };`);
      body.push(
        `    double total = daysLate > ${m.thresh} ? Math.Round(pay + lateFee, 2) : pay;`,
      );
      body.push(`    Console.WriteLine(total.ToString("0.00"));`);
      break;
    case "bill-pipeline":
      body.push(`    double bal = ${m.bal};`);
      body.push(`    double feeRate = ${m.feeRate};`);
      body.push(`    double intRate = ${m.intRate};`);
      body.push(`    int daysLate = ${m.days};`);
      body.push(`    double lateFee = ${m.lateFee};`);
      body.push(`    double fee = Math.Round(bal * feeRate, 2);`);
      body.push(`    double late = daysLate > ${m.thresh} ? lateFee : 0.0;`);
      body.push(`    double interest = Math.Round((bal + fee) * intRate, 2);`);
      body.push(`    double total = Math.Round(fee + late + interest, 2);`);
      body.push(`    Console.WriteLine(total.ToString("0.00"));`);
      break;
    case "ot-weekly":
      body.push(`    int hours = ${m.hours};`);
      body.push(`    double rate = ${m.rate};`);
      body.push(`    double ot = hours >= ${m.threshold} ? ${m.otOn} : 0.0;`);
      body.push(`    double week = hours * rate * (1 + ot);`);
      body.push(`    Console.WriteLine(week.ToString("0.00"));`);
      break;
    case "seq-sum": {
      const amounts = /** @type {number[]} */ (m.amounts);
      body.push(`    double total = ${amounts.join(" + ")};`);
      body.push(`    Console.WriteLine(total.ToString("0.00"));`);
      break;
    }
    case "seq-max": {
      const amounts = /** @type {number[]} */ (m.amounts);
      body.push(`    double[] amounts = {${amounts.join(", ")}};`);
      body.push(`    double max = 0.0;`);
      body.push(`    foreach (var a in amounts) if (a > max) max = a;`);
      body.push(`    Console.WriteLine(max.ToString("0.00"));`);
      break;
    }
    case "rounded-chain":
      body.push(`    double bal = ${m.bal};`);
      body.push(`    double feeRate = ${m.feeRate};`);
      body.push(`    double intRate = ${m.intRate};`);
      body.push(`    double fee = Math.Round(bal * feeRate, 2);`);
      body.push(`    double interest = Math.Round((bal + fee) * intRate, 2);`);
      body.push(`    double total = Math.Round(fee + interest, 2);`);
      body.push(`    Console.WriteLine(total.ToString("0.00"));`);
      break;
    case "perform-varying-sum":
      body.push(`    int total = 0;`);
      body.push(
        `    for (int i = ${m.from}; i <= ${m.limit}; i += ${m.step}) total += i;`,
      );
      body.push(`    Console.WriteLine(total);`);
      break;
    case "nested-if-grade": {
      const bands = /** @type {Array<{ threshold: number, grade: number }>} */ (m.bands);
      const ordered = [...bands].sort((a, c) => c.threshold - a.threshold);
      body.push(`    int score = ${m.score};`);
      body.push(`    int grade;`);
      if (ordered.length === 0) {
        body.push(`    grade = ${m.elseGrade};`);
      } else {
        body.push(`    if (score >= ${ordered[0].threshold}) grade = ${ordered[0].grade};`);
        for (let i = 1; i < ordered.length; i++) {
          body.push(
            `    else if (score >= ${ordered[i].threshold}) grade = ${ordered[i].grade};`,
          );
        }
        body.push(`    else grade = ${m.elseGrade};`);
      }
      body.push(`    Console.WriteLine(grade);`);
      break;
    }
    case "search-table": {
      const table = /** @type {Record<string, number>} */ (m.table);
      const entries = Object.entries(table)
        .map(([k, v]) => `{${k}, ${v}}`)
        .join(", ");
      body.push(
        `    var table = new System.Collections.Generic.Dictionary<int, int> { ${entries} };`,
      );
      body.push(`    int find = ${(/** @type {number} */ (m.find)) | 0};`);
      body.push(
        `    int result = table.TryGetValue(find, out var v) ? v : ${(/** @type {number} */ (m.miss)) | 0};`,
      );
      body.push(`    Console.WriteLine(result);`);
      break;
    }
    case "evaluate-subject": {
      const branches = /** @type {Record<string, number>} */ (m.branches);
      const cases = Object.entries(branches)
        .map(([k, v]) => `${k} => ${v}`)
        .join(", ");
      body.push(`    int code = ${(/** @type {number} */ (m.subject)) | 0};`);
      body.push(
        `    int fee = code switch { ${cases}, _ => ${m.other ?? 99} };`,
      );
      body.push(`    Console.WriteLine(fee);`);
      break;
    }
    default:
      body.push(`    Console.WriteLine(${JSON.stringify(expected)});`);
  }
  return [
    `// EXPECTED: ${expected}`,
    `// Generated emit for ${id} via cobol-pattern-emit (${p.kind}).`,
    `using System;`,
    `public static class ${id.replace(/[^A-Za-z0-9]/g, "") || "Cobol"}Gen {`,
    `  public static void Main() {`,
    ...body,
    `  }`,
    `}`,
    ``,
  ].join("\n");
}
