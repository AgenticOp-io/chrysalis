/**
 * Shared helpers for contract → CWL importers (OpenAPI, HAR).
 */

/** IDENT-safe names only (no invent rename for hyphenated headers). */
export function isIdentSafeName(name) {
  return typeof name === "string" && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

/**
 * HAR hop-by-hop / transport noise skipped for both request and response headers.
 * Match `parseHarRequestHeaders` policy — never invent substitutes.
 */
export const HAR_SKIP_HEADER_NAMES = new Set(["host", "content-length", "connection"]);

/** Scalar value suitable as a CWL response-header default (no invent). */
export function isScalarHeaderValue(v) {
  return v === null || ["string", "number", "boolean"].includes(typeof v);
}

/** @param {unknown} v — true when a value renders + re-parses as a flat CWL literal. */
export function isFlatRenderable(v) {
  if (v === null) return true;
  const t = typeof v;
  if (t === "string" || t === "number" || t === "boolean") return true;
  if (Array.isArray(v)) return v.every((x) => x === null || ["string", "number", "boolean"].includes(typeof x));
  if (t === "object") {
    return Object.entries(v).every(
      ([k, val]) =>
        /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k) &&
        (val === null || ["string", "number", "boolean"].includes(typeof val)),
    );
  }
  return false;
}

/** @param {unknown} raw @param {string} method @param {string} cwlPath */
export function sanitizeHandlerName(raw, method, cwlPath) {
  let base = typeof raw === "string" && raw.trim() ? raw.trim() : `${method}_${cwlPath}`;
  base = base.replace(/[^a-zA-Z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  if (!base) base = `${method.toLowerCase()}_route`;
  if (/^[0-9]/.test(base)) base = `h_${base}`;
  return base;
}

/**
 * Attach response body/value or hole to a partial route object.
 * @param {object} route
 * @param {number} status
 * @param {string | undefined} contentType
 * @param {unknown} bodyValue
 * @param {string} noBodyReason
 * @param {string} nestedBodyReason
 */
export function attachContractResponseBody(route, status, contentType, bodyValue, noBodyReason, nestedBodyReason) {
  if (contentType) route.contentType = contentType;
  if (status === 204 || status === 304) {
    route.value = { t: "lit", value: "" };
    return route;
  }
  if (bodyValue === undefined || bodyValue === null) {
    route.holeReason = noBodyReason;
    return route;
  }
  if (isFlatRenderable(bodyValue)) {
    route.value = { t: "lit", value: bodyValue };
    return route;
  }
  route.holeReason = nestedBodyReason;
  return route;
}
