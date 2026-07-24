import { SCHEMA_VERSION, type HubNativeRoute } from "./schema.js";

const SPRING_VERB_RE =
  /@(Get|Post|Put|Patch|Delete|Head|Options)Mapping\s*\(\s*(?:(?:value|path)\s*=\s*)?["']([^"']+)["']/gi;

/** Micronaut HTTP verb annotations (io.micronaut.http.annotation) — not Spring *Mapping. */
const MICRONAUT_VERB_RE =
  /@(Get|Post|Put|Patch|Delete|Head|Options)\s*\(\s*(?:(?:value|uri)\s*=\s*)?["']([^"']+)["']/gi;

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
