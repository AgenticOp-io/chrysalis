/**
 * Lower hub handler bodies (literal + path/query structured refs) for native emitters.
 */

/** @typedef {{ t: "lit", value: unknown } | { t: "ref", source: string, name: string, default?: unknown } | { t: "obj", entries: Array<{ key: string, value: object }> }} HubStructuredValue */

/**
 * @param {HubStructuredValue | null | undefined} v
 */
export function isLowerableStructuredValue(v) {
  if (!v || typeof v !== "object" || !("t" in v)) return false;
  if (v.t === "lit") return true;
  if (v.t === "ref") return v.source === "path" || v.source === "query";
  if (v.t === "obj") return v.entries.length > 0 && v.entries.every((e) => isLowerableStructuredValue(/** @type {HubStructuredValue} */ (e.value)));
  return false;
}

/**
 * @param {string} path
 * @returns {string[]}
 */
export function hubPathParamNames(path) {
  /** @type {string[]} */
  const names = [];
  for (const m of path.matchAll(/:([a-zA-Z_][a-zA-Z0-9_]*)/g)) names.push(m[1]);
  return names;
}

/**
 * @param {HubStructuredValue} v
 * @param {Array<{ source: string, name: string, default?: unknown }>} [out]
 */
export function collectQueryRefs(v, out = []) {
  if (!v || typeof v !== "object" || !("t" in v)) return out;
  if (v.t === "ref" && v.source === "query") out.push(v);
  if (v.t === "obj") for (const e of v.entries) collectQueryRefs(/** @type {HubStructuredValue} */ (e.value), out);
  return out;
}

/**
 * @param {unknown} value
 */
export function pyLiteral(value) {
  if (value === true) return "True";
  if (value === false) return "False";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  return "None";
}

/**
 * @param {unknown} value
 */
export function javaLiteralExpr(value) {
  if (value === true) return "true";
  if (value === false) return "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  return "null";
}

/**
 * @param {Array<{ key: string, expr: string }>} entries
 */
function javaMapReturnLines(entries) {
  const hasNull = entries.some((e) => e.expr === "null");
  if (!hasNull && entries.length > 0 && entries.length <= 10) {
    return [`return Map.of(${entries.map((e) => `"${e.key}", ${e.expr}`).join(", ")});`];
  }
  const lines = ["var __hubMap = new java.util.HashMap<String, Object>();"];
  for (const e of entries) lines.push(`__hubMap.put("${e.key}", ${e.expr});`);
  lines.push("return __hubMap;");
  return lines;
}

/**
 * @param {unknown} value
 */
export function goLiteral(value) {
  if (value === true) return "true";
  if (value === false) return "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  return "nil";
}

/**
 * @param {unknown} value
 */
export function csharpLiteral(value) {
  if (value === true) return "true";
  if (value === false) return "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  return "null";
}

/**
 * @param {{ kind: string, reason?: string, value?: unknown }} body
 * @returns {boolean}
 */
export function hubBodyIsJsonReturn(body) {
  if (body.kind === "literal") {
    const v = body.value;
    return v !== null && typeof v === "object";
  }
  if (body.kind === "structured") {
    const v = /** @type {HubStructuredValue} */ (body.value);
    if (v.t === "obj") return true;
    if (v.t === "ref" && v.source === "query") return true;
    return false;
  }
  return false;
}

/**
 * @param {{ kind: string, reason?: string, value?: unknown, status?: number }} body
 */
export function renderPythonBody(body) {
  if (body.kind === "hole") {
    return {
      lines: [`# HOLE: ${body.reason}`, `raise NotImplementedError(${JSON.stringify(body.reason)})`],
      hole: true,
      usesRequest: false,
    };
  }
  if (body.kind === "literal") {
    const v = body.value;
    if (v !== null && typeof v === "object") {
      return { lines: [`return jsonify(${JSON.stringify(v)})`], hole: false, usesRequest: false };
    }
    return { lines: [`return ${pyLiteral(v)}`], hole: false, usesRequest: false };
  }
  if (body.kind === "structured") {
    /** @param {HubStructuredValue} v @param {boolean} usesRequest */
    const exprOf = (v, usesRequest) => {
      if (v.t === "lit") return { expr: pyLiteral(v.value), usesRequest };
      if (v.t === "ref") {
        if (v.source === "path") return { expr: v.name, usesRequest };
        if (v.source === "query") {
          const def = Object.prototype.hasOwnProperty.call(v, "default") ? `, ${JSON.stringify(v.default)}` : "";
          return { expr: `request.args.get(${JSON.stringify(v.name)}${def})`, usesRequest: true };
        }
        return null;
      }
      if (v.t === "obj") {
        let req = usesRequest;
        const parts = [];
        for (const e of v.entries) {
          const inner = exprOf(/** @type {HubStructuredValue} */ (e.value), req);
          if (!inner || inner.expr === null) return null;
          req = inner.usesRequest;
          parts.push(`${JSON.stringify(e.key)}: ${inner.expr}`);
        }
        return { expr: `{ ${parts.join(", ")} }`, usesRequest: req };
      }
      return null;
    };
    const lowered = exprOf(/** @type {HubStructuredValue} */ (body.value), false);
    if (!lowered || lowered.expr === null) {
      return {
        lines: [`raise NotImplementedError("hub:unsupported-body-shape")`],
        hole: true,
        usesRequest: false,
      };
    }
    if (hubBodyIsJsonReturn(body)) {
      return { lines: [`return jsonify(${lowered.expr})`], hole: false, usesRequest: lowered.usesRequest };
    }
    return { lines: [`return ${lowered.expr}`], hole: false, usesRequest: lowered.usesRequest };
  }
  return { lines: [`raise NotImplementedError("hub:unsupported-body")`], hole: true, usesRequest: false };
}

/**
 * @param {{ kind: string, reason?: string, value?: unknown, status?: number }} body
 * @param {string} path
 */
export function renderJavaBody(body, path) {
  /** @param {HubStructuredValue} v */
  function structured(v) {
    if (v.t === "lit") return { expr: javaLiteralExpr(v.value) };
    if (v.t === "ref" && (v.source === "path" || v.source === "query")) return { expr: v.name };
    if (v.t === "obj") {
      /** @type {Array<{ key: string, expr: string }>} */
      const entries = [];
      for (const e of v.entries) {
        const inner = structured(/** @type {HubStructuredValue} */ (e.value));
        if (!inner) return null;
        if (inner.mapLines) return null;
        if (inner.expr === null) return null;
        entries.push({ key: e.key, expr: inner.expr });
      }
      return { mapLines: javaMapReturnLines(entries) };
    }
    return null;
  }

  if (body.kind === "hole") {
    return { lines: [`// HOLE: ${body.reason}`, `throw new UnsupportedOperationException(${JSON.stringify(body.reason)});`], hole: true, returnType: "void" };
  }
  if (body.kind === "literal") {
    const v = body.value;
    if (v !== null && typeof v === "object") {
      const entries = Object.entries(v).map(([k, val]) => ({ key: k, expr: javaLiteralExpr(val) }));
      return { lines: javaMapReturnLines(entries), hole: false, returnType: "Map<String, Object>" };
    }
    const ret = typeof v === "boolean" ? "boolean" : typeof v === "number" ? "int" : "String";
    return { lines: [`return ${javaLiteralExpr(v)};`], hole: false, returnType: ret };
  }
  if (body.kind === "structured") {
    const lowered = structured(/** @type {HubStructuredValue} */ (body.value));
    const v = /** @type {HubStructuredValue} */ (body.value);
    if (lowered?.mapLines) {
      return { lines: lowered.mapLines, hole: false, returnType: "Map<String, Object>" };
    }
    if (!lowered || lowered.expr === null) {
      return { lines: [`throw new UnsupportedOperationException("hub:unsupported-body-shape");`], hole: true, returnType: "void" };
    }
    const returnType =
      v.t === "ref" && v.source === "path" ? "String" : v.t === "obj" ? "Map<String, Object>" : "String";
    return { lines: [`return ${lowered.expr};`], hole: false, returnType };
  }
  return { lines: [`throw new UnsupportedOperationException("hub:unsupported-body");`], hole: true, returnType: "void" };
}

/**
 * @param {{ kind: string, reason?: string, value?: unknown }} body
 */
export function renderGoBody(body) {
  /** @param {HubStructuredValue} v */
  function structured(v) {
    if (v.t === "lit") return { expr: goLiteral(v.value), json: typeof v.value === "object" && v.value !== null };
    if (v.t === "ref") {
      if (v.source === "path") return { expr: `c.Param(${JSON.stringify(v.name)})`, json: false };
      if (v.source === "query") {
        const def = Object.prototype.hasOwnProperty.call(v, "default")
          ? `, ${JSON.stringify(String(v.default))}`
          : "";
        return { expr: `c.DefaultQuery(${JSON.stringify(v.name)}${def})`, json: false };
      }
      return null;
    }
    if (v.t === "obj") {
      const pairs = [];
      for (const e of v.entries) {
        const inner = structured(/** @type {HubStructuredValue} */ (e.value));
        if (!inner || inner.expr === null) return null;
        pairs.push(`"${e.key}": ${inner.expr}`);
      }
      return { expr: `gin.H{${pairs.join(", ")}}`, json: true };
    }
    return null;
  }

  if (body.kind === "hole") {
    return { lines: [`// HOLE: ${body.reason}`, `panic(${JSON.stringify(body.reason)})`], hole: true };
  }
  if (body.kind === "literal") {
    const v = body.value;
    if (v !== null && typeof v === "object") {
      const pairs = Object.entries(v).map(([k, val]) => `"${k}": ${goLiteral(val)}`).join(", ");
      return { lines: [`c.JSON(200, gin.H{${pairs}})`], hole: false };
    }
    if (typeof v === "string") return { lines: [`c.String(200, ${goLiteral(v)})`], hole: false };
    if (typeof v === "boolean" || typeof v === "number") return { lines: [`c.JSON(200, ${goLiteral(v)})`], hole: false };
    return { lines: ["c.Status(200)"], hole: false };
  }
  if (body.kind === "structured") {
    const lowered = structured(/** @type {HubStructuredValue} */ (body.value));
    if (!lowered || lowered.expr === null) {
      return { lines: [`panic("hub:unsupported-body-shape")`], hole: true };
    }
    if (lowered.json || hubBodyIsJsonReturn(body)) {
      return { lines: [`c.JSON(200, ${lowered.expr})`], hole: false };
    }
    return { lines: [`c.String(200, ${lowered.expr})`], hole: false };
  }
  return { lines: [`panic("hub:unsupported-body")`], hole: true };
}

/**
 * @param {{ kind: string, reason?: string, value?: unknown }} body
 */
/**
 * @param {unknown} value
 */
function rubyLiteral(value) {
  if (value === true) return "true";
  if (value === false) return "false";
  if (typeof value === "number") return String(value);
  if (value === null) return "nil";
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((v) => rubyLiteral(v)).join(", ")}]`;
  }
  if (typeof value === "object") {
    const pairs = Object.entries(/** @type {Record<string, unknown>} */ (value)).map(
      ([k, val]) => `${k}: ${rubyLiteral(val)}`,
    );
    return `{ ${pairs.join(", ")} }`;
  }
  return JSON.stringify(value);
}

export function renderRubyBody(body) {
  /** @param {HubStructuredValue} v */
  function structured(v) {
    if (v.t === "lit") {
      if (typeof v.value === "boolean") return { expr: String(v.value), json: false };
      return { expr: JSON.stringify(v.value), json: false };
    }
    if (v.t === "ref") {
      if (v.source === "path") return { expr: `params[${JSON.stringify(v.name)}]`, json: false };
      if (v.source === "query") {
        if (Object.prototype.hasOwnProperty.call(v, "default")) {
          return { expr: `params.fetch(${JSON.stringify(v.name)}, ${JSON.stringify(v.default)})`, json: false };
        }
        return { expr: `params[${JSON.stringify(v.name)}]`, json: false };
      }
      return null;
    }
    if (v.t === "obj") {
      const pairs = [];
      for (const e of v.entries) {
        const inner = structured(/** @type {HubStructuredValue} */ (e.value));
        if (!inner || inner.expr === null) return null;
        pairs.push(`${e.key}: ${inner.expr}`);
      }
      return { expr: pairs.join(", "), json: true };
    }
    return null;
  }

  if (body.kind === "hole") {
    return { lines: [`# HOLE: ${body.reason}`, `raise ${JSON.stringify(body.reason)}`], hole: true };
  }
  if (body.kind === "literal") {
    const v = body.value;
    if (v === null) return { lines: ["nil"], hole: false };
    if (typeof v === "object") {
      const pairs = Object.entries(/** @type {Record<string, unknown>} */ (v)).map(
        ([k, val]) => `${k}: ${rubyLiteral(val)}`,
      );
      return { lines: [`json ${pairs.join(", ")}`], hole: false };
    }
    if (typeof v === "boolean") return { lines: [`${v}`], hole: false };
    if (typeof v === "number") return { lines: [JSON.stringify(String(v))], hole: false };
    return { lines: [rubyLiteral(v)], hole: false };
  }
  if (body.kind === "structured") {
    const lowered = structured(/** @type {HubStructuredValue} */ (body.value));
    if (!lowered || lowered.expr === null) return { lines: [`raise "hub:unsupported-body-shape"`], hole: true };
    if (lowered.json || hubBodyIsJsonReturn(body)) return { lines: [`json ${lowered.expr}`], hole: false };
    return { lines: [lowered.expr], hole: false };
  }
  return { lines: [`raise "hub:unsupported-body"`], hole: true };
}

/**
 * @param {unknown} value
 */
export function phpLiteral(value) {
  if (value === true) return "true";
  if (value === false) return "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  return "null";
}

/**
 * @param {{ kind: string, reason?: string, value?: unknown, status?: number }} body
 */
export function renderPhpBody(body) {
  if (body.kind === "hole") {
    return {
      lines: [`throw new \\RuntimeException(${JSON.stringify(body.reason ?? "hub:hole")});`],
      hole: true,
    };
  }
  if (body.kind === "literal") {
    const v = body.value;
    if (v !== null && typeof v === "object") {
      return {
        lines: [
          `return hub_json(json_decode(${JSON.stringify(JSON.stringify(v))}, true, 512, JSON_THROW_ON_ERROR));`,
        ],
        hole: false,
      };
    }
    return { lines: [`return hub_json(${phpLiteral(v)});`], hole: false };
  }
  if (body.kind === "structured") {
    return {
      lines: [`throw new \\RuntimeException("hub:unsupported-body-shape");`],
      hole: true,
    };
  }
  return { lines: [`throw new \\RuntimeException("hub:unsupported-body");`], hole: true };
}

/**
 * @param {string} path
 */
export function toPhpRoutePattern(path) {
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return `^${escaped.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, "[^/]+")}$`;
}

/**
 * @param {{ kind: string, reason?: string, value?: unknown }} body
 * @param {string} path
 */
export function renderCsharpBody(body, path) {
  /** @param {HubStructuredValue} v */
  function structured(v) {
    if (v.t === "lit") return { expr: csharpLiteral(v.value) };
    if (v.t === "ref" && (v.source === "path" || v.source === "query")) return { expr: v.name };
    if (v.t === "obj") {
      const pairs = v.entries.map((e) => {
        const inner = structured(/** @type {HubStructuredValue} */ (e.value));
        if (!inner || inner.expr === null) return null;
        return `[${JSON.stringify(e.key)}] = ${inner.expr}`;
      });
      if (pairs.some((p) => p === null)) return null;
      return { expr: `new Dictionary<string, object> { ${pairs.join(", ")} }` };
    }
    return null;
  }

  /** @param {HubStructuredValue} v */
  function csharpLambdaParams(value) {
    const names = new Set();
    /** @type {string[]} */
    const params = [];
    for (const name of hubPathParamNames(path)) {
      params.push(`string ${name}`);
      names.add(name);
    }
    for (const ref of collectQueryRefs(value)) {
      if (names.has(ref.name)) continue;
      const def =
        Object.prototype.hasOwnProperty.call(ref, "default") ? ` = ${csharpLiteral(ref.default)}` : "";
      params.push(`string ${ref.name}${def}`);
      names.add(ref.name);
    }
    return params.join(", ");
  }

  if (body.kind === "hole") {
    return { lines: [`throw new NotImplementedException(${JSON.stringify(body.reason)});`], hole: true, lambdaParams: "" };
  }
  if (body.kind === "literal") {
    const v = body.value;
    const pathParams = hubPathParamNames(path).map((n) => `string ${n}`).join(", ");
    if (v === null) {
      return { lines: ["Results.NoContent()"], hole: false, lambdaParams: pathParams };
    }
    if (v !== null && typeof v === "object") {
      const pairs = Object.entries(v).map(([k, val]) => `[${JSON.stringify(k)}] = ${csharpLiteral(val)}`);
      return {
        lines: [`Results.Json(new Dictionary<string, object> { ${pairs.join(", ")} });`],
        hole: false,
        lambdaParams: "",
      };
    }
    return { lines: [csharpLiteral(v)], hole: false, lambdaParams: pathParams };
  }
  if (body.kind === "structured") {
    const val = /** @type {HubStructuredValue} */ (body.value);
    const lowered = structured(val);
    if (!lowered || lowered.expr === null) {
      return { lines: [`throw new NotImplementedException("hub:unsupported-body-shape");`], hole: true, lambdaParams: "" };
    }
    const lambdaParams = csharpLambdaParams(val);
    if (hubBodyIsJsonReturn(body)) {
      return { lines: [`Results.Json(${lowered.expr});`], hole: false, lambdaParams };
    }
    return { lines: [lowered.expr], hole: false, lambdaParams };
  }
  return { lines: [`throw new NotImplementedException("hub:unsupported-body");`], hole: true, lambdaParams: "" };
}

/**
 * @param {string} fnName
 * @param {string} path
 */
export function pythonHandlerDef(fnName, path) {
  const params = hubPathParamNames(path);
  if (params.length === 0) return `def ${fnName}():`;
  return `def ${fnName}(${params.join(", ")}):`;
}

/**
 * @param {string} path
 */
export function toFlaskPath(path) {
  return path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, "<$1>");
}

/**
 * @param {string} path
 */
export function toSpringPath(path) {
  return path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, "{$1}");
}

/**
 * @param {string} path
 */
export function toAspNetPath(path) {
  return path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, "{$1}");
}

/**
 * @param {string} path
 * @param {HubStructuredValue} value
 */
export function javaMethodParams(path, value) {
  /** @type {string[]} */
  const annotations = [];
  /** @type {string[]} */
  const paramNames = [];
  const seen = new Set();
  for (const name of hubPathParamNames(path)) {
    annotations.push(`@PathVariable String ${name}`);
    paramNames.push(`String ${name}`);
    seen.add(name);
  }
  for (const ref of collectQueryRefs(value)) {
    if (seen.has(ref.name)) continue;
    const def =
      Object.prototype.hasOwnProperty.call(ref, "default")
        ? `, defaultValue = ${JSON.stringify(String(ref.default))}`
        : "";
    annotations.push(`@RequestParam(name = ${JSON.stringify(ref.name)}${def}) String ${ref.name}`);
    paramNames.push(`String ${ref.name}`);
    seen.add(ref.name);
  }
  return { annotations, signature: paramNames.join(", ") };
}

/**
 * @param {string} path
 */
export function actixRoutePath(path) {
  return path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, "{$1}");
}

/**
 * @param {string} routePath
 * @returns {string}
 */
export function rustHandlerSignature(routePath, body) {
  /** @type {string[]} */
  const params = [];
  const pathNames = hubPathParamNames(routePath);
  if (pathNames.length === 1) params.push("path: web::Path<String>");
  else if (pathNames.length > 1) {
    params.push(`path: web::Path<(${pathNames.map(() => "String").join(", ")})>`);
  }
  const queryRefs =
    body.kind === "structured" ? collectQueryRefs(/** @type {HubStructuredValue} */ (body.value)) : [];
  if (queryRefs.length > 0) params.unshift("req: HttpRequest");
  return params.join(", ");
}

/**
 * @param {{ kind: string, reason?: string, value?: unknown }} body
 * @param {string} routePath
 */
export function renderRustBody(body, routePath) {
  const pathNames = hubPathParamNames(routePath);

  /** @param {HubStructuredValue} v */
  function pathRefExpr(name) {
    if (pathNames.length === 1) return "path.into_inner()";
    const idx = pathNames.indexOf(name);
    if (idx < 0) return null;
    return `path.${idx}`;
  }

  /** @param {{ source: string, name: string, default?: unknown }} ref */
  function queryRefExpr(ref) {
    const key = JSON.stringify(ref.name);
    const fallback = Object.prototype.hasOwnProperty.call(ref, "default")
      ? `.unwrap_or_else(|| ${JSON.stringify(String(ref.default))}.to_string())`
      : ".unwrap_or_default()";
    return `req.uri().query().and_then(|q| web::Query::<std::collections::HashMap<String, String>>::from_query(q).ok()).and_then(|q| q.get(${key}).cloned())${fallback}`;
  }

  /** @param {HubStructuredValue} v */
  function structured(v) {
    if (v.t === "lit") {
      if (v.value !== null && typeof v.value === "object") {
        return { expr: `serde_json::json!(${JSON.stringify(v.value)})`, json: true };
      }
      if (typeof v.value === "boolean") {
        return { expr: JSON.stringify(String(v.value)), json: false };
      }
      if (typeof v.value === "number") {
        return { expr: JSON.stringify(String(v.value)), json: false };
      }
      return { expr: JSON.stringify(String(v.value)), json: false };
    }
    if (v.t === "ref") {
      if (v.source === "path") {
        const expr = pathRefExpr(v.name);
        if (!expr) return null;
        return { expr, json: false };
      }
      if (v.source === "query") return { expr: queryRefExpr(v), json: false };
      return null;
    }
    if (v.t === "obj") {
      const pairs = [];
      for (const e of v.entries) {
        const inner = structured(/** @type {HubStructuredValue} */ (e.value));
        if (!inner || inner.expr === null) return null;
        pairs.push(`"${e.key}": ${inner.expr}`);
      }
      return { expr: `serde_json::json!({ ${pairs.join(", ")} })`, json: true };
    }
    return null;
  }

  if (body.kind === "hole") {
    return {
      lines: [
        `HttpResponse::InternalServerError().body(${JSON.stringify(body.reason ?? "hub:hole")})`,
      ],
      hole: true,
    };
  }
  if (body.kind === "literal") {
    const v = body.value;
    if (v !== null && typeof v === "object") {
      return { lines: [`HttpResponse::Ok().json(serde_json::json!(${JSON.stringify(v)}))`], hole: false };
    }
    if (typeof v === "boolean") {
      return { lines: [`HttpResponse::Ok().body(${JSON.stringify(String(v))})`], hole: false };
    }
    if (typeof v === "number") {
      return { lines: [`HttpResponse::Ok().body(${JSON.stringify(String(v))})`], hole: false };
    }
    return {
      lines: [`HttpResponse::Ok().content_type("text/plain; charset=utf-8").body(${JSON.stringify(String(v))})`],
      hole: false,
    };
  }
  if (body.kind === "structured") {
    const lowered = structured(/** @type {HubStructuredValue} */ (body.value));
    if (!lowered || lowered.expr === null) {
      return {
        lines: [`HttpResponse::InternalServerError().body("hub:unsupported-body-shape")`],
        hole: true,
      };
    }
    if (lowered.json || hubBodyIsJsonReturn(body)) {
      return { lines: [`HttpResponse::Ok().json(${lowered.expr})`], hole: false };
    }
    return {
      lines: [`HttpResponse::Ok().content_type("text/plain; charset=utf-8").body(${lowered.expr})`],
      hole: false,
    };
  }
  return { lines: [`HttpResponse::InternalServerError().body("hub:unsupported-body")`], hole: true };
}

/**
 * @param {unknown} value
 */
export function ktLiteral(value) {
  if (value === true) return "true";
  if (value === false) return "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  return "null";
}

/** @param {string} path */
export function ktorRoutePath(path) {
  return actixRoutePath(path);
}

/**
 * @param {{ kind: string, reason?: string, value?: unknown }} body
 * @param {string} routePath
 */
export function renderKotlinBody(body, routePath) {
  const pathNames = hubPathParamNames(routePath);

  /** @param {HubStructuredValue} v */
  function pathRefExpr(name) {
    if (pathNames.length === 1) return `call.parameters[${JSON.stringify(name)}] ?: ""`;
    return `call.parameters[${JSON.stringify(name)}] ?: ""`;
  }

  /** @param {{ source: string, name: string, default?: unknown }} ref */
  function queryRefExpr(ref) {
    const def = Object.prototype.hasOwnProperty.call(ref, "default")
      ? ` ?: ${JSON.stringify(String(ref.default))}`
      : ` ?: ""`;
    return `call.request.queryParameters[${JSON.stringify(ref.name)}]${def}`;
  }

  /** @param {HubStructuredValue} v */
  function structured(v) {
    if (v.t === "lit") {
      if (v.value !== null && typeof v.value === "object") {
        const ent = Object.entries(/** @type {Record<string, unknown>} */ (v.value))
          .map(([k, val]) => `"${k}" to ${ktLiteral(val)}`)
          .join(", ");
        return { expr: `mapOf(${ent})`, json: true };
      }
      if (typeof v.value === "boolean") return { expr: String(v.value), json: false };
      if (typeof v.value === "number") return { expr: ktLiteral(String(v.value)), json: false };
      return { expr: ktLiteral(v.value), json: false };
    }
    if (v.t === "ref") {
      if (v.source === "path") {
        const expr = pathRefExpr(v.name);
        if (!expr) return null;
        return { expr, json: false };
      }
      if (v.source === "query") return { expr: queryRefExpr(v), json: false };
      return null;
    }
    if (v.t === "obj") {
      const pairs = [];
      for (const e of v.entries) {
        const inner = structured(/** @type {HubStructuredValue} */ (e.value));
        if (!inner || inner.expr === null) return null;
        pairs.push(`"${e.key}" to ${inner.expr}`);
      }
      return { expr: `mapOf(${pairs.join(", ")})`, json: true };
    }
    return null;
  }

  if (body.kind === "hole") {
    return {
      lines: [`call.respondText(${JSON.stringify(body.reason ?? "hub:hole")}, status = HttpStatusCode.InternalServerError)`],
      hole: true,
    };
  }
  if (body.kind === "literal") {
    const v = body.value;
    if (v !== null && typeof v === "object") {
      const ent = Object.entries(v).map(([k, val]) => `"${k}" to ${ktLiteral(val)}`).join(", ");
      return { lines: [`call.respond(mapOf(${ent}))`], hole: false };
    }
    if (typeof v === "boolean") {
      return { lines: [`call.respond(${v})`], hole: false };
    }
    return { lines: [`call.respondText(${ktLiteral(v)})`], hole: false };
  }
  if (body.kind === "structured") {
    const lowered = structured(/** @type {HubStructuredValue} */ (body.value));
    if (!lowered || lowered.expr === null) {
      return {
        lines: [`call.respondText("hub:unsupported-body-shape", status = HttpStatusCode.InternalServerError)`],
        hole: true,
      };
    }
    if (lowered.json || hubBodyIsJsonReturn(body)) {
      return { lines: [`call.respond(${lowered.expr})`], hole: false };
    }
    return { lines: [`call.respondText(${lowered.expr})`], hole: false };
  }
  return {
    lines: [`call.respondText("hub:unsupported-body", status = HttpStatusCode.InternalServerError)`],
    hole: true,
  };
}

/**
 * @param {unknown} value
 */
export function scalaLiteral(value) {
  if (value === true) return "true";
  if (value === false) return "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  return "null";
}

/**
 * @param {string} path
 */
export function akkaPathMatcher(path) {
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return "pathEnd";
  const segs = parts.map((p) => (p.startsWith(":") ? "Segment" : JSON.stringify(p)));
  if (segs.length === 1) return `path(${segs[0]})`;
  return `path(${segs.join(" / ")})`;
}

/**
 * @param {string} method
 */
export function akkaHttpMethodDir(method) {
  const m = method.toUpperCase();
  if (m === "POST") return "post";
  if (m === "PUT") return "put";
  if (m === "PATCH") return "patch";
  if (m === "DELETE") return "delete";
  if (m === "HEAD") return "head";
  return "get";
}

/**
 * @param {{ kind: string, reason?: string, value?: unknown }} body
 * @param {string} routePath
 */
export function renderScalaBody(body, routePath) {
  /** @param {HubStructuredValue} v */
  function structured(v) {
    if (v.t === "lit") {
      if (v.value !== null && typeof v.value === "object") {
        const ent = Object.entries(/** @type {Record<string, unknown>} */ (v.value))
          .map(([k, val]) => `"${k}" -> ${scalaLiteral(val)}`)
          .join(", ");
        return { expr: `Map(${ent}).toJson.compactPrint`, json: true };
      }
      if (typeof v.value === "boolean") return { expr: `${v.value}.toString`, json: false };
      if (typeof v.value === "number") return { expr: scalaLiteral(String(v.value)), json: false };
      return { expr: scalaLiteral(v.value), json: false };
    }
    if (v.t === "ref") {
      if (v.source === "path") return { expr: scalaLiteral(v.name), json: false };
      if (v.source === "query") {
        const def = Object.prototype.hasOwnProperty.call(v, "default")
          ? `.getOrElse(${scalaLiteral(String(v.default))})`
          : ".getOrElse(\"\")";
        return { expr: `parameter(${JSON.stringify(v.name)})${def}`, json: false };
      }
      return null;
    }
    if (v.t === "obj") {
      const pairs = [];
      for (const e of v.entries) {
        const inner = structured(/** @type {HubStructuredValue} */ (e.value));
        if (!inner || inner.expr === null) return null;
        pairs.push(`"${e.key}" -> ${inner.expr}`);
      }
      return { expr: `Map(${pairs.join(", ")}).toJson.compactPrint`, json: true };
    }
    return null;
  }

  if (body.kind === "hole") {
    return {
      lines: [`complete(StatusCodes.InternalServerError, ${JSON.stringify(body.reason ?? "hub:hole")})`],
      hole: true,
    };
  }
  if (body.kind === "literal") {
    const v = body.value;
    if (v !== null && typeof v === "object") {
      const ent = Object.entries(v).map(([k, val]) => `"${k}" -> ${scalaLiteral(val)}`).join(", ");
      return { lines: [`complete(Map(${ent}).toJson.compactPrint)`], hole: false };
    }
    if (typeof v === "boolean") {
      return { lines: [`complete(${v})`], hole: false };
    }
    return { lines: [`complete(${scalaLiteral(v)})`], hole: false };
  }
  if (body.kind === "structured") {
    const lowered = structured(/** @type {HubStructuredValue} */ (body.value));
    if (!lowered || lowered.expr === null) {
      return {
        lines: [`complete(StatusCodes.InternalServerError, "hub:unsupported-body-shape")`],
        hole: true,
      };
    }
    return { lines: [`complete(${lowered.expr})`], hole: false };
  }
  return {
    lines: [`complete(StatusCodes.InternalServerError, "hub:unsupported-body")`],
    hole: true,
  };
}
