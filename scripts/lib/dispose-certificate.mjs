/**
 * Dispose Plane certificate (G10116 deepen / G10118 pack).
 * Agent-facing artifact: propose freely; merge only when certificate.ok.
 */
export const DISPOSE_CERTIFICATE_KIND = "chrysalis.dispose.certificate";
export const DISPOSE_CERTIFICATE_SCHEMA_VERSION = 1;

/**
 * @param {{
 *   gateOk?: boolean,
 *   verifyCorrectness?: number,
 *   holeCount?: number,
 *   unverified?: boolean,
 *   minCorrectness?: number,
 *   maxHoles?: number,
 *   evaluateVerifyGatePolicy?: (input: object) => { ok: boolean, reasons: string[] },
 * }} input
 */
export function buildDisposeCertificate(input = {}) {
  const evaluate =
    input.evaluateVerifyGatePolicy ??
    ((i) => {
      const reasons = [];
      const minCorrectness = i.minCorrectness ?? 1;
      const maxHoles = i.maxHoles ?? 0;
      if (i.unverified === true) return { ok: false, reasons: ["unverified:explicit"] };
      if (i.gateOk !== true) reasons.push("gate:not-ok");
      if (typeof i.verifyCorrectness === "number" && i.verifyCorrectness < minCorrectness) {
        reasons.push(`correctness:${i.verifyCorrectness}<${minCorrectness}`);
      }
      if (typeof i.holeCount === "number" && i.holeCount > maxHoles) {
        reasons.push(`holes:${i.holeCount}>${maxHoles}`);
      }
      const ok =
        i.gateOk === true &&
        (i.verifyCorrectness === undefined || i.verifyCorrectness >= minCorrectness) &&
        (i.holeCount === undefined || i.holeCount <= maxHoles);
      return { ok, reasons };
    });

  const gate = evaluate({
    gateOk: input.gateOk,
    verifyCorrectness: input.verifyCorrectness,
    holeCount: input.holeCount,
    unverified: input.unverified,
    minCorrectness: input.minCorrectness,
    maxHoles: input.maxHoles,
  });

  return {
    kind: DISPOSE_CERTIFICATE_KIND,
    schemaVersion: DISPOSE_CERTIFICATE_SCHEMA_VERSION,
    ok: gate.ok === true,
    reasons: gate.reasons ?? [],
    gateOk: input.gateOk === true,
    verifyCorrectness: input.verifyCorrectness ?? null,
    holeCount: input.holeCount ?? null,
    unverified: input.unverified === true,
    issuedAt: new Date().toISOString(),
  };
}

/**
 * Assert a dispose certificate is present and green before merge/apply.
 * @param {unknown} cert
 */
export function assertDisposeCertificate(cert) {
  if (!cert || typeof cert !== "object") {
    return { ok: false, reasons: ["cert:missing"] };
  }
  const c = /** @type {Record<string, unknown>} */ (cert);
  if (c.kind !== DISPOSE_CERTIFICATE_KIND) {
    return { ok: false, reasons: ["cert:invalid-kind"] };
  }
  if (c.schemaVersion !== DISPOSE_CERTIFICATE_SCHEMA_VERSION) {
    return { ok: false, reasons: ["cert:schema-drift"] };
  }
  if (c.unverified === true) {
    return { ok: false, reasons: ["unverified:explicit"] };
  }
  if (c.ok !== true) {
    return { ok: false, reasons: Array.isArray(c.reasons) ? c.reasons.map(String) : ["cert:not-ok"] };
  }
  return { ok: true, reasons: [] };
}

/**
 * Merge/apply requires dispose certificate + explicit confirm.
 * @param {{ certificate: unknown, confirmApply: boolean }} input
 */
export function evaluateDisposeApplyPolicy(input) {
  const cert = assertDisposeCertificate(input.certificate);
  const reasons = [...cert.reasons];
  if (input.confirmApply !== true) reasons.push("apply:not-confirmed");
  const ok = cert.ok === true && input.confirmApply === true;
  return { ok, canApply: cert.ok === true, reasons };
}
