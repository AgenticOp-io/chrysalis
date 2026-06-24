/**
 * Walk hub-lifted WebIR modules for HTTP routes and handler body shape.
 */

/**
 * @param {(id: string) => object | undefined} get
 * @param {string} bodyId
 */
export function classifyHubHandlerBody(get, bodyId) {
  const unwrap = (id) => {
    const n = get(id);
    if (!n) return { kind: "hole", reason: "hub:missing-body" };
    if (n.dialect === "legacy" && n.op === "hole") {
      return { kind: "hole", reason: String(n.attrs?.reason ?? "legacy:hole") };
    }
    if (n.dialect === "data" && n.op === "hole") {
      return { kind: "hole", reason: String(n.attrs?.reason ?? "data:hole") };
    }
    if (n.dialect === "web.request" && n.op === "response") {
      const ops = n.operands ?? [];
      if (ops.length !== 1) return { kind: "hole", reason: "hub:response-arity" };
      return unwrap(ops[0]);
    }
    if (n.dialect === "data" && n.op === "block") {
      const ops = n.operands ?? [];
      if (ops.length !== 1) return { kind: "hole", reason: "hub:multi-statement-body" };
      return unwrap(ops[0]);
    }
    if (n.dialect === "data" && n.op === "literal") {
      return { kind: "literal", value: n.attrs?.value };
    }
    if (n.dialect === "data" && n.op === "call" && n.attrs?.callee === "__return_json") {
      const ops = n.operands ?? [];
      if (ops.length !== 1) return { kind: "hole", reason: "hub:return-json-arity" };
      return unwrap(ops[0]);
    }
    if (n.dialect === "data" && n.op === "call" && n.attrs?.callee === "__object_literal") {
      const ops = n.operands ?? [];
      const obj = {};
      for (let i = 0; i + 1 < ops.length; i += 2) {
        const keyNode = get(ops[i]);
        const valNode = get(ops[i + 1]);
        const key = keyNode?.attrs?.value;
        if (typeof key !== "string" || valNode?.op !== "literal") {
          return { kind: "hole", reason: "hub:complex-object-literal" };
        }
        obj[key] = valNode.attrs?.value;
      }
      return { kind: "literal", value: obj };
    }
    return { kind: "hole", reason: `hub:unsupported-body:${n.dialect}:${n.op}` };
  };
  return unwrap(bodyId);
}

const CWL_TRANSPARENT_CALLS = new Set([
  "json_encode",
  "__return_json",
  "__return",
  "__cast_int",
  "__cast_string",
  "__cast_float",
  "__cast_bool",
  "intval",
  "strval",
  "floatval",
  "boolval",
]);

import { cwlHtmlTemplateToLit } from "./cwl-html-template.mjs";
function stripBom(s) {
  return typeof s === "string" ? s.replace(/^\uFEFF/, "") : s;
}

const CWL_JSON_CALLS = new Set(["json_encode", "__return_json"]);
const CWL_TEXT_CONTENT_TYPE = "text/plain; charset=utf-8";
const CWL_JSON_CONTENT_TYPE = "application/json";

/** Whether a node is a JSON-producing call (`json_encode(...)` / `__return_json(...)`). */
function isCwlJsonCall(get, id) {
  const n = get(id);
  return Boolean(n && n.dialect === "data" && n.op === "call" && CWL_JSON_CALLS.has(String(n.attrs?.callee ?? "")));
}

/**
 * Lower a WebIR data expression into a CWL value representation.
 * @param {(id: string) => object | undefined} get
 * @param {string} id
 * @returns {{ t: "lit", value: unknown } | { t: "ref", source: string, name: string } | { t: "obj", entries: Array<{ key: string, value: object }> } | { t: "hole", reason: string }}
 */
export function cwlValueOf(get, id) {
  const n = get(id);
  if (!n) return { t: "hole", reason: "hub:cwl:missing-value" };
  if (n.dialect === "data" && n.op === "html.template") {
    return cwlHtmlTemplateToLit(get, n);
  }
  if (n.dialect === "data" && n.op === "ui.tree") {
    return { t: "lit", value: "__cwl_ui_tree__" };
  }
  if (n.dialect === "data" && n.op === "literal") {
    return { t: "lit", value: stripBom(n.attrs?.value) };
  }
  if (n.dialect === "data" && n.op === "request.field") {
    const source = String(n.attrs?.source ?? "path");
    const name = String(n.attrs?.name ?? "");
    if (source !== "path" && source !== "query" && source !== "body" && source !== "header" && source !== "cookie") {
      return { t: "hole", reason: `hub:cwl:unsupported-field-source:${source}` };
    }
    return { t: "ref", source, name };
  }
  if (n.dialect === "data" && n.op === "binop" && n.attrs?.operator === "??") {
    // Null-coalesce: project the primary operand and carry the default literal
    // onto the (ref) so the CWL declaration can preserve it (`query q = "";`).
    const ops = n.operands ?? [];
    if (ops.length === 0) return { t: "hole", reason: "hub:cwl:empty-coalesce" };
    const primary = cwlValueOf(get, ops[0]);
    if (primary.t === "ref" && ops.length >= 2) {
      const def = cwlValueOf(get, ops[1]);
      if (def.t === "lit") return { ...primary, default: def.value };
    }
    return primary;
  }
  if (n.dialect === "data" && n.op === "block") {
    const ops = n.operands ?? [];
    if (ops.length === 1) return cwlValueOf(get, ops[0]);
    return { t: "hole", reason: "hub:cwl:unsupported-value:data.block" };
  }
  if (n.dialect === "data" && n.op === "call") {
    const callee = String(n.attrs?.callee ?? "");
    if (callee === "__object_literal") {
      const ops = n.operands ?? [];
      /** @type {Array<{ key: string, value: object }>} */
      const entries = [];
      for (let i = 0; i + 1 < ops.length; i += 2) {
        const keyNode = get(ops[i]);
        const key = keyNode?.attrs?.value;
        if (typeof key !== "string") return { t: "hole", reason: "hub:cwl:non-string-key" };
        const value = cwlValueOf(get, ops[i + 1]);
        if (value.t === "hole") return value;
        entries.push({ key, value });
      }
      return { t: "obj", entries };
    }
    if (callee === "__array_literal") {
      const ops = n.operands ?? [];
      const items = [];
      for (const op of ops) {
        const v = cwlValueOf(get, op);
        if (v.t !== "lit") return { t: "hole", reason: "hub:cwl:non-literal-array" };
        items.push(v.value);
      }
      return { t: "lit", value: items };
    }
    if (CWL_TRANSPARENT_CALLS.has(callee)) {
      const ops = n.operands ?? [];
      if (ops.length === 1) return cwlValueOf(get, ops[0]);
      return { t: "hole", reason: `hub:cwl:call-arity:${callee}` };
    }
    return { t: "hole", reason: `hub:cwl:unsupported-call:${callee}` };
  }
  return { t: "hole", reason: `hub:cwl:unsupported-value:${n.dialect}.${n.op}` };
}

/**
 * Walk a hub handler body into a CWL-shaped projection: response status, the
 * referenced path/query params, and a single return value. Flattens nested
 * blocks, skips header no-ops (empty blocks) and BOM-only echoes.
 * @param {(id: string) => object | undefined} get
 * @param {string} bodyId
 * @returns {{ status: number | null, params: Array<{ source: string, name: string }>, value: object | null, holeReason: string | null }}
 */
export function walkCwlHandlerBody(get, bodyId) {
  let status = null;
  /** @type {object | null} */
  let value = null;
  /** @type {object | null} */
  let loadData = null;
  let holeReason = null;
  let json = false;
  let responseContentType = null;
  let responseKind = null;

  const visit = (id) => {
    if (holeReason) return;
    const n = get(id);
    if (!n) {
      holeReason = "hub:cwl:missing-body";
      return;
    }
    if ((n.dialect === "legacy" || n.dialect === "data") && n.op === "hole") {
      holeReason = String(n.attrs?.reason ?? "hub:cwl:hole");
      return;
    }
    if (n.dialect === "data" && n.op === "call" && n.attrs?.callee === "__page_load") {
      const ops = n.operands ?? [];
      if (ops.length === 1) {
        const v = cwlValueOf(get, ops[0]);
        if (v.t === "hole") {
          holeReason = v.reason;
          return;
        }
        loadData = v;
      }
      return;
    }
    if (n.dialect === "web.request" && n.op === "response") {
      if (n.attrs?.contentType) responseContentType = String(n.attrs.contentType);
      if (n.attrs?.kind) responseKind = String(n.attrs.kind);
      // CWL-ingested routes carry the response status on the response node
      // (the lift path uses an `http.error` effect instead); read it here so a
      // round-tripped `status N;` projects as `withStatus`.
      const s = Number(n.attrs?.status);
      if (Number.isFinite(s) && s !== 200) status = s;
      for (const op of n.operands ?? []) visit(op);
      return;
    }
    if (n.dialect === "data" && n.op === "block") {
      for (const op of n.operands ?? []) visit(op);
      return;
    }
    if (n.dialect === "effect" && (n.op === "http.error" || n.op === "http.status")) {
      const s = Number(n.attrs?.status);
      if (Number.isFinite(s)) status = s;
      return;
    }
    if (n.dialect === "effect" && n.op === "redirect") {
      status = 302;
      for (const op of n.operands ?? []) visit(op);
      return;
    }
    if (n.dialect === "effect" && (n.op === "session.read" || n.op === "session.write")) {
      return;
    }
    if (n.dialect === "effect" && n.op === "echo") {
      const ops = n.operands ?? [];
      if (ops.length === 0) return;
      const jsonCall = isCwlJsonCall(get, ops[0]);
      const v = cwlValueOf(get, ops[0]);
      if (v.t === "hole") {
        holeReason = v.reason;
        return;
      }
      // Drop BOM-only / empty text echoes (no meaningful body).
      if (v.t === "lit" && (v.value === "" || v.value === undefined)) return;
      if (jsonCall) json = true;
      value = v;
      return;
    }
    if (n.dialect === "data" && (n.op === "literal" || n.op === "call" || n.op === "request.field" || n.op === "html.template" || n.op === "ui.tree")) {
      const jsonCall = isCwlJsonCall(get, id);
      const v = cwlValueOf(get, id);
      if (v.t === "hole") {
        holeReason = v.reason;
        return;
      }
      if (v.t === "lit" && (v.value === "" || v.value === undefined)) return;
      if (jsonCall) json = true;
      value = v;
      return;
    }
    holeReason = `hub:cwl:unsupported-stmt:${n.dialect}.${n.op}`;
  };

  visit(bodyId);

  /** @type {Array<{ source: string, name: string, default?: unknown }>} */
  const params = [];
  const collect = (v) => {
    if (!v) return;
    if (v.t === "ref") {
      let p = params.find((q) => q.name === v.name && q.source === v.source);
      if (!p) {
        p = { source: v.source, name: v.name };
        params.push(p);
      }
      if (Object.prototype.hasOwnProperty.call(v, "default")) p.default = v.default;
    }
    if (v.t === "obj") for (const e of v.entries) collect(e.value);
  };
  collect(value);

  // Infer the response MIME from the body shape (the PHP/JS header was dropped
  // at ingest by design; emit re-derives it): JSON-producing calls or
  // object/array bodies are application/json, other bodies are text/plain.
  const isJson =
    json || value?.t === "obj" || (value?.t === "lit" && Array.isArray(value.value));
  const noContent = status === 204 || status === 304;
  let contentType = responseContentType;
  if (!contentType && !noContent) {
    contentType = isJson ? CWL_JSON_CONTENT_TYPE : CWL_TEXT_CONTENT_TYPE;
  }
  const isPage =
    responseKind === "html" ||
    (contentType && contentType.includes("html")) ||
    (value?.t === "lit" && value.value === "__cwl_ui_tree__") ||
    (value?.t === "lit" &&
      typeof value.value === "string" &&
      value.value.trimStart().startsWith("<"));
  if (isPage && !noContent && !contentType?.includes("html")) {
    contentType = "text/html; charset=utf-8";
  }

  return {
    status,
    params,
    value,
    loadData,
    holeReason,
    contentType: noContent ? null : contentType,
    surfaceKind: isPage ? "page" : "api",
  };
}

/**
 * List routes with CWL-shaped handler projections (status/params/value).
 * @param {import('@chrysalis/webir').Module} module
 */
export function listCwlRoutes(module) {
  const get = (id) => module.nodes.get(id);
  const routes = [];
  for (const rid of module.roots) {
    const routeNode = get(rid);
    if (!routeNode || routeNode.dialect !== "web.request" || routeNode.op !== "route") continue;
    const attrs = routeNode.attrs ?? {};
    const method = String(attrs.method ?? "GET").toUpperCase();
    const path = String(attrs.path ?? "/");
    const handlerId = routeNode.operands?.[0];
    if (handlerId === undefined) continue;
    const handler = get(handlerId);
    if (!handler || handler.dialect !== "web.request" || handler.op !== "handler") continue;
    const bodyId = handler.operands?.[0];
    if (bodyId === undefined) continue;
    const handlerName = String(handler.attrs?.name ?? `${method}_${path.replace(/[^a-zA-Z0-9]+/g, "_")}`);
    routes.push({ method, path, handlerName, ...walkCwlHandlerBody(get, bodyId) });
  }
  return routes.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
}

/** Render a CWL literal value. */
function cwlRenderLiteral(value) {
  if (value === true) return "true";
  if (value === false) return "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(cwlRenderLiteral).join(", ")}]`;
  if (value !== null && typeof value === "object") {
    const ent = Object.entries(value).map(([k, v]) => `${k}: ${cwlRenderLiteral(v)}`);
    return `{ ${ent.join(", ")} }`;
  }
  return "null";
}

/** Render a CWL value representation produced by `walkCwlHandlerBody`/`cwlValueOf`. */
function cwlRenderValue(v) {
  if (!v) return '""';
  if (v.t === "lit") return cwlRenderLiteral(v.value);
  if (v.t === "ref") return v.name;
  if (v.t === "obj") {
    const ent = v.entries.map((e) => `${e.key}: ${cwlRenderValue(e.value)}`);
    return `{ ${ent.join(", ")} }`;
  }
  return '""';
}

/**
 * Render the CWL projection of `listCwlRoutes` to CWL source text. Shared by the
 * round-trip emit (`emit-cwl-from-hub`) and the project-to-CWL migration export
 * (`hub-project-cwl-export`) so both carry the same status/param/`??`-default/
 * content-type/object-body fidelity rather than diverging projections.
 * @param {ReturnType<typeof listCwlRoutes>} routes
 * @param {{ header?: string, moduleName?: string }} [opts]
 * @returns {{ text: string, holeCount: number, routeCount: number }}
 */
export function renderCwlRoutes(routes, opts = {}) {
  const header = opts.header ?? "# Chrysalis Web Language";
  const moduleName = opts.moduleName ?? "hub";
  const lines = [header, `module ${moduleName};`, ""];
  let holeCount = 0;
  for (const r of routes) {
    const isPage =
      r.surfaceKind === "page" ||
      (r.contentType && String(r.contentType).includes("html"));
    lines.push(isPage ? `@page ${r.method} "${r.path}"` : `@route ${r.method} "${r.path}"`);
    lines.push(isPage ? `page ${r.handlerName} {` : `handler ${r.handlerName} {`);
    lines.push("  effects: none;");
    const renderSurface = () => {
      if (typeof r.status === "number" && r.status !== 200) {
        lines.push(`  status ${r.status};`);
      }
      if (r.contentType) {
        lines.push(`  content-type ${JSON.stringify(r.contentType)};`);
      }
      for (const p of r.params ?? []) {
        const kw =
          p.source === "query"
            ? "query"
            : p.source === "body"
              ? "body"
              : p.source === "header"
                ? "header"
                : p.source === "cookie"
                  ? "cookie"
                  : "param";
        const hasDefault = Object.prototype.hasOwnProperty.call(p, "default");
        lines.push(hasDefault ? `  ${kw} ${p.name} = ${cwlRenderLiteral(p.default)};` : `  ${kw} ${p.name};`);
      }
    };
    if (r.holeReason) {
      holeCount += 1;
      // Importers (OpenAPI -> CWL) keep the known route surface alongside an
      // honest body hole; the default (round-trip emit) keeps the legacy
      // hole-only shape so existing golden snapshots are byte-identical.
      if (opts.surfaceOnHole) renderSurface();
      // The CWL `hole` statement takes a bare token reason (`hole foo:bar;`);
      // a free-text reason falls back to the `hole <name> "<message>";` form.
      const reason = String(r.holeReason);
      lines.push(
        /^[A-Za-z0-9_:.-]+$/.test(reason)
          ? `  hole ${reason};`
          : `  hole legacy ${JSON.stringify(reason)};`,
      );
      lines.push("}");
      lines.push("");
      continue;
    }
    renderSurface();
    if (r.loadData && !r.holeReason) {
      lines.push(`  load ${cwlRenderValue(r.loadData)};`);
    }
    if (
      isPage &&
      r.value?.t === "lit" &&
      typeof r.value.value === "string" &&
      !r.holeReason
    ) {
      lines.push(`  return html ${JSON.stringify(r.value.value)};`);
    } else {
      lines.push(`  return ${cwlRenderValue(r.value)};`);
    }
    lines.push("}");
    lines.push("");
  }
  return { text: `${lines.join("\n")}\n`, holeCount, routeCount: routes.length };
}

/**
 * Counted coverage of the CWL projection for a flagship module: how many routes
 * are hole-free and how many carry each fidelity feature (status, params, `??`
 * defaults, content-type, structured object bodies). This turns the G124–G128
 * projection depth into a measurable evidence signal rather than a binary pass.
 * @param {import('@chrysalis/webir').Module} module
 * @returns {{ total: number, holeFree: number, withStatus: number, withParams: number, withBodyParams: number, withHeaderParams: number, withCookieParams: number, withParamDefaults: number, withContentType: number, objectBodies: number, holeReasons: string[] }}
 */
export function summarizeCwlProjection(module) {
  const routes = listCwlRoutes(module);
  let holeFree = 0;
  let withStatus = 0;
  let withParams = 0;
  let withBodyParams = 0;
  let withHeaderParams = 0;
  let withCookieParams = 0;
  let withParamDefaults = 0;
  let withContentType = 0;
  let objectBodies = 0;
  const holeReasons = [];
  for (const r of routes) {
    if (r.holeReason === null) holeFree++;
    else holeReasons.push(r.holeReason);
    if (typeof r.status === "number") withStatus++;
    const params = Array.isArray(r.params) ? r.params : [];
    if (params.length > 0) withParams++;
    if (params.some((p) => p.source === "body")) withBodyParams++;
    if (params.some((p) => p.source === "header")) withHeaderParams++;
    if (params.some((p) => p.source === "cookie")) withCookieParams++;
    if (params.some((p) => Object.prototype.hasOwnProperty.call(p, "default"))) withParamDefaults++;
    if (r.contentType) withContentType++;
    if (r.value && r.value.t === "obj") objectBodies++;
  }
  return {
    total: routes.length,
    holeFree,
    withStatus,
    withParams,
    withBodyParams,
    withHeaderParams,
    withCookieParams,
    withParamDefaults,
    withContentType,
    objectBodies,
    holeReasons: [...new Set(holeReasons)].sort(),
  };
}

/**
 * @param {import('@chrysalis/webir').Module} module
 */
export function listHubWebRoutes(module) {
  const get = (id) => module.nodes.get(id);
  const routes = [];
  for (const rid of module.roots) {
    const routeNode = get(rid);
    if (!routeNode || routeNode.dialect !== "web.request" || routeNode.op !== "route") continue;
    const attrs = routeNode.attrs ?? {};
    const method = String(attrs.method ?? "GET").toUpperCase();
    const path = String(attrs.path ?? "/");
    const handlerId = routeNode.operands?.[0];
    if (handlerId === undefined) continue;
    const handler = get(handlerId);
    if (!handler || handler.dialect !== "web.request" || handler.op !== "handler") continue;
    const bodyId = handler.operands?.[0];
    if (bodyId === undefined) continue;
    const handlerName = String(handler.attrs?.name ?? `${method}_${path.replace(/[^a-zA-Z0-9]+/g, "_")}`);
    routes.push({
      method,
      path,
      handlerName,
      body: classifyHubHandlerBody(get, bodyId),
      origin: handler.origin ?? routeNode.origin,
    });
  }
  return routes.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
}
