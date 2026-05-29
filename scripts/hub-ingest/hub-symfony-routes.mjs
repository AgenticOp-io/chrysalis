#!/usr/bin/env node
/**
 * Symfony route ingest (G120): derive the canonical route manifest from a
 * Symfony-style `config/routes.yaml` and verify it stays in parity with the
 * hub `chrysalis.routes.json` (which `@chrysalis/ingest` consumes).
 *
 * The YAML is the human source of truth for the Symfony flagship; the JSON is
 * a generated/derived projection that ingest reads. This keeps `@chrysalis/ingest`
 * generic (manifest-driven) while removing the hand-mirror hand-wave.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

/**
 * Minimal, strict reader for the flat Symfony route map shape:
 *
 *   route_name:
 *     path: /foo/{id}
 *     methods: GET
 *     controller: App\Controller\FooController
 *
 * Not a general YAML parser — errors on anything outside this shape.
 * @param {string} text
 * @returns {Array<{ name: string, path: string, methods: string[], controller: string }>}
 */
export function parseSymfonyRoutesYaml(text) {
  const lines = text.split(/\r?\n/);
  /** @type {Array<{ name: string, path: string, methods: string[], controller: string }>} */
  const routes = [];
  /** @type {{ name: string, path?: string, methods?: string[], controller?: string } | null} */
  let current = null;

  const flush = () => {
    if (!current) return;
    if (!current.path || !current.controller || !current.methods) {
      throw new Error(`symfony-routes: incomplete route "${current.name}" (need path, methods, controller)`);
    }
    routes.push({
      name: current.name,
      path: current.path,
      methods: current.methods,
      controller: current.controller,
    });
    current = null;
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const topMatch = /^([A-Za-z_][A-Za-z0-9_]*):\s*$/.exec(line);
    if (topMatch) {
      flush();
      current = { name: topMatch[1] };
      continue;
    }

    const fieldMatch = /^\s+([A-Za-z_][A-Za-z0-9_]*):\s*(.+?)\s*$/.exec(line);
    if (fieldMatch && current) {
      const key = fieldMatch[1];
      const value = fieldMatch[2];
      if (key === "path") current.path = value;
      else if (key === "controller") current.controller = value;
      else if (key === "methods") {
        current.methods = value
          .replace(/^\[|\]$/g, "")
          .split(/[,|]/)
          .map((m) => m.trim().replace(/^['"]|['"]$/g, "").toUpperCase())
          .filter(Boolean);
      }
      continue;
    }

    throw new Error(`symfony-routes: unexpected line: ${JSON.stringify(line)}`);
  }
  flush();
  return routes;
}

/**
 * `App\Controller\FooController` -> `src/Controller/FooController.php`.
 * @param {string} fqcn
 */
export function symfonyControllerFile(fqcn) {
  const cls = fqcn.split("\\").pop();
  if (!cls) throw new Error(`symfony-routes: invalid controller FQCN ${JSON.stringify(fqcn)}`);
  return `src/Controller/${cls}.php`;
}

/**
 * Convert a Symfony path (`/items/{id}`) to the hub manifest form (`/items/:id`)
 * and extract its path params. Param type heuristic matches the existing
 * flagship manifest: a param literally named `id` is `int`, everything else
 * is `string`.
 * @param {string} symfonyPath
 */
export function symfonyPathToManifest(symfonyPath) {
  /** @type {Array<{ name: string, type: "int" | "string", phpVar: string }>} */
  const pathParams = [];
  const path = symfonyPath.replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_m, name) => {
    pathParams.push({ name, type: name === "id" ? "int" : "string", phpVar: name });
    return `:${name}`;
  });
  return { path, pathParams };
}

/**
 * Derive route manifest specs from a fixture's `config/routes.yaml`.
 * @param {string} fixtureDir
 * @returns {{ app: string, routes: Array<{ method: string, path: string, file: string, pathParams: Array<{ name: string, type: string, phpVar: string }> }> }}
 */
export function symfonyYamlToRouteSpecs(fixtureDir) {
  const yamlPath = join(fixtureDir, "config/routes.yaml");
  if (!existsSync(yamlPath)) {
    throw new Error(`symfony-routes: missing ${yamlPath}`);
  }
  const parsed = parseSymfonyRoutesYaml(readFileSync(yamlPath, "utf8"));
  const routes = [];
  for (const r of parsed) {
    const { path, pathParams } = symfonyPathToManifest(r.path);
    const file = symfonyControllerFile(r.controller);
    for (const method of r.methods) {
      if (!HTTP_METHODS.has(method)) {
        throw new Error(`symfony-routes: unsupported method ${method} on ${r.name}`);
      }
      routes.push({ method, path, file, pathParams, name: r.name });
    }
  }
  return { app: "hub-flagship-symfony", routes };
}

/**
 * Extract the first `#[Route(...)]` attribute from a source segment.
 * @param {string} segment
 * @returns {{ path: string, methods: string[], name: string | null } | null}
 */
function extractRouteAttr(segment) {
  const m = /#\[Route\(\s*(['"])([^'"]*)\1([\s\S]*?)\)\]/.exec(segment);
  if (!m) return null;
  const rest = m[3];
  /** @type {string[]} */
  const methods = [];
  const mmArray = /methods:\s*\[([^\]]*)\]/.exec(rest);
  if (mmArray) {
    // Array form: methods: ['GET', 'POST']
    for (const tok of mmArray[1].split(",")) {
      const t = tok.trim().replace(/^['"]|['"]$/g, "").toUpperCase();
      if (t) methods.push(t);
    }
  } else {
    // Scalar string form: methods: 'POST'
    const mmString = /methods:\s*(['"])([A-Za-z]+)\1/.exec(rest);
    if (mmString) methods.push(mmString[2].toUpperCase());
  }
  const nm = /name:\s*(['"])([^'"]+)\1/.exec(rest);
  return { path: m[2], methods, name: nm ? nm[2] : null };
}

/**
 * Join a Symfony class-level prefix with a method-level path.
 * @param {string} prefix
 * @param {string} path
 */
function joinSymfonyPaths(prefix, path) {
  const a = (prefix ?? "").replace(/\/+$/, "");
  const b = path ?? "";
  if (!b) return a || "/";
  const bb = b.startsWith("/") ? b : `/${b}`;
  return `${a}${bb}` || "/";
}

/**
 * Parse a Symfony controller's effective `#[Route(...)]`, combining an optional
 * class-level prefix attribute with the method-level attribute. Supports:
 *   #[Route('/api')]            (class prefix)
 *   final class FooController {
 *     #[Route('/items/{id}', name: 'items_show', methods: ['GET'])]
 *     public function __invoke(): void
 * @param {string} phpSource
 * @returns {{ path: string, methods: string[], name: string | null } | null}
 */
export function parseSymfonyAttributeRoute(phpSource) {
  const classIdx = phpSource.search(/\b(?:final\s+|abstract\s+)*class\s+/);
  let classPrefix = null;
  let methodPart = phpSource;
  if (classIdx >= 0) {
    classPrefix = extractRouteAttr(phpSource.slice(0, classIdx));
    methodPart = phpSource.slice(classIdx);
  }
  const methodAttr = extractRouteAttr(methodPart);

  if (!methodAttr) {
    if (!classPrefix) return null;
    return {
      path: classPrefix.path,
      methods: classPrefix.methods.length ? classPrefix.methods : ["GET"],
      name: classPrefix.name,
    };
  }

  const path = classPrefix ? joinSymfonyPaths(classPrefix.path, methodAttr.path) : methodAttr.path;
  const methods = methodAttr.methods.length
    ? methodAttr.methods
    : classPrefix?.methods.length
      ? classPrefix.methods
      : ["GET"];
  const name =
    classPrefix?.name && methodAttr.name
      ? `${classPrefix.name}${methodAttr.name}`
      : (methodAttr.name ?? classPrefix?.name ?? null);
  return { path, methods, name };
}

/**
 * Derive route manifest specs from `#[Route]` attributes on `src/Controller/*.php`.
 * @param {string} fixtureDir
 * @returns {{ app: string, routes: Array<{ method: string, path: string, file: string, pathParams: Array<{ name: string, type: string, phpVar: string }> }> }}
 */
export function symfonyAttributeRouteSpecs(fixtureDir) {
  const controllerDir = join(fixtureDir, "src/Controller");
  if (!existsSync(controllerDir)) {
    throw new Error(`symfony-routes: missing ${controllerDir}`);
  }
  const routes = [];
  for (const name of readdirSync(controllerDir).sort()) {
    if (!name.endsWith(".php")) continue;
    const attr = parseSymfonyAttributeRoute(readFileSync(join(controllerDir, name), "utf8"));
    if (!attr) continue;
    const { path, pathParams } = symfonyPathToManifest(attr.path);
    const file = `src/Controller/${name}`;
    for (const method of attr.methods) {
      if (!HTTP_METHODS.has(method)) {
        throw new Error(`symfony-routes: unsupported method ${method} in ${file}`);
      }
      routes.push({ method, path, file, pathParams, name: attr.name });
    }
  }
  return { app: "hub-flagship-symfony", routes };
}

/**
 * @param {{ method: string, path: string, file: string, pathParams: Array<{ name: string, type: string, phpVar?: string }> }} r
 */
function routeKey(r) {
  const params = (r.pathParams ?? [])
    .map((p) => `${p.name}:${p.type}:${p.phpVar ?? p.name}`)
    .sort()
    .join(",");
  return `${r.method} ${r.path} | ${r.file} | ${params}`;
}

/**
 * Verify `config/routes.yaml` (source of truth) matches `chrysalis.routes.json`
 * (ingest input). Returns parity result with any mismatched route keys.
 * @param {string} fixtureDir
 */
export function symfonyRouteManifestParity(fixtureDir) {
  const derived = symfonyYamlToRouteSpecs(fixtureDir);
  const manifestPath = join(fixtureDir, "chrysalis.routes.json");
  if (!existsSync(manifestPath)) {
    return { ok: false, reason: "missing-chrysalis-routes-json", yamlRouteCount: derived.routes.length };
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const manifestRoutes = Array.isArray(manifest.routes) ? manifest.routes : [];

  const derivedKeys = new Set(derived.routes.map(routeKey));
  const manifestKeys = new Set(manifestRoutes.map(routeKey));

  const onlyInYaml = [...derivedKeys].filter((k) => !manifestKeys.has(k));
  const onlyInManifest = [...manifestKeys].filter((k) => !derivedKeys.has(k));
  const yamlOk = onlyInYaml.length === 0 && onlyInManifest.length === 0;

  const attrSpecs = symfonyAttributeRouteSpecs(fixtureDir).routes;
  const attrKeys = new Set(attrSpecs.map(routeKey));
  const onlyInAttributes = [...attrKeys].filter((k) => !manifestKeys.has(k));
  const onlyInManifestVsAttributes = [...manifestKeys].filter((k) => !attrKeys.has(k));
  const attributesOk = onlyInAttributes.length === 0 && onlyInManifestVsAttributes.length === 0;

  // Route-name parity (yaml top-level keys vs the names resolved from #[Route]
  // attributes, including class-level `name:` prefixes). The manifest is name-less
  // by design (it is the runtime projection), so names are a source-only concern.
  const yamlNames = new Set(derived.routes.map((r) => r.name).filter(Boolean));
  const attrNames = new Set(attrSpecs.map((r) => r.name).filter(Boolean));
  const namesOnlyInYaml = [...yamlNames].filter((n) => !attrNames.has(n)).sort();
  const namesOnlyInAttributes = [...attrNames].filter((n) => !yamlNames.has(n)).sort();
  const namesOk = namesOnlyInYaml.length === 0 && namesOnlyInAttributes.length === 0;

  return {
    ok: yamlOk && attributesOk && namesOk,
    yamlRouteCount: derived.routes.length,
    manifestRouteCount: manifestRoutes.length,
    onlyInYaml,
    onlyInManifest,
    attributes: {
      ok: attributesOk,
      attributeRouteCount: attrSpecs.length,
      onlyInAttributes,
      onlyInManifest: onlyInManifestVsAttributes,
    },
    names: {
      ok: namesOk,
      yamlNameCount: yamlNames.size,
      attributeNameCount: attrNames.size,
      onlyInYaml: namesOnlyInYaml,
      onlyInAttributes: namesOnlyInAttributes,
    },
  };
}

function main() {
  const fixtureDir = resolve(process.argv[2] ?? "fixtures/hub-flagship-symfony");
  const parity = symfonyRouteManifestParity(fixtureDir);
  console.log(JSON.stringify(parity, null, 2));
  if (!parity.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]).endsWith("hub-symfony-routes.mjs");
if (isCli) main();
