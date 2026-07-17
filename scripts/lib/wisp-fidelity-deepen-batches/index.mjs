/**
 * Harness-backed deepen batches. Legacy n10–n10f remain frozen scripts.
 */
import * as n10g from "./n10g.mjs";
import * as n10h from "./n10h.mjs";
import * as n10i from "./n10i.mjs";
import * as n10j from "./n10j.mjs";
import * as n10k from "./n10k.mjs";
import * as n10l from "./n10l.mjs";
import * as n10m from "./n10m.mjs";
import * as n10n from "./n10n.mjs";
import * as n10o from "./n10o.mjs";
import * as n10p from "./n10p.mjs";
import * as n10q from "./n10q.mjs";
import * as n10r from "./n10r.mjs";
import * as n10s from "./n10s.mjs";
import * as n10t from "./n10t.mjs";
import * as n10u from "./n10u.mjs";
import * as n10v from "./n10v.mjs";
import * as n10w from "./n10w.mjs";

/** @type {Record<string, { BATCH_ID: string, KIND: string, NEED_ADMIN: boolean, NOTE: string, PASSES: unknown[], REFRESH_PATHS: string[], runProbes: Function, legacyScript?: string }>} */
export const HARNESS_BATCHES = {
  n10g,
  n10h,
  n10i,
  n10j,
  n10k,
  n10l,
  n10m,
  n10n,
  n10o,
  n10p,
  n10q,
  n10r,
  n10s,
  n10t,
  n10u,
  n10v,
  n10w,
};

/** Frozen pre-harness runners (spawn only — do not rewrite). */
export const LEGACY_BATCHES = {
  deepen: "scripts/lib/wisp-fidelity-deepen.mjs",
  deepen2: "scripts/lib/wisp-fidelity-deepen2.mjs",
  n10: "scripts/lib/wisp-fidelity-deepen-n10.mjs",
  n10b: "scripts/lib/wisp-fidelity-deepen-n10b.mjs",
  n10c: "scripts/lib/wisp-fidelity-deepen-n10c.mjs",
  n10d: "scripts/lib/wisp-fidelity-deepen-n10d.mjs",
  n10e: "scripts/lib/wisp-fidelity-deepen-n10e.mjs",
  n10f: "scripts/lib/wisp-fidelity-deepen-n10f.mjs",
};

export function listBatches() {
  return {
    harness: Object.keys(HARNESS_BATCHES),
    legacy: Object.keys(LEGACY_BATCHES),
  };
}
