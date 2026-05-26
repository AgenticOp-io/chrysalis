/**
 * Minimal HTTP trace recorder (hub / verify lane).
 */
export const SCHEMA_VERSION = "1.0.0";

const REDACT = new Set(["authorization", "cookie", "set-cookie"]);

function isoNow() {
  return new Date().toISOString();
}

function redactHeaders(headers) {
  const out = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k] = REDACT.has(k.toLowerCase()) ? "[REDACTED]" : v;
  }
  return out;
}

export class Recorder {
  constructor() {
    this._events = [];
    this._traceId = "";
    this._startedAt = "";
    this._active = false;
  }

  onRequestStart(method, path, { headers = {}, query = {} } = {}) {
    this._active = true;
    this._traceId = crypto.randomUUID();
    this._startedAt = isoNow();
    this._events.push({
      type: "http.request",
      method: method.toUpperCase(),
      path,
      query,
      headers: redactHeaders(headers),
      cookies: {},
      post: {},
      rawBody: null,
      session: {},
    });
  }

  onResponse(status, body, { headers = {} } = {}) {
    if (!this._active) return;
    this._events.push({
      type: "http.response",
      status,
      headers: redactHeaders(headers),
      body,
      bodyTruncated: false,
      session: {},
    });
  }

  buildTrace() {
    const ended = isoNow();
    return {
      header: {
        type: "header",
        schemaVersion: SCHEMA_VERSION,
        traceId: this._traceId,
        startedAt: this._startedAt,
        php: { version: "hub-node", sapi: "oracle-node" },
        redaction: { configHash: "oracle-node-min", rules: [] },
      },
      events: this._events,
      footer: {
        type: "footer",
        endedAt: ended,
        durationUs: 1000,
        eventCount: this._events.length,
        exitStatus: 0,
      },
    };
  }

  async writeNdjson(path) {
    const trace = this.buildTrace();
    const { writeFile } = await import("node:fs/promises");
    const lines = [trace.header, ...trace.events, trace.footer].map((o) => JSON.stringify(o)).join("\n");
    await writeFile(path, `${lines}\n`, "utf8");
  }
}
