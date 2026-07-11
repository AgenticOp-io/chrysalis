#!/usr/bin/env node
/** One-shot triage after WISP reconvert — remaining component holes + shell counts. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { countWispMarkupHoles, classifyWispHoleBuckets } from "./wisp-hole-metrics-lib.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cwlPath = join(root, "fixtures/hub-wisp-management/routes.cwl");
const raw = readFileSync(cwlPath, "utf8");
const unescaped = raw.replace(/\\"/g, '"');
const metrics = countWispMarkupHoles(raw);
const buckets = classifyWispHoleBuckets(metrics.reasons);

  shells: {
    modal: (unescaped.match(/data-cwl-modal-shell=/g) || []).length,
    map: (unescaped.match(/data-cwl-map-shell=/g) || []).length,
    chart: (unescaped.match(/data-cwl-chart-shell=/g) || []).length,
    nav: (unescaped.match(/data-cwl-nav-shell=/g) || []).length,
    wizard: (unescaped.match(/data-cwl-wizard-shell=/g) || []).length,
  },

/** @type {Record<string, number>} */
const comps = {};
for (const m of unescaped.matchAll(
  /data-cwl-hole="legacy:markup-lift-svelte-component" data-cwl-hole-detail="([^"]+)"/g,
)) {
  comps[m[1]] = (comps[m[1]] ?? 0) + 1;
}
const sorted = Object.entries(comps).sort((a, b) => b[1] - a[1]);

const report = {
  kind: "chrysalis.wisp.reconvert-triage",
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  metrics,
  buckets,
  shells,
  componentHoles: sorted.reduce((a, [, n]) => a + n, 0),
  uniqueComponents: sorted.length,
  remainingComponents: sorted,
};

const outDir = join(root, "reports/wisp");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "reconvert-component-triage.v1.json");
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      total: metrics.total,
      buckets,
      shells,
      componentHoles: report.componentHoles,
      unique: report.uniqueComponents,
      top25: sorted.slice(0, 25),
      outPath,
    },
    null,
    2,
  ),
);
