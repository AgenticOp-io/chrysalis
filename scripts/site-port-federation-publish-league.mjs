#!/usr/bin/env node
/** Publish VMF Verify League leaderboard from federation submissions. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { publishFederationLeague } from "./site-port-federation-lib.mjs";

export const FEDERATION_PUBLISH_LEAGUE_KIND = "chrysalis.site-port-federation.publish-league";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export async function runFederationPublishLeague(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const published = await publishFederationLeague(repoRoot);
  return {
    kind: FEDERATION_PUBLISH_LEAGUE_KIND,
    schemaVersion: 1,
    ...published,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runFederationPublishLeague();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("site-port-federation-publish-league")) main();
