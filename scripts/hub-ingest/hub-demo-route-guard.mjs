#!/usr/bin/env node
/**
 * Job-step guard: refuses to start ingest/translate when the public demo (CHRYSALIS_HUB_DEMO_MODE=1)
 * is capped and the site declares more routes than allowed. Runs as the first step in
 * hubJobSteps() (see chrysalis-hub-runners.mjs) so it aborts before any parsing or LLM cost.
 * Usage: node hub-demo-route-guard.mjs <projectDir>
 */
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { isHubDemoMode, assertDemoRouteScope } from "../chrysalis-hub-demo-guard.mjs";

async function main() {
  if (!isHubDemoMode()) return 0;
  const projectDir = resolve(process.argv[2] ?? ".");
  let routeCount = 0;
  try {
    const manifest = JSON.parse(await readFile(join(projectDir, "chrysalis.routes.json"), "utf8"));
    if (Array.isArray(manifest.routes)) routeCount = manifest.routes.length;
  } catch {
    return 0;
  }
  assertDemoRouteScope(routeCount);
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(`[hub-demo-guard] ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
