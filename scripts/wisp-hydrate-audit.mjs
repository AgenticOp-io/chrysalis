#!/usr/bin/env node
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { countWispMarkupHoles } from "./wisp-hole-metrics-lib.mjs";

const dir = "fixtures/hub-wisp-management/wisp-api-pilot-traces/2026-06-27";
const files = readdirSync(dir);
let withItems = 0;
let withStats = 0;
let rich = 0;
const samples = [];
for (const f of files) {
  const text = readFileSync(join(dir, f), "utf8");
  for (const line of text.split(/\n/)) {
    if (!line.includes('"http.response"')) continue;
    let j;
    try {
      j = JSON.parse(line);
    } catch {
      continue;
    }
    let body = j.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = null;
      }
    }
    if (!body || typeof body !== "object") continue;
    const keys = Object.keys(body);
    const hasItems = Array.isArray(body.items) && body.items.length > 0;
    const hasStats = body.stats && typeof body.stats === "object";
    const arrayKeys = keys.filter((k) => Array.isArray(body[k]) && body[k].length > 0);
    if (hasItems) withItems++;
    if (hasStats) withStats++;
    if (arrayKeys.length > 0 || hasStats) {
      rich++;
      if (samples.length < 8) samples.push({ f, keys, arrayKeys, hasStats });
    }
  }
}

const cwl = readFileSync("fixtures/hub-wisp-management/routes.cwl", "utf8");
const metrics = countWispMarkupHoles(cwl);
const unescaped = cwl.replace(/\\"/g, '"');
const eachDetails = {};
for (const m of unescaped.matchAll(
  /data-cwl-hole="legacy:markup-lift-svelte-each" data-cwl-hole-detail="([^"]+)"/g,
)) {
  eachDetails[m[1]] = (eachDetails[m[1]] ?? 0) + 1;
}
const interpKinds = {};
for (const m of unescaped.matchAll(
  /data-cwl-hole="legacy:markup-lift-svelte-interp" data-cwl-hole-detail="([^"]+)"/g,
)) {
  const d = m[1];
  const kind = d.includes("(")
    ? "call"
    : d.includes("?")
      ? "ternary"
      : d.includes(".")
        ? "path"
        : "ident";
  interpKinds[kind] = (interpKinds[kind] ?? 0) + 1;
}
const ifKinds = {};
for (const m of unescaped.matchAll(
  /data-cwl-hole="legacy:markup-lift-svelte-if" data-cwl-hole-detail="([^"]+)"/g,
)) {
  const d = m[1];
  const kind = d.startsWith("!")
    ? "neg"
    : d.includes("&&") || d.includes("||")
      ? "bool"
      : d.includes("(")
        ? "call"
        : d.includes("===") || d.includes("!==")
          ? "cmp"
          : d.includes(".")
            ? "path"
            : "ident";
  ifKinds[kind] = (ifKinds[kind] ?? 0) + 1;
}

console.log(
  JSON.stringify(
    {
      traces: files.length,
      withItems,
      withStats,
      rich,
      samples,
      metrics,
      eachTop: Object.entries(eachDetails)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12),
      interpKinds,
      ifKinds,
    },
    null,
    2,
  ),
);
