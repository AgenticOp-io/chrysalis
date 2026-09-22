/**
 * CWL declared effects → WebIR Effect[] (RFC-0007).
 */
import { HUB_T } from "./hub-t.mjs";

/**
 * @param {string} raw
 * @returns {{ kind: "session.mint" | "session.revoke", cookie: string | null, attrs: { httponly?: boolean, secure?: boolean, path?: string, samesite?: string } | null } | null}
 */
export function parseSessionCookieEffect(raw) {
  const t = String(raw ?? "").trim().toLowerCase();
  const m = /^(session\.(?:mint|revoke))(?:\s+cookie\s+([a-zA-Z_][a-zA-Z0-9_]*)((?:\s+\S+)*))?$/.exec(t);
  if (!m) return null;
  const cookie = m[2] ?? null;
  const rest = String(m[3] ?? "").trim();
  if (!cookie) {
    return {
      kind: /** @type {"session.mint" | "session.revoke"} */ (m[1]),
      cookie: null,
      attrs: null,
    };
  }
  if (!rest) {
    return {
      kind: /** @type {"session.mint" | "session.revoke"} */ (m[1]),
      cookie,
      attrs: null,
    };
  }
  const attrs = parseSessionCookieAttrs(rest);
  if (!attrs) return null;
  return {
    kind: /** @type {"session.mint" | "session.revoke"} */ (m[1]),
    cookie,
    attrs,
  };
}

/**
 * Cookie **policy** attrs only — never a token value (tip 1.0.43).
 * @param {string} rest
 * @returns {{ httponly?: boolean, secure?: boolean, path?: string, samesite?: string } | null}
 */
export function parseSessionCookieAttrs(rest) {
  const tokens = String(rest ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  /** @type {{ httponly?: boolean, secure?: boolean, path?: string, samesite?: string }} */
  const attrs = {};
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok === "httponly") {
      attrs.httponly = true;
      continue;
    }
    if (tok === "secure") {
      attrs.secure = true;
      continue;
    }
    if (tok === "path") {
      const path = tokens[++i];
      if (!path || !/^\/[A-Za-z0-9_./-]*$/.test(path)) return null;
      attrs.path = path;
      continue;
    }
    if (tok === "samesite") {
      const ss = tokens[++i];
      if (!ss || !/^(lax|strict|none)$/.test(ss)) return null;
      attrs.samesite = ss;
      continue;
    }
    return null;
  }
  return Object.keys(attrs).length > 0 ? attrs : null;
}

/**
 * Canonical print order for session cookie attrs.
 * @param {{ httponly?: boolean, secure?: boolean, path?: string, samesite?: string }} attrs
 */
export function formatSessionCookieAttrs(attrs) {
  if (!attrs) return "";
  /** @type {string[]} */
  const parts = [];
  if (attrs.httponly) parts.push("httponly");
  if (attrs.secure) parts.push("secure");
  if (typeof attrs.path === "string") parts.push(`path ${attrs.path}`);
  if (typeof attrs.samesite === "string") parts.push(`samesite ${attrs.samesite}`);
  return parts.join(" ");
}

const CORS_METHOD_RE = /^(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/i;

/**
 * RFC-0020 deepen (tip 1.0.44 / 1.0.50): `cors.allow` with optional
 * `origin <url|*>` and/or `methods GET POST …`.
 * Bare form still means origin `*` — no invented host list or CORS engine.
 * @param {string} raw
 * @returns {{ origin: string, methods: string[] | null } | null}
 */
export function parseCorsAllowEffect(raw) {
  const src = String(raw ?? "").trim();
  const t = src.toLowerCase();
  if (t === "cors.allow") return { origin: "*", methods: null };
  if (!t.startsWith("cors.allow")) return null;
  let rest = src.slice("cors.allow".length).trim();
  if (!rest) return { origin: "*", methods: null };
  let origin = "*";
  /** @type {string[] | null} */
  let methods = null;
  while (rest) {
    const originM = /^origin\s+(\*|[a-z][a-z0-9+.-]*:\/\/[^\s]+)\s*/i.exec(rest);
    if (originM) {
      origin = originM[1] === "*" ? "*" : originM[1];
      rest = rest.slice(originM[0].length).trim();
      continue;
    }
    const methodsM = /^methods\s+(.+)$/i.exec(rest);
    if (methodsM) {
      const parts = methodsM[1].trim().split(/\s+/).filter(Boolean);
      if (parts.length === 0) return null;
      const normalized = [];
      for (const p of parts) {
        if (!CORS_METHOD_RE.test(p)) return null;
        normalized.push(p.toUpperCase());
      }
      methods = normalized;
      rest = "";
      continue;
    }
    return null;
  }
  return { origin, methods };
}

/**
 * RFC-0020 deepen (tip 1.0.49): `mail.send` or `mail.send template <name>`.
 * Names a host-owned template — never invents SMTP / message bodies.
 * @param {string} raw
 * @returns {{ template: string | null } | null}
 */
export function parseMailSendEffect(raw) {
  const t = String(raw ?? "").trim().toLowerCase();
  if (t === "mail.send") return { template: null };
  const m = /^mail\.send\s+template\s+([a-zA-Z_][a-zA-Z0-9_-]*)$/.exec(
    String(raw ?? "").trim(),
  );
  if (!m) return null;
  return { template: m[1] };
}

/**
 * RFC-0020 deepen (tip 1.0.51): `cache.max-age <seconds>`.
 * Declares Cache-Control max-age intent — host sets headers; CWL does not invent a CDN.
 * @param {string} raw
 * @returns {{ seconds: number } | null}
 */
export function parseCacheMaxAgeEffect(raw) {
  const t = String(raw ?? "").trim().toLowerCase();
  const m = /^cache\.max-age\s+(\d+)$/.exec(t);
  if (!m) return null;
  const seconds = Number(m[1]);
  if (!Number.isInteger(seconds) || seconds < 0 || seconds > 31_536_000) return null;
  return { seconds };
}

/**
 * RFC-0020 deepen (tip 1.0.45): `rate.limit` or `rate.limit rpm <n>`.
 * Declares a requests-per-minute budget — host enforces; CWL does not invent the limiter.
 * @param {string} raw
 * @returns {{ rpm: number | null } | null}
 */
export function parseRateLimitEffect(raw) {
  const t = String(raw ?? "").trim().toLowerCase();
  if (t === "rate.limit") return { rpm: null };
  const m = /^rate\.limit\s+rpm\s+(\d+)$/.exec(t);
  if (!m) return null;
  const rpm = Number(m[1]);
  if (!Number.isInteger(rpm) || rpm < 1 || rpm > 1_000_000) return null;
  return { rpm };
}

/**
 * RFC-0020 deepen (tip 1.0.46): `csrf.verify` or `csrf.verify cookie <name>`.
 * Names the CSRF cookie — never the token value.
 * @param {string} raw
 * @returns {{ cookie: string | null } | null}
 */
export function parseCsrfVerifyEffect(raw) {
  const t = String(raw ?? "").trim().toLowerCase();
  if (t === "csrf.verify") return { cookie: null };
  const m = /^csrf\.verify\s+cookie\s+([a-zA-Z_][a-zA-Z0-9_]*)$/.exec(t);
  if (!m) return null;
  return { cookie: m[1] };
}

/**
 * RFC-0007 / RFC-0020 deepen (tip 1.0.47): `auth.require` or `auth.require cookie <name>`.
 * Names the session cookie the host must see — never a token value.
 * @param {string} raw
 * @returns {{ cookie: string | null } | null}
 */
export function parseAuthRequireEffect(raw) {
  const t = String(raw ?? "").trim().toLowerCase();
  if (t === "auth.require") return { cookie: null };
  const m = /^auth\.require\s+cookie\s+([a-zA-Z_][a-zA-Z0-9_]*)$/.exec(t);
  if (!m) return null;
  return { cookie: m[1] };
}

/**
 * RFC-0020 deepen (tip 1.0.48): `db.read` / `db.write` or `db.read table <name>`.
 * Names the logical table — no SQL invented in CWL.
 * @param {string} raw
 * @returns {{ kind: "db.read" | "db.write", table: string | null } | null}
 */
export function parseDbEffect(raw) {
  const t = String(raw ?? "").trim().toLowerCase();
  const m = /^(db\.(?:read|write))(?:\s+table\s+([a-zA-Z_][a-zA-Z0-9_]*))?$/.exec(t);
  if (!m) return null;
  return {
    kind: /** @type {"db.read" | "db.write"} */ (m[1]),
    table: m[2] ?? null,
  };
}

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
    const dbFx = parseDbEffect(t);
    if (dbFx) {
      out.push({ kind: dbFx.kind, table: dbFx.table ?? "*" });
      continue;
    }
    if (t === "session.read" || t === "session.write" || t === "time.now" || t === "random") {
      out.push({ kind: t });
      continue;
    }
    const mailFx = parseMailSendEffect(t);
    if (mailFx) {
      out.push({ kind: "mail.send" });
      continue;
    }
    if (t === "auth.require") {
      out.push({ kind: "session.read" });
      continue;
    }
    const authReq = parseAuthRequireEffect(t);
    if (authReq) {
      out.push({ kind: "session.read" });
      continue;
    }
    // RFC-0032: credential/session intent declared in CWL; host owns hashing + store.
    if (t === "auth.verify") {
      out.push({ kind: "db.read", table: "*" });
      continue;
    }
    const sessionCookie = parseSessionCookieEffect(t);
    if (sessionCookie) {
      out.push({ kind: "session.write" });
      continue;
    }
    const corsFx = parseCorsAllowEffect(t);
    const rateFx = parseRateLimitEffect(t);
    const csrfFx = parseCsrfVerifyEffect(t);
    const cacheFx = parseCacheMaxAgeEffect(t);
    if (corsFx || csrfFx || rateFx || cacheFx) {
      out.push({ kind: "http.fetch" });
    }
  }
  return out;
}

function hubOrigin(file, line = 1) {
  return { file, line, column: 1 };
}

/**
 * Lower cookie policy attrs to `__object_literal` (name/flags only — never a token).
 * @param {object} data
 * @param {object} webir
 * @param {{ httponly?: boolean, secure?: boolean, path?: string, samesite?: string }} attrs
 * @param {{ file: string, line?: number, column?: number }} origin
 * @param {"mint" | "revoke"} kind
 */
function lowerSessionCookieAttrs(data, webir, attrs, origin, kind) {
  /** @type {string[]} */
  const flat = [];
  const push = (key, value, type) => {
    flat.push(
      data.literal({
        value: key,
        type: HUB_T.string,
        origin,
        provenance: [webir.provenance("hub-ingest", `cwl:executable-session-${kind}-attr-key`)],
      }),
    );
    flat.push(
      data.literal({
        value,
        type,
        origin,
        provenance: [webir.provenance("hub-ingest", `cwl:executable-session-${kind}-attr-val`)],
      }),
    );
  };
  if (attrs.httponly) push("httponly", true, HUB_T.bool);
  if (attrs.secure) push("secure", true, HUB_T.bool);
  if (typeof attrs.path === "string") push("path", attrs.path, HUB_T.string);
  if (typeof attrs.samesite === "string") push("samesite", attrs.samesite, HUB_T.string);
  return data.call({
    callee: "__object_literal",
    args: flat,
    type: HUB_T.unknown,
    origin,
    provenance: [webir.provenance("hub-ingest", `cwl:executable-session-${kind}-attrs`)],
  });
}

/**
 * Lower declared CWL effects to executable effect-dialect nodes (Phase 17).
 * @param {object} ctx — { data, webir, builder, file }
 * @param {import('@chrysalis/webir').NodeId} bodyId
 * @param {string[]} declared
 * @param {{ file: string, line?: number }} loc
 */
export function wrapCwlExecutableEffects(ctx, bodyId, declared, loc) {
  if (!declared?.length) return bodyId;
  const { data, webir, builder } = ctx;
  const effect = webir.effectDialect.builders(builder);
  const origin = hubOrigin(loc.file, loc.line ?? 1);
  /** @type {import('@chrysalis/webir').NodeId[]} */
  const statements = [];
  for (const raw of declared) {
    const t = raw.trim().toLowerCase();
    if (t === "session.read") {
      statements.push(
        effect.sessionRead({
          key: "user_id",
          type: HUB_T.string,
          origin,
          provenance: [webir.provenance("hub-ingest", "cwl:executable-session-read")],
        }),
      );
      continue;
    }
    if (t === "session.write") {
      const touch = data.literal({
        value: true,
        type: HUB_T.bool,
        origin,
        provenance: [webir.provenance("hub-ingest", "cwl:executable-session-write")],
      });
      statements.push(
        effect.sessionWrite({
          key: "_cwl_session_touch",
          value: touch,
          origin,
          provenance: [webir.provenance("hub-ingest", "cwl:executable-session-write")],
        }),
      );
      continue;
    }
    const authReq = parseAuthRequireEffect(t);
    if (authReq) {
      if (authReq.cookie) {
        statements.push(
          data.call({
            callee: "__cwl_effect_auth_require",
            args: [
              data.literal({
                value: authReq.cookie,
                type: HUB_T.string,
                origin,
                provenance: [webir.provenance("hub-ingest", "cwl:executable-auth-require-cookie")],
              }),
            ],
            argNames: ["cookie"],
            type: HUB_T.unknown,
            origin,
            provenance: [webir.provenance("hub-ingest", "cwl:executable-auth-require")],
          }),
        );
      } else {
        statements.push(
          effect.sessionRead({
            key: "user_id",
            type: HUB_T.string,
            origin,
            provenance: [webir.provenance("hub-ingest", "cwl:executable-auth-require")],
          }),
        );
      }
      continue;
    }
    if (t === "auth.verify") {
      statements.push(
        data.call({
          callee: "__cwl_effect_auth_verify",
          args: [],
          type: HUB_T.unknown,
          origin,
          provenance: [webir.provenance("hub-ingest", "cwl:executable-auth-verify")],
        }),
      );
      continue;
    }
    const sessionCookie = parseSessionCookieEffect(t);
    if (sessionCookie?.kind === "session.mint") {
      /** @type {string[]} */
      const args = [];
      /** @type {string[]} */
      const argNames = [];
      if (sessionCookie.cookie) {
        args.push(
          data.literal({
            value: sessionCookie.cookie,
            type: HUB_T.string,
            origin,
            provenance: [webir.provenance("hub-ingest", "cwl:executable-session-mint-cookie")],
          }),
        );
        argNames.push("cookie");
      }
      if (sessionCookie.attrs) {
        args.push(lowerSessionCookieAttrs(data, webir, sessionCookie.attrs, origin, "mint"));
        argNames.push("attrs");
      }
      statements.push(
        data.call({
          callee: "__cwl_effect_session_mint",
          args,
          argNames: argNames.length ? argNames : undefined,
          type: HUB_T.unknown,
          origin,
          provenance: [webir.provenance("hub-ingest", "cwl:executable-session-mint")],
        }),
      );
      continue;
    }
    if (sessionCookie?.kind === "session.revoke") {
      /** @type {string[]} */
      const args = [];
      /** @type {string[]} */
      const argNames = [];
      if (sessionCookie.cookie) {
        args.push(
          data.literal({
            value: sessionCookie.cookie,
            type: HUB_T.string,
            origin,
            provenance: [webir.provenance("hub-ingest", "cwl:executable-session-revoke-cookie")],
          }),
        );
        argNames.push("cookie");
      }
      if (sessionCookie.attrs) {
        args.push(lowerSessionCookieAttrs(data, webir, sessionCookie.attrs, origin, "revoke"));
        argNames.push("attrs");
      }
      statements.push(
        data.call({
          callee: "__cwl_effect_session_revoke",
          args,
          argNames: argNames.length ? argNames : undefined,
          type: HUB_T.unknown,
          origin,
          provenance: [webir.provenance("hub-ingest", "cwl:executable-session-revoke")],
        }),
      );
      continue;
    }
    const cors = parseCorsAllowEffect(t);
    if (cors) {
      /** @type {string[]} */
      const corsArgs = [];
      /** @type {string[]} */
      const corsArgNames = [];
      corsArgs.push(
        data.literal({
          value: cors.origin,
          type: HUB_T.string,
          origin,
          provenance: [webir.provenance("hub-ingest", "cwl:executable-cors-allow")],
        }),
      );
      corsArgNames.push("origin");
      if (cors.methods && cors.methods.length) {
        corsArgs.push(
          data.literal({
            value: cors.methods.join(" "),
            type: HUB_T.string,
            origin,
            provenance: [webir.provenance("hub-ingest", "cwl:executable-cors-allow-methods")],
          }),
        );
        corsArgNames.push("methods");
      }
      statements.push(
        data.call({
          callee: "__cwl_middleware_cors",
          args: corsArgs,
          argNames: corsArgNames,
          type: HUB_T.unknown,
          origin,
          provenance: [webir.provenance("hub-ingest", "cwl:executable-cors-allow")],
        }),
      );
      continue;
    }
    const csrf = parseCsrfVerifyEffect(t);
    if (csrf) {
      const args =
        csrf.cookie == null
          ? []
          : [
              data.literal({
                value: csrf.cookie,
                type: HUB_T.string,
                origin,
                provenance: [webir.provenance("hub-ingest", "cwl:executable-csrf-verify-cookie")],
              }),
            ];
      statements.push(
        data.call({
          callee: "__cwl_middleware_csrf",
          args,
          argNames: csrf.cookie == null ? undefined : ["cookie"],
          type: HUB_T.unknown,
          origin,
          provenance: [webir.provenance("hub-ingest", "cwl:executable-csrf-verify")],
        }),
      );
      continue;
    }
    const rate = parseRateLimitEffect(t);
    if (rate) {
      const args =
        rate.rpm == null
          ? []
          : [
              data.literal({
                value: rate.rpm,
                type: HUB_T.int,
                origin,
                provenance: [webir.provenance("hub-ingest", "cwl:executable-rate-limit-rpm")],
              }),
            ];
      statements.push(
        data.call({
          callee: "__cwl_middleware_rate_limit",
          args,
          argNames: rate.rpm == null ? undefined : ["rpm"],
          type: HUB_T.unknown,
          origin,
          provenance: [webir.provenance("hub-ingest", "cwl:executable-rate-limit")],
        }),
      );
      continue;
    }
    if (t === "time.now") {
      statements.push(
        effect.timeNow({
          origin,
          provenance: [webir.provenance("hub-ingest", "cwl:executable-time-now")],
        }),
      );
      continue;
    }
    if (t === "random") {
      const min = data.literal({
        value: 0,
        type: HUB_T.int,
        origin,
        provenance: [webir.provenance("hub-ingest", "cwl:executable-random-min")],
      });
      const max = data.literal({
        value: 1,
        type: HUB_T.int,
        origin,
        provenance: [webir.provenance("hub-ingest", "cwl:executable-random-max")],
      });
      statements.push(
        effect.random({
          min,
          max,
          origin,
          provenance: [webir.provenance("hub-ingest", "cwl:executable-random")],
        }),
      );
      continue;
    }
    const mailFx = parseMailSendEffect(t);
    if (mailFx) {
      const args =
        mailFx.template == null
          ? []
          : [
              data.literal({
                value: mailFx.template,
                type: HUB_T.string,
                origin,
                provenance: [webir.provenance("hub-ingest", "cwl:executable-mail-send-template")],
              }),
            ];
      statements.push(
        data.call({
          callee: "__cwl_effect_mail_send",
          args,
          argNames: mailFx.template == null ? undefined : ["template"],
          type: HUB_T.unknown,
          origin,
          provenance: [webir.provenance("hub-ingest", "cwl:executable-mail-send")],
        }),
      );
      continue;
    }
    const cacheFx = parseCacheMaxAgeEffect(t);
    if (cacheFx) {
      statements.push(
        data.call({
          callee: "__cwl_middleware_cache",
          args: [
            data.literal({
              value: cacheFx.seconds,
              type: HUB_T.int,
              origin,
              provenance: [webir.provenance("hub-ingest", "cwl:executable-cache-max-age")],
            }),
          ],
          argNames: ["maxAge"],
          type: HUB_T.unknown,
          origin,
          provenance: [webir.provenance("hub-ingest", "cwl:executable-cache-max-age")],
        }),
      );
      continue;
    }
    const dbFx = parseDbEffect(t);
    if (dbFx) {
      const callee = dbFx.kind === "db.read" ? "__cwl_effect_db_read" : "__cwl_effect_db_write";
      const loc = dbFx.kind === "db.read" ? "cwl:executable-db-read" : "cwl:executable-db-write";
      const args =
        dbFx.table == null
          ? []
          : [
              data.literal({
                value: dbFx.table,
                type: HUB_T.string,
                origin,
                provenance: [webir.provenance("hub-ingest", `${loc}-table`)],
              }),
            ];
      statements.push(
        data.call({
          callee,
          args,
          argNames: dbFx.table == null ? undefined : ["table"],
          type: HUB_T.unknown,
          origin,
          provenance: [webir.provenance("hub-ingest", loc)],
        }),
      );
      continue;
    }
    if (t === "io") {
      statements.push(
        data.call({
          callee: "__cwl_effect_io",
          args: [],
          type: HUB_T.unknown,
          origin,
          provenance: [webir.provenance("hub-ingest", "cwl:executable-io")],
        }),
      );
    }
  }
  if (statements.length === 0) return bodyId;
  statements.push(bodyId);
  return data.block({
    statements,
    type: HUB_T.unknown,
    origin,
    provenance: [webir.provenance("hub-ingest", "cwl:executable-effects-block")],
  });
}
