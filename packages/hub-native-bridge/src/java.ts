import { SCHEMA_VERSION, type HubNativeRoute } from "./schema.js";

const SPRING_VERB_RE =
  /@(Get|Post|Put|Patch|Delete|Head|Options)Mapping\s*\(\s*(?:(?:value|path)\s*=\s*)?["']([^"']+)["']/gi;

/** Micronaut HTTP verb annotations (io.micronaut.http.annotation) — not Spring *Mapping. */
const MICRONAUT_VERB_RE =
  /@(Get|Post|Put|Patch|Delete|Head|Options)\s*\(\s*(?:(?:value|uri)\s*=\s*)?["']([^"']+)["']/gi;

/** Javalin fluent routes: app.get|post|…("/path", ctx -> …) — not Spring/Micronaut annotations. */
const JAVALIN_VERB_RE =
  /\.(get|post|put|patch|delete)\s*\(\s*["']([^"']+)["']\s*,/gi;

const JAVALIN_CREATE_RE = /\bJavalin\s*\.\s*create\s*\(|\bio\.javalin\b|\bimport\s+io\.javalin\b/;

/** Spark Java static routes: spark.Spark.get|post|…("/path", (req, res) -> …). */
const SPARK_VERB_RE =
  /spark\.Spark\.(get|post|put|patch|delete|head|options)\s*\(\s*["']([^"']+)["']/gi;

const SPARK_MARKER_RE = /\bspark\.Spark\.(?:get|post|put|patch|delete|head|options)\b|\bimport\s+spark\.Spark\b|\bimport\s+static\s+spark\.Spark\b/;

/**
 * Jooby (G10046): `new Jooby() {{ get("/path", ctx -> …); }}` or `app.get("/path", …)`.
 * Bare get|post (no leading `.`) inside instance initializers + dotted app.get form.
 */
const JOOBY_MARKER_RE =
  /\bnew\s+Jooby\s*\(|\bextends\s+Jooby\b|\bio\.jooby\b|\bimport\s+io\.jooby\b/;

const JOOBY_DOT_VERB_RE =
  /\.(get|post|put|patch|delete)\s*\(\s*["']([^"']+)["']/gi;

/** Bare Jooby router verbs — not `.get` / not identifier-qualified. */
const JOOBY_BARE_VERB_RE =
  /(?<![\w.])(get|post|put|patch|delete)\s*\(\s*["']([^"']+)["']/gi;

/**
 * Vert.x Web (G10052): Router.router(vertx) + router.get|post|…("/path").handler(ctx -> …).
 * Distinct from Javalin (comma handler arg) and Jooby (no `.handler`).
 */
const VERTX_MARKER_RE =
  /\bRouter\s*\.\s*router\s*\(|\bio\.vertx\.ext\.web\b|\bimport\s+io\.vertx\.ext\.web(?:\.Router)?\b/;

const VERTX_VERB_RE =
  /\.(get|post|put|patch|delete|head|options)\s*\(\s*["']([^"']+)["']\s*\)\s*\.\s*handler\s*\(/gi;

/**
 * Spring WebFlux RouterFunctions (G10061): route(GET("/path"), req -> …) / .andRoute(…).
 * Distinct from Spring MVC @*Mapping (flagship ST) and Vert.x Router.router.
 * No WebClient invent (D6447).
 */
const WEBFLUX_MARKER_RE =
  /\bRouterFunctions\b|\bRouterFunction\s*<|\borg\.springframework\.web\.reactive\.function\.server\b|\bimport\s+static\s+org\.springframework\.web\.reactive\.function\.server\./;

const WEBFLUX_ROUTE_RE =
  /\b(?:route|andRoute)\s*\(\s*(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(\s*["']([^"']+)["']\s*\)\s*,/gi;

const JAXRS_VERB_PATH_RE =
  /@(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b\s*(?:@\w+(?:\([^)]*\))?\s*)*@Path(?!Param)\s*\(\s*["']([^"']+)["']\s*\)/gi;

const JAXRS_PATH_VERB_RE =
  /@Path(?!Param)\s*\(\s*["']([^"']+)["']\s*\)\s*(?:@\w+(?:\([^)]*\))?\s*)*@(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b/gi;

const JAVA_JAXRS_CLASS_RE =
  /(\/(?:\*[\s\S]*?\*\/)?\s*)*(?:@\w+(?:\([^)]*\))?\s*)*@Path(?:\([^)]*\))?\s*[\s\S]*?public\s+(?:abstract\s+)?class\s+\w+[^{]*\{/g;
const JAVA_CLASS_PATH_RE = /@Path(?!Param)\s*\(\s*["']([^"']*)["']\s*\)/i;

const JAVA_MICRONAUT_CLASS_RE =
  /(\/(?:\*[\s\S]*?\*\/)?\s*)*(?:@\w+(?:\([^)]*\))?\s*)*@Controller(?:\([^)]*\))?\s*[\s\S]*?public\s+(?:abstract\s+)?class\s+\w+[^{]*\{/g;
const JAVA_CONTROLLER_PATH_RE =
  /@Controller\s*(?:\(\s*(?:(?:value|uri)\s*=\s*)?["']([^"']*)["']\s*\))?/i;

function lineAt(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
}

/** Join JAX-RS class @Path prefix + method @Path (Nest/ASP.NET parallel). */
export function joinJavaJaxrsPath(prefix: string, methodPath: string): string {
  const p = String(prefix ?? "")
    .trim()
    .replace(/\/+$/, "");
  const m = String(methodPath ?? "")
    .trim()
    .replace(/^\/+/, "");
  if (m.startsWith("/")) return m;
  if (!p && !m) return "/";
  if (!p) return `/${m}`;
  const base = p.startsWith("/") ? p : `/${p}`;
  if (!m) return base || "/";
  return `${base}/${m}`.replace(/\/{2,}/g, "/");
}

/** Join Micronaut @Controller prefix + @Get|Post|… path (same join rules as JAX-RS). */
export const joinJavaMicronautPath = joinJavaJaxrsPath;

function classBodyEnd(source: string, openBraceIndex: number): number {
  let depth = 0;
  for (let i = openBraceIndex; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return source.length;
}

function pathPrefixFromHeader(header: string): string {
  const m = header.match(JAVA_CLASS_PATH_RE);
  return m ? (m[1] ?? "") : "";
}

function controllerPrefixFromHeader(header: string): string {
  const m = header.match(JAVA_CONTROLLER_PATH_RE);
  return m && m[1] !== undefined ? m[1] : "";
}

function parseJavaJaxrsResourceRoutes(
  source: string,
): Array<HubNativeRoute & { index: number }> {
  /** @type {Array<HubNativeRoute & { index: number }>} */
  const routes = [];
  JAVA_JAXRS_CLASS_RE.lastIndex = 0;
  let cls: RegExpExecArray | null;
  while ((cls = JAVA_JAXRS_CLASS_RE.exec(source)) !== null) {
    const prefix = pathPrefixFromHeader(cls[0] ?? "");
    const openBrace = cls.index + cls[0].length - 1;
    const bodyEnd = classBodyEnd(source, openBrace);
    const classBody = source.slice(openBrace + 1, bodyEnd);
    for (const re of [JAXRS_VERB_PATH_RE, JAXRS_PATH_VERB_RE]) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(classBody)) !== null) {
        if (re === JAXRS_PATH_VERB_RE) {
          const path = joinJavaJaxrsPath(prefix, m[1] ?? "");
          const method = m[2] ?? "GET";
          const index = openBrace + 1 + m.index;
          routes.push({
            method: method.toUpperCase(),
            path,
            line: lineAt(source, index),
            name: `r_${routes.length}`,
            index,
          });
        } else {
          const method = m[1] ?? "GET";
          const path = joinJavaJaxrsPath(prefix, m[2] ?? "");
          const index = openBrace + 1 + m.index;
          routes.push({
            method: method.toUpperCase(),
            path,
            line: lineAt(source, index),
            name: `r_${routes.length}`,
            index,
          });
        }
      }
    }
  }
  return routes;
}

function parseJavaMicronautControllerRoutes(
  source: string,
): Array<HubNativeRoute & { index: number }> {
  /** @type {Array<HubNativeRoute & { index: number }>} */
  const routes = [];
  JAVA_MICRONAUT_CLASS_RE.lastIndex = 0;
  let cls: RegExpExecArray | null;
  while ((cls = JAVA_MICRONAUT_CLASS_RE.exec(source)) !== null) {
    const prefix = controllerPrefixFromHeader(cls[0] ?? "");
    const openBrace = cls.index + cls[0].length - 1;
    const bodyEnd = classBodyEnd(source, openBrace);
    const classBody = source.slice(openBrace + 1, bodyEnd);
    MICRONAUT_VERB_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = MICRONAUT_VERB_RE.exec(classBody)) !== null) {
      const method = m[1] ?? "GET";
      const path = joinJavaMicronautPath(prefix, m[2] ?? "");
      const index = openBrace + 1 + m.index;
      routes.push({
        method: method.toUpperCase(),
        path,
        line: lineAt(source, index),
        name: `r_${routes.length}`,
        index,
      });
    }
  }
  return routes;
}

/** Normalize Javalin path literals (already `{id}` brace form). */
export function normalizeJavaJavalinPath(path: string): string {
  const p = String(path ?? "").trim();
  if (!p) return "/";
  return p.startsWith("/") ? p : `/${p}`;
}

/** Normalize Jooby path literals (already `{id}` brace form — same as Javalin). */
export const normalizeJavaJoobyPath = normalizeJavaJavalinPath;

/** Normalize Spark `:id` path templates → `{id}` (Echo/Fiber parallel). */
export function normalizeJavaSparkPath(path: string): string {
  const p = String(path ?? "").trim();
  if (!p) return "/";
  const withSlash = p.startsWith("/") ? p : `/${p}`;
  return withSlash.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, "{$1}");
}

/** Normalize Vert.x `:id` path templates → `{id}` (same as Spark). */
export const normalizeJavaVertxPath = normalizeJavaSparkPath;

/** Normalize WebFlux path literals (already `{id}` brace form — same as Javalin). */
export const normalizeJavaWebFluxPath = normalizeJavaJavalinPath;

function parseJavaJavalinRoutes(
  source: string,
): Array<HubNativeRoute & { index: number }> {
  const routes: Array<HubNativeRoute & { index: number }> = [];
  if (!JAVALIN_CREATE_RE.test(source)) return routes;
  JAVALIN_VERB_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = JAVALIN_VERB_RE.exec(source)) !== null) {
    // Do not steal spark.Spark.get|post|… when both markers appear (additive coexist).
    const absIdx = m.index;
    const lookBehind = source.slice(Math.max(0, absIdx - 12), absIdx);
    if (/spark\.Spark$/.test(lookBehind)) continue;
    const method = (m[1] ?? "get").toUpperCase();
    const path = normalizeJavaJavalinPath(m[2] ?? "/");
    routes.push({
      method,
      path,
      line: lineAt(source, m.index),
      name: `javalin_${method}_${path.replace(/[^a-zA-Z0-9]+/g, "_")}`,
      index: m.index,
    });
  }
  return routes;
}

function parseJavaSparkRoutes(
  source: string,
): Array<HubNativeRoute & { index: number }> {
  const routes: Array<HubNativeRoute & { index: number }> = [];
  if (!SPARK_MARKER_RE.test(source)) return routes;
  SPARK_VERB_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SPARK_VERB_RE.exec(source)) !== null) {
    const method = (m[1] ?? "get").toUpperCase();
    const path = normalizeJavaSparkPath(m[2] ?? "/");
    routes.push({
      method,
      path,
      line: lineAt(source, m.index),
      name: `spark_${method}_${path.replace(/[^a-zA-Z0-9]+/g, "_")}`,
      index: m.index,
    });
  }
  return routes;
}

function parseJavaJoobyRoutes(
  source: string,
): Array<HubNativeRoute & { index: number }> {
  const routes: Array<HubNativeRoute & { index: number }> = [];
  if (!JOOBY_MARKER_RE.test(source)) return routes;

  function pushMatch(m: RegExpExecArray, absIdx: number) {
    const lookBehind = source.slice(Math.max(0, absIdx - 12), absIdx);
    // Do not steal spark.Spark.get|post|… when both markers appear.
    if (/spark\.Spark$/.test(lookBehind)) return;
    // Do not steal Vert.x router.get("/path").handler(…) (no Jooby comma handler).
    const after = source.slice(absIdx, absIdx + 120);
    if (/^\.(?:get|post|put|patch|delete)\s*\(\s*["'][^"']+["']\s*\)\s*\.\s*handler\s*\(/i.test(after)) {
      return;
    }
    const method = (m[1] ?? "get").toUpperCase();
    const path = normalizeJavaJoobyPath(m[2] ?? "/");
    routes.push({
      method,
      path,
      line: lineAt(source, absIdx),
      name: `jooby_${method}_${path.replace(/[^a-zA-Z0-9]+/g, "_")}`,
      index: absIdx,
    });
  }

  JOOBY_DOT_VERB_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = JOOBY_DOT_VERB_RE.exec(source)) !== null) {
    pushMatch(m, m.index);
  }
  JOOBY_BARE_VERB_RE.lastIndex = 0;
  while ((m = JOOBY_BARE_VERB_RE.exec(source)) !== null) {
    pushMatch(m, m.index);
  }
  return routes;
}

function parseJavaVertxRoutes(
  source: string,
): Array<HubNativeRoute & { index: number }> {
  const routes: Array<HubNativeRoute & { index: number }> = [];
  if (!VERTX_MARKER_RE.test(source)) return routes;
  VERTX_VERB_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = VERTX_VERB_RE.exec(source)) !== null) {
    const method = (m[1] ?? "get").toUpperCase();
    const path = normalizeJavaVertxPath(m[2] ?? "/");
    routes.push({
      method,
      path,
      line: lineAt(source, m.index),
      name: `vertx_${method}_${path.replace(/[^a-zA-Z0-9]+/g, "_")}`,
      index: m.index,
    });
  }
  return routes;
}

function parseJavaWebFluxRoutes(
  source: string,
): Array<HubNativeRoute & { index: number }> {
  const routes: Array<HubNativeRoute & { index: number }> = [];
  if (!WEBFLUX_MARKER_RE.test(source)) return routes;
  WEBFLUX_ROUTE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = WEBFLUX_ROUTE_RE.exec(source)) !== null) {
    const method = (m[1] ?? "GET").toUpperCase();
    const path = normalizeJavaWebFluxPath(m[2] ?? "/");
    routes.push({
      method,
      path,
      line: lineAt(source, m.index),
      name: `webflux_${method}_${path.replace(/[^a-zA-Z0-9]+/g, "_")}`,
      index: m.index,
    });
  }
  return routes;
}

export function parseJavaRoutes(source: string, _file?: string): HubNativeRoute[] {
  const routes: HubNativeRoute[] = [];
  const seen = new Set<string>();

  function push(method: string, path: string, index: number, name: string) {
    const key = `${method.toUpperCase()}:${path}`;
    if (seen.has(key)) return;
    seen.add(key);
    routes.push({
      method: method.toUpperCase(),
      path,
      line: lineAt(source, index),
      name,
    });
  }

  const sparkRoutes = parseJavaSparkRoutes(source);
  for (const r of sparkRoutes) {
    push(r.method, r.path, r.index ?? 0, r.name ?? `handler_${routes.length}`);
  }

  const webfluxRoutes = parseJavaWebFluxRoutes(source);
  for (const r of webfluxRoutes) {
    push(r.method, r.path, r.index ?? 0, r.name ?? `handler_${routes.length}`);
  }

  const vertxRoutes = parseJavaVertxRoutes(source);
  for (const r of vertxRoutes) {
    push(r.method, r.path, r.index ?? 0, r.name ?? `handler_${routes.length}`);
  }

  const joobyRoutes = parseJavaJoobyRoutes(source);
  for (const r of joobyRoutes) {
    push(r.method, r.path, r.index ?? 0, r.name ?? `handler_${routes.length}`);
  }

  const javalinRoutes = parseJavaJavalinRoutes(source);
  for (const r of javalinRoutes) {
    push(r.method, r.path, r.index ?? 0, r.name ?? `handler_${routes.length}`);
  }

  const micronautClassRoutes = parseJavaMicronautControllerRoutes(source);
  for (const r of micronautClassRoutes) {
    push(r.method, r.path, r.index ?? 0, `handler_${routes.length}`);
  }

  const jaxrsClassRoutes = parseJavaJaxrsResourceRoutes(source);
  for (const r of jaxrsClassRoutes) {
    push(r.method, r.path, r.index ?? 0, `handler_${routes.length}`);
  }

  for (const re of [SPRING_VERB_RE]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) {
      push(m[1] ?? "GET", m[2] ?? "/", m.index, `handler_${routes.length}`);
    }
  }

  if (micronautClassRoutes.length === 0) {
    MICRONAUT_VERB_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = MICRONAUT_VERB_RE.exec(source)) !== null) {
      push(m[1] ?? "GET", m[2] ?? "/", m.index, `handler_${routes.length}`);
    }
  }

  if (jaxrsClassRoutes.length === 0) {
    for (const re of [JAXRS_VERB_PATH_RE]) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(source)) !== null) {
        push(m[1] ?? "GET", m[2] ?? "/", m.index, `handler_${routes.length}`);
      }
    }

    JAXRS_PATH_VERB_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = JAXRS_PATH_VERB_RE.exec(source)) !== null) {
      push(m[2] ?? "GET", m[1] ?? "/", m.index, `handler_${routes.length}`);
    }
  }

  return routes;
}

export { SCHEMA_VERSION };
