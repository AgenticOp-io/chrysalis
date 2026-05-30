#!/usr/bin/env node
/** CWL RFC round-trip smokes (G203/G205/G207). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlRoundtripSmoke } from "./hub-cwl-roundtrip-smoke.mjs";

export async function runCwlRequestContextRoundtripSmoke() {
  return runCwlRoundtripSmoke({
    fixtureRel: "fixtures/hub-gold-cwl-request-context",
    rfc: "CWL-RFC-0004",
    moduleName: "request_context",
    header: "# CWL request-context gold (RFC-0004)",
    projectionOk: (p) =>
      p.holeFree === p.total && (p.withHeaderParams ?? 0) >= 1 && (p.withCookieParams ?? 0) >= 1,
  });
}

export async function runCwlResponseContentTypeRoundtripSmoke() {
  return runCwlRoundtripSmoke({
    fixtureRel: "fixtures/hub-gold-cwl-response-content-type",
    rfc: "CWL-RFC-0008",
    moduleName: "response_content_type",
    header: "# CWL response content-type gold (RFC-0008)",
    projectionOk: (p) => p.holeFree === p.total && (p.withContentType ?? 0) >= 3,
  });
}

export async function runCwlAuthEffectsRoundtripSmoke() {
  return runCwlRoundtripSmoke({
    fixtureRel: "fixtures/hub-gold-cwl-auth-effects",
    rfc: "CWL-RFC-0007",
    moduleName: "auth_effects",
    header: "# CWL auth + effects gold (RFC-0007)",
  });
}

async function main() {
  const which = process.argv[2] ?? "all";
  const reports = [];
  if (which === "all" || which === "request-context") reports.push(await runCwlRequestContextRoundtripSmoke());
  if (which === "all" || which === "content-type") reports.push(await runCwlResponseContentTypeRoundtripSmoke());
  if (which === "all" || which === "auth-effects") reports.push(await runCwlAuthEffectsRoundtripSmoke());
  const ok = reports.every((r) => r.ok || r.skip);
  console.log(JSON.stringify({ ok, reports }, null, 2));
  if (!ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
