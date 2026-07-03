import { SCHEMA_VERSION, type HubNativeRoute } from "./schema.js";

const SPRING_VERB_RE =
  /@(Get|Post|Put|Patch|Delete|Head|Options)Mapping\s*\(\s*(?:(?:value|path)\s*=\s*)?["']([^"']+)["']/gi;

const JAXRS_VERB_PATH_RE =
  /@(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b[\s\S]{0,120}?@Path\s*\(\s*["']([^"']+)["']\s*\)/gi;

const JAXRS_PATH_VERB_RE =
  /@Path\s*\(\s*["']([^"']+)["']\s*\)[\s\S]{0,120}?@(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b/gi;

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
      line: source.slice(0, index).split("\n").length,
      name,
    });
  }

  for (const re of [SPRING_VERB_RE, JAXRS_VERB_PATH_RE]) {
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

  return routes;
}

export { SCHEMA_VERSION };
