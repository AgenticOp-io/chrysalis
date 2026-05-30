import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, test } from "vitest";

const ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const SMOKE = resolve(ROOT, "scripts/hub-ingest/hub-php-oracle-smoke.mjs");
const CLI = resolve(ROOT, "packages/cli/dist/bin.js");

test("hub php oracle smoke: exits 0 when CLI missing or succeeds with ingest (G70)", () => {
  const r = spawnSync(process.execPath, [SMOKE], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    timeout: 180_000,
  });
  expect(r.status).toBe(0);
  const j = JSON.parse(r.stdout);
  expect(j.kind).toBe("chrysalis.hub.php-oracle-smoke");
  expect(j.schemaVersion).toBe(5);
  if (!existsSync(CLI)) {
    expect(j.skip).toBe("no-cli-dist");
    return;
  }
  if (j.skip === "no-php") return;
  expect(j.ingestOk).toBe(true);
  expect(j.emitHonoOk).toBe(true);
  expect(j.emitFastifyOk).toBe(true);
  expect(j.verifyOk).toBe(true);
  if (j.wptpEmitNextjsAvailable) {
    expect(j.emitNextjsOk).toBe(true);
  }
  expect(j.routeCount).toBeGreaterThan(0);
}, 200_000);
