/**
 * TraceCorpus schema — what the PHP prelude writes and the Node tooling reads.
 *
 * Every trace file on disk is NDJSON: one JSON object per line. Each object is
 * a {@link TraceEvent}. The first line of every trace file MUST be a
 * {@link TraceHeader}; the last line MUST be a {@link TraceFooter}. Everything
 * between is a sequence of {@link TraceBodyEvent}s.
 *
 * The schema is versioned. The PHP prelude and the Node reader both assert
 * their declared version matches {@link SCHEMA_VERSION}; on mismatch we refuse
 * to proceed rather than silently drift.
 *
 * Redaction: the prelude applies the configured redaction rules before writing
 * any event to disk. There is no "raw" version of a trace; once written, a
 * trace is always safe to share to whatever degree the config specified.
 */

export const SCHEMA_VERSION = "1.0.0" as const;

export type RedactionKind =
  | "drop" // field is omitted entirely
  | "hash" // replaced with `sha256:<hex prefix>`
  | "mask"; // replaced with a constant sentinel like "***REDACTED***"

export interface RedactionRecord {
  readonly path: string; // dotted path, e.g. "request.post.password"
  readonly kind: RedactionKind;
}

export interface TraceHeader {
  readonly type: "header";
  readonly schemaVersion: typeof SCHEMA_VERSION;
  readonly traceId: string; // uuid v4
  readonly startedAt: string; // ISO 8601
  readonly php: { readonly version: string; readonly sapi: string };
  readonly redaction: {
    readonly configHash: string; // sha256 of the redaction config at capture time
    readonly rules: ReadonlyArray<RedactionRecord>;
  };
}

export interface HttpRequestEvent {
  readonly type: "http.request";
  readonly method: string;
  readonly path: string;
  readonly query: Readonly<Record<string, string>>;
  readonly headers: Readonly<Record<string, string>>;
  readonly cookies: Readonly<Record<string, string>>;
  readonly post: Readonly<Record<string, unknown>>;
  readonly rawBody: string | null;
  readonly session: Readonly<Record<string, unknown>>; // session state pre-handler
}

export interface HttpResponseEvent {
  readonly type: "http.response";
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string; // may be mask-redacted if config requires
  readonly bodyTruncated: boolean;
  readonly session: Readonly<Record<string, unknown>>; // session state post-handler
}

export interface SqlQueryEvent {
  readonly type: "sql.query";
  readonly driver: "pdo" | "mysqli" | "mysql" | "sqlite" | "unknown";
  readonly sql: string;
  readonly params: ReadonlyArray<unknown>;
  readonly rowCount: number;
  readonly rowShape: ReadonlyArray<{ readonly name: string; readonly typeTag: string }>;
  /** Present for SELECT-shaped queries when the PHP recorder captured rows. */
  readonly rows?: ReadonlyArray<Readonly<Record<string, unknown>>>;
  /** True when `rows` omits tail rows beyond the recorder cap. */
  readonly rowsTruncated?: boolean;
  readonly durationUs: number;
  readonly origin: { readonly file: string; readonly line: number };
}

export interface HeaderCallEvent {
  readonly type: "php.header";
  readonly header: string; // raw argument to header()
  readonly replace: boolean;
  readonly httpResponseCode: number | null;
  readonly origin: { readonly file: string; readonly line: number };
}

export interface SetCookieEvent {
  readonly type: "php.setcookie";
  readonly name: string;
  readonly value: string; // may be redacted
  readonly expires: number;
  readonly path: string;
  readonly domain: string;
  readonly secure: boolean;
  readonly httponly: boolean;
  readonly samesite: string | null;
  readonly origin: { readonly file: string; readonly line: number };
}

export interface ExitEvent {
  readonly type: "php.exit";
  readonly status: number | string | null;
  readonly origin: { readonly file: string; readonly line: number };
}

export interface EchoEvent {
  readonly type: "php.echo";
  readonly size: number; // number of bytes written
  readonly origin: { readonly file: string; readonly line: number };
  // NOTE: we don't store each echo's contents inline — the full body appears in
  // http.response. This event exists so ingest can correlate dynamic template
  // output with source positions.
}

export interface TimeReadEvent {
  readonly type: "php.time";
  readonly fn: "time" | "microtime" | "date" | "gmdate";
  readonly valueMs: number;
  readonly origin: { readonly file: string; readonly line: number };
}

export interface RandomReadEvent {
  readonly type: "php.random";
  readonly fn: "rand" | "mt_rand" | "random_int" | "random_bytes" | "uniqid";
  readonly bytes: number; // length of produced value
  readonly origin: { readonly file: string; readonly line: number };
}

export interface HoleObservedEvent {
  readonly type: "observe.hole";
  readonly reason: string; // machine-readable tag
  readonly detail: string; // human-readable summary
  readonly origin: { readonly file: string; readonly line: number };
}

/** Outbound `http://` / `https://` fetch recorded via the PHP stream wrapper. */
export interface HttpOutboundEvent {
  readonly type: "http.outbound";
  readonly method: string;
  readonly url: string;
  readonly status: number;
  readonly responseBytes: number;
  readonly durationUs: number;
  readonly origin: { readonly file: string; readonly line: number };
}

/** Recorded when apps use `Chrysalis\Oracle\Mail::send` instead of raw `mail()`. */
export interface MailSendEvent {
  readonly type: "mail.send";
  readonly to: string;
  readonly subject: string;
  readonly bodyBytes: number;
  readonly origin: { readonly file: string; readonly line: number };
}

export type TraceBodyEvent =
  | HttpRequestEvent
  | HttpResponseEvent
  | SqlQueryEvent
  | HeaderCallEvent
  | SetCookieEvent
  | ExitEvent
  | EchoEvent
  | TimeReadEvent
  | RandomReadEvent
  | HoleObservedEvent
  | HttpOutboundEvent
  | MailSendEvent;

export interface TraceFooter {
  readonly type: "footer";
  readonly endedAt: string;
  readonly durationUs: number;
  readonly eventCount: number;
  readonly exitStatus: number;
}

export type TraceEvent = TraceHeader | TraceBodyEvent | TraceFooter;

export interface Trace {
  readonly header: TraceHeader;
  readonly events: ReadonlyArray<TraceBodyEvent>;
  readonly footer: TraceFooter;
}

export interface TraceCorpus {
  readonly id: string;
  readonly createdAt: string;
  readonly root: string;
  readonly traces: ReadonlyArray<Trace>;
}

/**
 * Validator — throws with a path-aware error for malformed input. Designed for
 * clear messages when a future version of the PHP prelude drifts from the Node
 * reader before we catch it in CI.
 */
export class SchemaError extends Error {
  constructor(
    public readonly path: string,
    public readonly reason: string,
    public readonly received: unknown,
  ) {
    super(`trace schema: ${path}: ${reason} (got ${JSON.stringify(received)?.slice(0, 120)})`);
    this.name = "SchemaError";
  }
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function requireString(v: unknown, path: string): string {
  if (typeof v !== "string") throw new SchemaError(path, "expected string", v);
  return v;
}

function requireNumber(v: unknown, path: string): number {
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw new SchemaError(path, "expected finite number", v);
  }
  return v;
}

function requireBool(v: unknown, path: string): boolean {
  if (typeof v !== "boolean") throw new SchemaError(path, "expected boolean", v);
  return v;
}

function requireObject(v: unknown, path: string): Record<string, unknown> {
  if (!isObj(v)) throw new SchemaError(path, "expected object", v);
  return v;
}

function parseSqlJsonValue(v: unknown, path: string): unknown {
  if (v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    return v;
  }
  if (Array.isArray(v)) {
    return v.map((x, i) => parseSqlJsonValue(x, `${path}[${i}]`));
  }
  if (isObj(v)) {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) {
      out[k] = parseSqlJsonValue(val, `${path}.${k}`);
    }
    return out;
  }
  throw new SchemaError(path, "unsupported sql.rows value", v);
}

function parseSqlRowObject(v: unknown, path: string): Readonly<Record<string, unknown>> {
  const obj = requireObject(v, path);
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(obj)) {
    out[k] = parseSqlJsonValue(val, `${path}.${k}`);
  }
  return out;
}

function requireArray(v: unknown, path: string): unknown[] {
  if (!Array.isArray(v)) throw new SchemaError(path, "expected array", v);
  return v;
}

function requireStringMap(v: unknown, path: string): Record<string, string> {
  const o = requireObject(v, path);
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(o)) {
    if (typeof val !== "string") {
      throw new SchemaError(`${path}.${k}`, "expected string value", val);
    }
    out[k] = val;
  }
  return out;
}

function requireOrigin(v: unknown, path: string): { file: string; line: number } {
  const o = requireObject(v, path);
  return {
    file: requireString(o["file"], `${path}.file`),
    line: requireNumber(o["line"], `${path}.line`),
  };
}

export function parseEvent(raw: unknown): TraceEvent {
  const o = requireObject(raw, "<event>");
  const t = requireString(o["type"], "type");
  switch (t) {
    case "header": {
      const schemaVersion = requireString(o["schemaVersion"], "schemaVersion");
      if (schemaVersion !== SCHEMA_VERSION) {
        throw new SchemaError(
          "schemaVersion",
          `unsupported version: expected ${SCHEMA_VERSION}`,
          schemaVersion,
        );
      }
      const php = requireObject(o["php"], "php");
      const redaction = requireObject(o["redaction"], "redaction");
      const rulesRaw = requireArray(redaction["rules"], "redaction.rules");
      const rules: RedactionRecord[] = rulesRaw.map((r, i) => {
        const ro = requireObject(r, `redaction.rules[${i}]`);
        const kind = requireString(ro["kind"], `redaction.rules[${i}].kind`);
        if (kind !== "drop" && kind !== "hash" && kind !== "mask") {
          throw new SchemaError(`redaction.rules[${i}].kind`, "invalid kind", kind);
        }
        return {
          path: requireString(ro["path"], `redaction.rules[${i}].path`),
          kind,
        };
      });
      return {
        type: "header",
        schemaVersion: SCHEMA_VERSION,
        traceId: requireString(o["traceId"], "traceId"),
        startedAt: requireString(o["startedAt"], "startedAt"),
        php: {
          version: requireString(php["version"], "php.version"),
          sapi: requireString(php["sapi"], "php.sapi"),
        },
        redaction: {
          configHash: requireString(redaction["configHash"], "redaction.configHash"),
          rules,
        },
      };
    }
    case "footer":
      return {
        type: "footer",
        endedAt: requireString(o["endedAt"], "endedAt"),
        durationUs: requireNumber(o["durationUs"], "durationUs"),
        eventCount: requireNumber(o["eventCount"], "eventCount"),
        exitStatus: requireNumber(o["exitStatus"], "exitStatus"),
      };
    case "http.request":
      return {
        type: "http.request",
        method: requireString(o["method"], "method"),
        path: requireString(o["path"], "path"),
        query: requireStringMap(o["query"], "query"),
        headers: requireStringMap(o["headers"], "headers"),
        cookies: requireStringMap(o["cookies"], "cookies"),
        post: requireObject(o["post"], "post"),
        rawBody: o["rawBody"] == null ? null : requireString(o["rawBody"], "rawBody"),
        session: requireObject(o["session"], "session"),
      };
    case "http.response":
      return {
        type: "http.response",
        status: requireNumber(o["status"], "status"),
        headers: requireStringMap(o["headers"], "headers"),
        body: requireString(o["body"], "body"),
        bodyTruncated: requireBool(o["bodyTruncated"], "bodyTruncated"),
        session: requireObject(o["session"], "session"),
      };
    case "sql.query": {
      const driver = requireString(o["driver"], "driver");
      if (!["pdo", "mysqli", "mysql", "sqlite", "unknown"].includes(driver)) {
        throw new SchemaError("driver", "invalid driver", driver);
      }
      const shapeRaw = requireArray(o["rowShape"], "rowShape");
      const rowShape = shapeRaw.map((s, i) => {
        const so = requireObject(s, `rowShape[${i}]`);
        return {
          name: requireString(so["name"], `rowShape[${i}].name`),
          typeTag: requireString(so["typeTag"], `rowShape[${i}].typeTag`),
        };
      });
      const rowsRaw = o["rows"];
      let rows: ReadonlyArray<Readonly<Record<string, unknown>>> | undefined;
      if (rowsRaw !== undefined) {
        const ra = requireArray(rowsRaw, "rows");
        rows = ra.map((row, i) => parseSqlRowObject(row, `rows[${i}]`));
      }
      const rowsTruncated =
        o["rowsTruncated"] === undefined ? undefined : requireBool(o["rowsTruncated"], "rowsTruncated");
      const base = {
        type: "sql.query" as const,
        driver: driver as SqlQueryEvent["driver"],
        sql: requireString(o["sql"], "sql"),
        params: requireArray(o["params"], "params"),
        rowCount: requireNumber(o["rowCount"], "rowCount"),
        rowShape,
        durationUs: requireNumber(o["durationUs"], "durationUs"),
        origin: requireOrigin(o["origin"], "origin"),
      };
      if (rows === undefined && rowsTruncated === undefined) {
        return base;
      }
      return {
        ...base,
        ...(rows !== undefined ? { rows } : {}),
        ...(rowsTruncated !== undefined ? { rowsTruncated } : {}),
      };
    }
    case "php.header":
      return {
        type: "php.header",
        header: requireString(o["header"], "header"),
        replace: requireBool(o["replace"], "replace"),
        httpResponseCode:
          o["httpResponseCode"] == null
            ? null
            : requireNumber(o["httpResponseCode"], "httpResponseCode"),
        origin: requireOrigin(o["origin"], "origin"),
      };
    case "php.setcookie":
      return {
        type: "php.setcookie",
        name: requireString(o["name"], "name"),
        value: requireString(o["value"], "value"),
        expires: requireNumber(o["expires"], "expires"),
        path: requireString(o["path"], "path"),
        domain: requireString(o["domain"], "domain"),
        secure: requireBool(o["secure"], "secure"),
        httponly: requireBool(o["httponly"], "httponly"),
        samesite: o["samesite"] == null ? null : requireString(o["samesite"], "samesite"),
        origin: requireOrigin(o["origin"], "origin"),
      };
    case "php.exit": {
      const s = o["status"];
      return {
        type: "php.exit",
        status:
          s == null
            ? null
            : typeof s === "number"
              ? s
              : typeof s === "string"
                ? s
                : (() => {
                    throw new SchemaError("status", "expected number, string, or null", s);
                  })(),
        origin: requireOrigin(o["origin"], "origin"),
      };
    }
    case "php.echo":
      return {
        type: "php.echo",
        size: requireNumber(o["size"], "size"),
        origin: requireOrigin(o["origin"], "origin"),
      };
    case "php.time": {
      const fn = requireString(o["fn"], "fn");
      if (!["time", "microtime", "date", "gmdate"].includes(fn)) {
        throw new SchemaError("fn", "invalid time fn", fn);
      }
      return {
        type: "php.time",
        fn: fn as TimeReadEvent["fn"],
        valueMs: requireNumber(o["valueMs"], "valueMs"),
        origin: requireOrigin(o["origin"], "origin"),
      };
    }
    case "php.random": {
      const fn = requireString(o["fn"], "fn");
      if (!["rand", "mt_rand", "random_int", "random_bytes", "uniqid"].includes(fn)) {
        throw new SchemaError("fn", "invalid random fn", fn);
      }
      return {
        type: "php.random",
        fn: fn as RandomReadEvent["fn"],
        bytes: requireNumber(o["bytes"], "bytes"),
        origin: requireOrigin(o["origin"], "origin"),
      };
    }
    case "observe.hole":
      return {
        type: "observe.hole",
        reason: requireString(o["reason"], "reason"),
        detail: requireString(o["detail"], "detail"),
        origin: requireOrigin(o["origin"], "origin"),
      };
    case "http.outbound":
      return {
        type: "http.outbound",
        method: requireString(o["method"], "method"),
        url: requireString(o["url"], "url"),
        status: requireNumber(o["status"], "status"),
        responseBytes: requireNumber(o["responseBytes"], "responseBytes"),
        durationUs: requireNumber(o["durationUs"], "durationUs"),
        origin: requireOrigin(o["origin"], "origin"),
      };
    case "mail.send":
      return {
        type: "mail.send",
        to: requireString(o["to"], "to"),
        subject: requireString(o["subject"], "subject"),
        bodyBytes: requireNumber(o["bodyBytes"], "bodyBytes"),
        origin: requireOrigin(o["origin"], "origin"),
      };
    default:
      throw new SchemaError("type", `unknown event type`, t);
  }
}
