/**
 * Resolve multi-file CWL modules (RFC-0009 / G155).
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseCwlModule } from "./cwl-parser.mjs";

/**
 * @param {string} method
 * @param {string} path
 */
function routeKey(method, path) {
  return `${String(method).toUpperCase()} ${path}`;
}

/**
 * @param {ReturnType<typeof parseCwlModule>} target
 * @param {ReturnType<typeof parseCwlModule>} fragment
 */
function mergeCwlModuleFragment(target, fragment) {
  for (const use of fragment.moduleUses ?? []) {
    if (!target.moduleUses.includes(use)) target.moduleUses.push(use);
  }
  for (const auth of fragment.moduleAuthUses ?? []) {
    if (!target.moduleAuthUses.includes(auth)) target.moduleAuthUses.push(auth);
  }
  target.routes.push(...(fragment.routes ?? []));
}

/**
 * Mark duplicate method+path routes with an honest hole.
 * @param {ReturnType<typeof parseCwlModule>} parsed
 */
export function markDuplicateCwlRoutes(parsed) {
  /** @type {Map<string, number[]>} */
  const byKey = new Map();
  parsed.routes.forEach((route, index) => {
    const key = routeKey(route.method, route.path);
    const bucket = byKey.get(key) ?? [];
    bucket.push(index);
    byKey.set(key, bucket);
  });
  for (const indexes of byKey.values()) {
    if (indexes.length < 2) continue;
    for (const index of indexes) {
      parsed.routes[index] = {
        ...parsed.routes[index],
        body: { kind: "hole", reason: "cwl:duplicate-route" },
      };
    }
  }
}

/**
 * Resolve a CWL entry file and its `import "…";` graph into one module.
 * @param {string} entryPath
 * @param {(path: string) => string} [readFile]
 * @param {string[]} [stack]
 */
export function resolveCwlModuleFromPath(entryPath, readFile = (p) => readFileSync(p, "utf8"), stack = []) {
  const abs = resolve(entryPath);
  if (stack.includes(abs)) {
    throw new Error(`cwl:import-cycle:${abs}`);
  }
  const source = readFile(abs);
  const parsed = parseCwlModule(source, abs);
  const nextStack = [...stack, abs];
  for (const imp of parsed.imports ?? []) {
    const childPath = resolve(dirname(abs), imp);
    const child = resolveCwlModuleFromPath(childPath, readFile, nextStack);
    mergeCwlModuleFragment(parsed, child);
  }
  markDuplicateCwlRoutes(parsed);
  return parsed;
}

/**
 * Parse CWL from source, resolving imports when `filePath` exists on disk.
 * @param {string} source
 * @param {string} file
 * @param {{ exists?: (path: string) => boolean, readFile?: (path: string) => string }} [opts]
 */
export function parseCwlModuleResolved(source, file, opts = {}) {
  const abs = opts.baseDir ? resolve(opts.baseDir, file) : resolve(file);
  const exists = opts.exists ?? ((p) => {
    try {
      readFileSync(p);
      return true;
    } catch {
      return false;
    }
  });
  if (exists(abs)) {
    return resolveCwlModuleFromPath(abs, opts.readFile);
  }
  const parsed = parseCwlModule(source, file);
  markDuplicateCwlRoutes(parsed);
  return parsed;
}
