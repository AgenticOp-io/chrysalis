#!/usr/bin/env node
/**
 * G9961 / G9962 — UT lib extract smoke (neutral scripts/lib; wisp shims only).
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const libDir = join(root, "scripts/lib");

/** @type {string[]} */
const required = [
  "cwl-hole-metrics.mjs",
  "cwl-apply-surfaces.mjs",
  "cwl-route-lift.mjs",
  "cwl-bulk-svelte-lift.mjs",
  "cwl-api-oracle-contract.mjs",
  "cwl-static-export.mjs",
  "cwl-chimera-gateway.mjs",
  "cwl-gateway-config.mjs",
  "scrub-cwl-markup-artifacts.mjs",
  "cwl-apply-client-redirects.mjs",
  "cwl-css-lift.mjs",
  "cwl-package-ui-lift.mjs",
  "cwl-svelte-native-convert.mjs",
  "cwl-generate-api-proxy.mjs",
  "cwl-hole-manifest.mjs",
  "cwl-chimera-serve.mjs",
  "spa-static-server.mjs",
  "README.md",
];

const checks = [];
function ok(name, cond, detail = "") {
  checks.push({ name, ok: !!cond, detail });
}

ok("lib-dir", existsSync(libDir));
for (const f of required) {
  ok(`lib:${f}`, existsSync(join(libDir, f)));
}

const libFiles = existsSync(libDir)
  ? readdirSync(libDir).filter((n) => n.endsWith(".mjs"))
  : [];
ok("no-wisp-in-lib-names", libFiles.every((n) => !/wisp/i.test(n)), libFiles.filter((n) => /wisp/i.test(n)).join(","));

// Import a representative lib (hole metrics) from neutral path
try {
  const m = await import(pathToFileURL(join(libDir, "cwl-hole-metrics.mjs")).href);
  ok("import-hole-metrics", typeof m.countCwlMarkupHoles === "function");
} catch (e) {
  ok("import-hole-metrics", false, String(e && e.message));
}

try {
  const m = await import(pathToFileURL(join(libDir, "cwl-apply-surfaces.mjs")).href);
  ok("import-apply-surfaces", typeof m.replaceRouteHandlerBlock === "function");
  ok("apply-surfaces-root", typeof m.scriptRoot === "string" && existsSync(m.scriptRoot));
} catch (e) {
  ok("import-apply-surfaces", false, String(e && e.message));
}

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
ok("pkg-ut-canon-lock", typeof pkg.scripts?.["hub:ut-canon-lock-smoke"] === "string");
ok("pkg-ut-lib-extract", typeof pkg.scripts?.["hub:ut-lib-extract-smoke"] === "string");
ok("pkg-cwl-static-export-alias", typeof pkg.scripts?.["cwl:static-export"] === "string");

const passed = checks.every((c) => c.ok);
console.log(
  JSON.stringify(
    {
      kind: "chrysalis.ut.lib-extract-smoke",
      schemaVersion: 1,
      gate: "G9961",
      ok: passed,
      libFileCount: libFiles.length,
      checks,
    },
    null,
    2,
  ),
);
process.exit(passed ? 0 : 1);
