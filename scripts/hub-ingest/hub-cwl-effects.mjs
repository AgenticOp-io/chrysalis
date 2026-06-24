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
      continue;
    }
    if (t === "auth.require") {
      out.push({ kind: "session.read" });
      continue;
    }
    if (t === "cors.allow" || t === "csrf.verify") {
      out.push({ kind: "http.fetch" });
    }
  }
  return out;
}

const HUB_T = { string: { kind: "string" }, bool: { kind: "bool" }, unknown: { kind: "unknown" } };

function hubOrigin(file, line = 1) {
  return { file, line, column: 1 };
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
    } else if (t === "session.write") {
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
    } else if (t === "auth.require") {
      statements.push(
        effect.sessionRead({
          key: "user_id",
          type: HUB_T.string,
          origin,
          provenance: [webir.provenance("hub-ingest", "cwl:executable-auth-require")],
        }),
      );
    } else if (t === "cors.allow") {
      const allow = data.literal({
        value: "*",
        type: HUB_T.string,
        origin,
        provenance: [webir.provenance("hub-ingest", "cwl:executable-cors-allow")],
      });
      statements.push(
        data.call({
          callee: "__cwl_middleware_cors",
          args: [allow],
          type: HUB_T.unknown,
          origin,
          provenance: [webir.provenance("hub-ingest", "cwl:executable-cors-allow")],
        }),
      );
    } else if (t === "csrf.verify") {
      statements.push(
        data.call({
          callee: "__cwl_middleware_csrf",
          args: [],
          type: HUB_T.unknown,
          origin,
          provenance: [webir.provenance("hub-ingest", "cwl:executable-csrf-verify")],
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
