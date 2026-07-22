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
  { dir: "fixtures/ui-markup-svelte", expect: "sveltekit", minGates: 0 },
  { dir: "fixtures/ui-markup-vue", expect: "vite-vue", minGates: 1, minSlots: 1 },
  { dir: "fixtures/ui-markup-next", expect: "next-app", minGates: 1 },
  { dir: "fixtures/ui-markup-angular", expect: "angular", minGates: 1, minSlots: 1 },
  { dir: "fixtures/ui-markup-blade", expect: "php-blade", minGates: 1, minSlots: 1 },
];

let failed = 0;
const results = [];

for (const c of CASES) {
  const root = join(ROOT, c.dir);
  const adapter = detectOriginAdapter(root);
  const { origin } = inventoryOriginRoot(root);
  const gates = origin.gates?.length ?? origin.showGates?.length ?? 0;
  const slots = origin.slots?.length ?? origin.slotMentions?.length ?? 0;
  const routesOk = Array.isArray(origin.routes) && origin.routes.length > 0;
  const gatesOk = gates >= (c.minGates ?? 0);
  const slotsOk = slots >= (c.minSlots ?? 0);
  const ok = adapter.name === c.expect && routesOk && gatesOk && slotsOk;
  if (!ok) failed += 1;
  results.push({
    dir: c.dir,
    expect: c.expect,
    got: adapter.name,
    routes: origin.routes?.length ?? 0,
    gates,
    slots,
    nests: origin.nests?.length ?? 0,
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
