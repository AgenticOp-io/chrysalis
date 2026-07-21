#!/usr/bin/env node
/**
 * Smoke: multi-language site-inventory adapters detect + inventory fixtures.
 * Gate: chrysalis:site-inventory-adapters-smoke
 */
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  detectOriginAdapter,
  inventoryOriginRoot,
  listAdapterNames,
} from "./lib/site-inventory/index.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const CASES = [
  { dir: "fixtures/ui-markup-svelte", expect: "sveltekit" },
  { dir: "fixtures/ui-markup-vue", expect: "vite-vue" },
  { dir: "fixtures/ui-markup-next", expect: "next-app" },
  { dir: "fixtures/ui-markup-angular", expect: "angular" },
];

let failed = 0;
const results = [];

for (const c of CASES) {
  const root = join(ROOT, c.dir);
  const adapter = detectOriginAdapter(root);
  const { origin } = inventoryOriginRoot(root);
  const ok = adapter.name === c.expect && Array.isArray(origin.routes);
  if (!ok) failed += 1;
  results.push({
    dir: c.dir,
    expect: c.expect,
    got: adapter.name,
    routes: origin.routes?.length ?? 0,
    gates: origin.gates?.length ?? origin.showGates?.length ?? 0,
    ok,
  });
}

const names = listAdapterNames();
const hasCore = ["sveltekit", "vite-vue", "next-app", "angular", "php-blade", "php", "generic"].every(
  (n) => names.includes(n),
);
if (!hasCore) failed += 1;

const report = {
  kind: "chrysalis.site-inventory-adapters-smoke",
  ok: failed === 0,
  adapters: names,
  results,
  failed,
};
console.log(JSON.stringify(report, null, 2));
process.exit(failed === 0 ? 0 : 1);
