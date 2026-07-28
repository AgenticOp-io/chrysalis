#!/usr/bin/env node
/**
 * Smoke: hub-gold-helidon Helidon MP JAX-RS dialect → WebIR hole-free (20 routes).
 * Reuses G10012 JAX-RS peels / same lift path as hub:jaxrs-smoke (no Helidon CDI/MP invent).
 * Does not replace hub-flagship-java Spring D6448-ST.
 * Honest holes: CDI, MicroProfile Config, Helidon SE / MP filters (D6447).
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runJaxrsSmoke } from "./hub-jaxrs-smoke.mjs";

export const HUB_HELIDON_SMOKE_KIND = "chrysalis.hub.helidon-smoke";
export const HUB_HELIDON_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(scriptRoot, "fixtures/hub-gold-helidon");

/**
 * @param {string} [projectDir]
 */
export async function runHelidonSmoke(projectDir = fixture) {
  const jaxrs = await runJaxrsSmoke(projectDir);
  const {
    kind: _jaxrsKind,
    schemaVersion: _jaxrsSchema,
    jaxrsRouteCount,
    ...rest
  } = jaxrs;

  return {
    ...rest,
    kind: HUB_HELIDON_SMOKE_KIND,
    schemaVersion: HUB_HELIDON_SMOKE_SCHEMA_VERSION,
    peelReuse: {
      dialect: "jaxrs",
      gate: "G10012",
      smoke: "hub:jaxrs-smoke",
      note: "Helidon MP HTTP resources are standard JAX-RS; no Helidon CDI/MP Config invent (D6447).",
    },
    helidonRouteCount: jaxrsRouteCount ?? rest.routeCount ?? null,
    jaxrsRouteCount: jaxrsRouteCount ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runHelidonSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && !report.skip) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
