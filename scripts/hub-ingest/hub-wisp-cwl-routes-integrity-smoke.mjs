#!/usr/bin/env node
/**
 * G9830 — WISP routes.cwl apply integrity (string-aware replace + no post-brace junk).
 * Guards the failure mode that left live /login+/dashboard as 501 and dead-end `/`.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  replaceRouteHandlerBlock,
  findPostBraceJunkLines,
  inspectRoutesCwlIntegrity,
  cwlHtmlReturn,
} from "../wisp-cwl-apply-surfaces-lib.mjs";

export const WISP_CWL_ROUTES_INTEGRITY_KIND = "chrysalis.wisp-cwl-routes-integrity-smoke";
export const WISP_CWL_ROUTES_INTEGRITY_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const routesPath = join(scriptRoot, "fixtures/hub-wisp-management/routes.cwl");
const fullBuildPath = join(scriptRoot, "scripts/wisp-cwl-full-build.mjs");
const pipelinePath = join(scriptRoot, "scripts/wisp-cwl-pipeline.mjs");

/** Unit: braces inside return html strings must not truncate the page block. */
export function runReplaceRouteHandlerBlockBraceGate() {
  const html =
    '<div class="x">{ count: {n} }</div><script>if ( Cond) { location.replace("/login"); }</script>';
  const oldBlock = `@page GET "/demo-brace"
page demo_brace_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  ${cwlHtmlReturn(html)}
}
JUNK leftover that would become cwl:unknown-statement
@page GET "/next"
page next_page {
  effects: none;
  return html "<p>next</p>";
}`;
  const replacement = `@page GET "/demo-brace"
page demo_brace_page {
  effects: none;
  content-type "text/html; charset=utf-8";
  ${cwlHtmlReturn('<!DOCTYPE html><html><body><script>location.replace("/login");</script></body></html>')}
}`;
  const naiveEarlyClose = (() => {
    // Simulate pre-fix matcher: first } inside the HTML string.
    const start = oldBlock.indexOf('@page GET "/demo-brace"');
    const brace = oldBlock.indexOf("{", start);
    let depth = 0;
    for (let i = brace; i < oldBlock.length; i++) {
      if (oldBlock[i] === "{") depth++;
      else if (oldBlock[i] === "}") {
        depth--;
        if (depth === 0) return i + 1;
      }
    }
    return -1;
  })();
  const applied = replaceRouteHandlerBlock(oldBlock, ['@page GET "/demo-brace"'], replacement);
  const junkAfter = findPostBraceJunkLines(applied.text);
  const hasNext = applied.text.includes('@page GET "/next"');
  const hasReplace = applied.text.includes("location.replace");
  const earlyWouldLeaveJunk = naiveEarlyClose > 0 && oldBlock.slice(naiveEarlyClose).includes("JUNK leftover");
  const ok =
    applied.ok === true &&
    hasNext &&
    hasReplace &&
    junkAfter.length === 0 &&
    earlyWouldLeaveJunk === true;
  return {
    ok,
    appliedOk: applied.ok === true,
    hasNext,
    hasReplace,
    junkAfterCount: junkAfter.length,
    naiveMatcherWouldCorrupt: earlyWouldLeaveJunk,
  };
}

/** Fixture + deploy scripts keep client redirects after parity lifts. */
export function runRedirectsLastDocGate() {
  const full = existsSync(fullBuildPath) ? readFileSync(fullBuildPath, "utf8") : "";
  const pipe = existsSync(pipelinePath) ? readFileSync(pipelinePath, "utf8") : "";
  const marker = "Client redirects last";
  const ok =
    full.includes(marker) &&
    pipe.includes(marker) &&
    full.includes("inspectRoutesCwlIntegrity") &&
    pipe.includes("inspectRoutesCwlIntegrity");
  return { ok, fullBuildOk: full.includes(marker), pipelineOk: pipe.includes(marker) };
}

export function runWispCwlRoutesIntegritySmoke(opts = {}) {
  const brace = runReplaceRouteHandlerBlockBraceGate();
  const order = runRedirectsLastDocGate();
  const fixture = inspectRoutesCwlIntegrity(undefined, opts.routesPath ?? routesPath);
  const ok = brace.ok === true && order.ok === true && fixture.ok === true;
  return {
    kind: WISP_CWL_ROUTES_INTEGRITY_KIND,
    schemaVersion: WISP_CWL_ROUTES_INTEGRITY_SCHEMA_VERSION,
    ok,
    brace,
    order,
    fixture,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = runWispCwlRoutesIntegritySmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-routes-integrity-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
