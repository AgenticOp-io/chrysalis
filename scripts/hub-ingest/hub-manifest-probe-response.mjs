/**
 * Lower hub handler bodies to probe response records for asset-route manifests.
 */

/** @typedef {{ status: number, body: string, contentType: string, hole: boolean }} ManifestProbeResponse */

/**
 * @param {unknown} value
 */
function jsonStringify(value) {
  return JSON.stringify(value);
}

/**
 * @param {{ t: string, value?: unknown, source?: string, name?: string, default?: unknown, entries?: Array<{ key: string, value: object }> }} v
 * @returns {unknown | null}
 */
function structuredProbeValue(v) {
  if (!v || typeof v !== "object" || !("t" in v)) return null;
  if (v.t === "lit") return v.value;
  if (v.t === "ref") {
    if (Object.prototype.hasOwnProperty.call(v, "default")) return v.default;
    // Concrete probe placeholder for path/query refs (oracle uses concreteProbePath).
    return v.source === "path" ? "1" : "";
  }
  if (v.t === "obj") {
    /** @type {Record<string, unknown>} */
    const obj = {};
    for (const e of v.entries ?? []) {
      const inner = structuredProbeValue(/** @type {typeof v} */ (e.value));
      if (inner === null) return null;
      obj[e.key] = inner;
    }
    return obj;
  }
  return null;
}

/**
 * @param {{ kind: string, reason?: string, value?: unknown }} body
 * @param {string} routePath
 * @returns {ManifestProbeResponse}
 */
export function manifestProbeResponse(body, routePath) {
  void routePath;
  if (body.kind === "hole") {
    return {
      status: 500,
      body: String(body.reason ?? "hub:hole"),
      contentType: "text/plain; charset=utf-8",
      hole: true,
    };
  }
  if (body.kind === "literal") {
    const v = body.value;
    if (v !== null && typeof v === "object") {
      return {
        status: 200,
        body: jsonStringify(v),
        contentType: "application/json",
        hole: false,
      };
    }
    if (typeof v === "boolean") {
      return {
        status: 200,
        body: String(v),
        contentType: "text/plain; charset=utf-8",
        hole: false,
      };
    }
    if (typeof v === "number") {
      return {
        status: 200,
        body: String(v),
        contentType: "text/plain; charset=utf-8",
        hole: false,
      };
    }
    return {
      status: 200,
      body: String(v),
      contentType: "text/plain; charset=utf-8",
      hole: false,
    };
  }
  if (body.kind === "structured") {
    const v = structuredProbeValue(/** @type {{ t: string }} */ (body.value));
    if (v === null) {
      return {
        status: 500,
        body: "hub:unsupported-body-shape",
        contentType: "text/plain; charset=utf-8",
        hole: true,
      };
    }
    if (v !== null && typeof v === "object") {
      return {
        status: 200,
        body: jsonStringify(v),
        contentType: "application/json",
        hole: false,
      };
    }
    return {
      status: 200,
      body: String(v),
      contentType: "text/plain; charset=utf-8",
      hole: false,
    };
  }
  return {
    status: 500,
    body: "hub:unsupported-body",
    contentType: "text/plain; charset=utf-8",
    hole: true,
  };
}
