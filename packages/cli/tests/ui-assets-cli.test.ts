import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, test } from "vitest";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const BIN = resolve(ROOT, "packages/cli/dist/bin.js");
const FIXTURE = resolve(ROOT, "fixtures/ui-assets-svelte");

const outDir = mkdtempSync(join(tmpdir(), "chrysalis-ui-assets-"));
afterAll(() => rmSync(outDir, { recursive: true, force: true }));

describe("chrysalis ui-assets", () => {
  test("lifts the sveltekit fixture into per-route bundles + map (D6365)", () => {
    const r = spawnSync(
      process.execPath,
      [BIN, "ui-assets", "--build-root", FIXTURE, "--out", outDir, "--json"],
      { encoding: "utf8", cwd: ROOT },
    );
    expect(r.status).toBe(0);
    const summary = JSON.parse(r.stdout) as Record<string, unknown>;
    expect(summary.ok).toBe(true);
    expect(summary.framework).toBe("sveltekit");
    expect(summary.bundles).toBe(3);
    expect((summary.parity as Record<string, unknown>).ok).toBe(true);

    expect(existsSync(join(outDir, "login.css"))).toBe(true);
    expect(existsSync(join(outDir, "_layout.css"))).toBe(true);
    expect(existsSync(join(outDir, "assets", "inter.woff2"))).toBe(true);

    const map = JSON.parse(readFileSync(join(outDir, "ui-route-style-map.json"), "utf8")) as {
      kind: string;
      routes: Array<{ routeId: string }>;
    };
    expect(map.kind).toBe("chrysalis.ui.route-style-map");
    expect(map.routes.map((r2) => r2.routeId).sort()).toEqual(["/", "/login", "/portal/[tenantId]"]);

    // Isolation rule: login keeps its colors, portal keeps its own.
    const loginCss = readFileSync(join(outDir, "login.css"), "utf8");
    expect(loginCss).toContain("#0f1419");
    expect(loginCss).not.toContain("#0fb8a9");
  });

  test("missing build root holes with legacy:css-scoping-unknown", () => {
    const r = spawnSync(
      process.execPath,
      [BIN, "ui-assets", "--build-root", join(FIXTURE, "no-such-dir"), "--out", outDir, "--json"],
      { encoding: "utf8", cwd: ROOT },
    );
    expect(r.status).toBe(1);
    const payload = JSON.parse(r.stdout) as { ok: boolean; hole: { reason: string } };
    expect(payload.ok).toBe(false);
    expect(payload.hole.reason).toBe("legacy:css-scoping-unknown");
  });
});
