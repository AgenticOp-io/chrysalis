/**
 * pnpmfile: keep lockfile importers for CWL junction packages.
 *
 * Convert homes runtime-cwl* / emit-runtime-cwl as Windows junctions (or
 * symlinks) into ../chrysalis-cwl/packages/*. pnpm discovers them, but because
 * realpath() escapes the Convert root it drops their importers on write — which
 * breaks workspace:* linking after a clean install.
 *
 * afterAllResolved re-injects importers (with `specifiers`) from each
 * package.json. A companion script
 * `scripts/link-cwl-junction-workspace-deps.mjs` materializes node_modules
 * links because pnpm still refuses to write into out-of-tree realpaths.
 */
const fs = require("fs");
const path = require("path");

const JUNCTION_DIRS = [
  "packages/runtime-cwl",
  "packages/runtime-cwl-browser",
  "packages/runtime-cwl-worker",
  "packages/emit-runtime-cwl",
];

function workspaceLink(fromDir, depName) {
  const short = depName.replace(/^@chrysalis\//, "");
  const fromAbs = path.join(__dirname, fromDir);
  const targetAbs = path.join(__dirname, "packages", short);
  let rel = path.relative(fromAbs, targetAbs).replace(/\\/g, "/");
  if (!rel.startsWith(".")) rel = "./" + rel;
  return `link:${rel}`;
}

function refOf(meta) {
  if (meta == null) return meta;
  if (typeof meta === "string") return meta;
  if (typeof meta === "object" && typeof meta.version === "string") return meta.version;
  return meta;
}

function collectRegistryVersions(importers) {
  const map = new Map();
  for (const importer of Object.values(importers || {})) {
    for (const section of ["dependencies", "devDependencies", "optionalDependencies"]) {
      const deps = importer?.[section];
      if (!deps) continue;
      for (const [name, meta] of Object.entries(deps)) {
        const version = refOf(meta);
        if (typeof version !== "string") continue;
        if (version.startsWith("link:") || version.startsWith("file:")) continue;
        if (!map.has(name)) map.set(name, version);
      }
    }
  }
  return map;
}

function buildImporter(relDir, pkg, registryVersions) {
  const out = {
    dependencies: {},
    devDependencies: {},
    optionalDependencies: {},
    specifiers: {},
  };
  for (const section of ["dependencies", "devDependencies"]) {
    const deps = pkg[section];
    if (!deps) continue;
    for (const [name, specifier] of Object.entries(deps)) {
      const spec = String(specifier);
      out.specifiers[name] = spec;
      if (spec.startsWith("workspace:")) {
        out[section][name] = workspaceLink(relDir, name);
      } else {
        let version = registryVersions.get(name);
        if (!version) {
          if (name === "@types/node") version = "20.19.41";
          else if (name === "vitest") version = "4.1.5";
          else throw new Error(`[pnpmfile] cannot resolve ${name}@${spec}`);
        }
        out[section][name] = version;
      }
    }
  }
  return out;
}

function injectJunctionImporters(lockfile) {
  if (!lockfile.importers) lockfile.importers = {};
  const registryVersions = collectRegistryVersions(lockfile.importers);
  const injected = [];
  for (const relDir of JUNCTION_DIRS) {
    const pkgPath = path.join(__dirname, relDir, "package.json");
    if (!fs.existsSync(pkgPath)) {
      console.warn(`[pnpmfile] skip missing ${relDir}/package.json`);
      continue;
    }
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    lockfile.importers[relDir] = buildImporter(relDir, pkg, registryVersions);
    injected.push(relDir);
  }
  if (injected.length) {
    console.log(`[pnpmfile] injected junction importers: ${injected.join(", ")}`);
  }
  return lockfile;
}

module.exports = {
  hooks: {
    afterAllResolved(lockfile) {
      return injectJunctionImporters(lockfile);
    },
  },
};
