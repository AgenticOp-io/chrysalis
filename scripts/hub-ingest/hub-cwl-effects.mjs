/**
 * CWL declared effects → WebIR Effect[] (RFC-0007).
 */

/** @param {string[]} declared */
export function cwlEffectsToWebir(declared) {
  /** @type {import('@chrysalis/webir').Effect[]} */
  const out = [];
  for (const raw of declared) {
    const t = raw.trim().toLowerCase();
    if (!t || t === "none") continue;
    if (t === "io") {
      out.push({ kind: "http.fetch" });
      continue;
    }
    if (t === "db.read") {
      out.push({ kind: "db.read", table: "*" });
      continue;
    }
    if (t === "db.write") {
      out.push({ kind: "db.write", table: "*" });
      continue;
    }
    if (
      t === "session.read" ||
      t === "session.write" ||
      t === "time.now" ||
      t === "random" ||
      t === "mail.send"
    ) {
      out.push({ kind: t });
    }
  }
  return out;
}
