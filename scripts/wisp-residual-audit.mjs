#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { countWispMarkupHoles } from "./wisp-hole-metrics-lib.mjs";

const fixture = "fixtures/hub-wisp-management";
const cwl = readFileSync(join(fixture, "routes.cwl"), "utf8");
const unescaped = cwl.replace(/\\"/g, '"');
const metrics = countWispMarkupHoles(cwl);
const sampleDir = join(fixture, "hydrate-samples");
const samples = existsSync(sampleDir) ? readdirSync(sampleDir).filter((f) => f.endsWith(".json")) : [];
const apis = [...cwl.matchAll(/apiPath:\s*"([^"]+)"/g)].map((m) => m[1]);
const uniq = [...new Set(apis)];
const missing = uniq.filter((a) => !samples.includes(`${a.replace(/^\//, "").replace(/\//g, "-")}.json`));

const eachDetails = {};
for (const m of unescaped.matchAll(
  /data-cwl-hole="legacy:markup-lift-svelte-each" data-cwl-hole-detail="([^"]+)"/g,
)) {
  eachDetails[m[1]] = (eachDetails[m[1]] ?? 0) + 1;
}
const ifTop = {};
for (const m of unescaped.matchAll(
  /data-cwl-hole="legacy:markup-lift-svelte-if" data-cwl-hole-detail="([^"]+)"/g,
)) {
  ifTop[m[1]] = (ifTop[m[1]] ?? 0) + 1;
}
const interpTop = {};
for (const m of unescaped.matchAll(
  /data-cwl-hole="legacy:markup-lift-svelte-interp" data-cwl-hole-detail="([^"]+)"/g,
)) {
  interpTop[m[1]] = (interpTop[m[1]] ?? 0) + 1;
}

console.log(
  JSON.stringify(
    {
      metrics,
      hydratedWidgets: (unescaped.match(/data-cwl-hydrated="1"/g) || []).length,
      sampleFiles: samples,
      apiPaths: uniq.length,
      missingSamples: missing,
      eachTop: Object.entries(eachDetails)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20),
      ifTop: Object.entries(ifTop)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 25),
      interpTop: Object.entries(interpTop)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 25),
    },
    null,
    2,
  ),
);
