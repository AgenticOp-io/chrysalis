#!/usr/bin/env node
/**
 * G9904 — scrub leaked Svelte `true}` / `/>` tails from WISP CWL HTML surfaces.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function loadScrub() {
  try {
    const ingest = await import("@chrysalis/ingest");
    return ingest.scrubStructuralMarkupArtifacts;
  } catch {
    const mod = await import(
      pathToFileURL(join(ROOT, "packages/ingest/dist/ui-markup-svelte-structural.js")).href
    );
    return mod.scrubStructuralMarkupArtifacts;
  }
}

function walkHtmlFiles(dir, out = []) {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkHtmlFiles(p, out);
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

function scrubCwlHtmlLiterals(text, scrub) {
  // return html "....";  — unescape, scrub, re-escape carefully via JSON
  return text.replace(/return html "((?:\\.|[^"\\])*)";/g, (full, body) => {
    const unescaped = JSON.parse(`"${body}"`);
    const cleaned = scrub(unescaped);
    if (cleaned === unescaped) return full;
    return `return html ${JSON.stringify(cleaned)};`;
  });
}

async function main() {
  const scrub = await loadScrub();
  const fixture = join(ROOT, "fixtures/hub-wisp-management");
  const routesPath = join(fixture, "routes.cwl");
  let routesChanged = false;
  if (statSync(routesPath, { throwIfNoEntry: false })) {
    const before = readFileSync(routesPath, "utf8");
    const after = scrubCwlHtmlLiterals(before, scrub);
    if (after !== before) {
      writeFileSync(routesPath, after, "utf8");
      routesChanged = true;
    }
  }

  const exportDir = join(fixture, "cwl-static-export");
  let htmlChanged = 0;
  for (const file of walkHtmlFiles(exportDir)) {
    const before = readFileSync(file, "utf8");
    const after = scrub(before);
    if (after !== before) {
      writeFileSync(file, after, "utf8");
      htmlChanged++;
    }
  }

  const leakRe = /(?:true|false)\}\s*/;
  const routesAfter = readFileSync(routesPath, "utf8");
  const routesLeak = leakRe.test(routesAfter) && /cwl-nav-shell[\s\S]{0,80}true\}/.test(routesAfter);
  // Count remaining visible artifact patterns near shells
  const artifactCount = (routesAfter.match(/\s(?:true|false)\}\s*\\n\s*\/>/g) || []).length
    + (routesAfter.match(/\s(?:true|false)\}\s*\/>/g) || []).length;

  console.log(
    JSON.stringify(
      {
        ok: artifactCount === 0,
        routesChanged,
        htmlChanged,
        artifactCount,
        routesPath,
      },
      null,
      2,
    ),
  );
  if (artifactCount !== 0) process.exit(1);
}

export { main as runScrubCwlMarkupArtifacts };

if (
  process.argv[1] &&
  (process.argv[1].includes("scrub-cwl-markup-artifacts") ||
    process.argv[1].includes("wisp-scrub-markup-artifacts"))
) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
