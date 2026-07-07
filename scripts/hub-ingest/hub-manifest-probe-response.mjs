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
    return {
      status: 500,
      body: "hub:unsupported-body-shape",
      contentType: "text/plain; charset=utf-8",
      hole: true,
    };
  }
  return {
    status: 500,
    body: "hub:unsupported-body",
    contentType: "text/plain; charset=utf-8",
    hole: true,
  };
}
