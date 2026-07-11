import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import {
  descopeCssModuleSelector,
  discoverUiAssetBuildRoot,
  liftProjectUiAssets,
  liftUiAssets,
  viteCssModulesAdapter,
  viteJsManifestKeyToRouteId,
} from "@chrysalis/ingest";
import { verifyUiRouteStyleParity } from "@chrysalis/verify";

const FIXTURE = resolve(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/ui-assets-css-modules");

describe("descopeCssModuleSelector", () => {
  test("strips Vite css module hashed class tokens", () => {
    expect(descopeCssModuleSelector("._login-page_a1b2c3")).toBe(".login-page");
    expect(descopeCssModuleSelector("._login-card_b2c3d4:hover")).toBe(".login-card:hover");
  });

  test("strips webpack-style module class tokens", () => {
    expect(descopeCssModuleSelector(".Login_login-page__a1b2c3")).toBe(".login-page");
  });
});

describe("viteJsManifestKeyToRouteId", () => {
  test("maps tsx page paths to route ids", () => {
    expect(viteJsManifestKeyToRouteId("src/pages/login.tsx")).toBe("/login");
    expect(viteJsManifestKeyToRouteId("src/pages/portal/login.tsx")).toBe("/portal/login");
    expect(viteJsManifestKeyToRouteId("src/App.tsx")).toBeNull();
  });
});

describe("liftUiAssets (vite-css-modules fixture)", () => {
  const result = liftUiAssets({ buildRoot: FIXTURE, adapter: viteCssModulesAdapter });

  test("lifts per-route bundles with css-modules framework tag", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.framework).toBe("vite-css-modules");
    expect(result.bundles.map((b) => b.routeId).sort()).toEqual(["/login", "/portal/login"]);
  });

  test("preserves per-route isolation between login pages", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const login = result.bundles.find((b) => b.routeId === "/login");
    const portal = result.bundles.find((b) => b.routeId === "/portal/login");
    expect(login?.css).toContain("#1f2937");
    expect(login?.css).not.toContain("#0d9488");
    expect(portal?.css).toContain("#0d9488");
    expect(portal?.css).not.toContain("#374151");
  });

  test("passes selector parity verification", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const all = [...result.bundles, ...(result.fallbackBundle ? [result.fallbackBundle] : [])];
    const parity = verifyUiRouteStyleParity(result.map, all);
    expect(parity.ok).toBe(true);
  });

  test("detect() recognizes the fixture", () => {
    expect(viteCssModulesAdapter.detect(FIXTURE)).toBe(true);
  });
});

describe("discoverUiAssetBuildRoot + liftProjectUiAssets", () => {
  test("discovers css-modules fixture and writes project artifacts", () => {
    expect(discoverUiAssetBuildRoot(FIXTURE)).toBe(FIXTURE);
    const out = mkdtempSync(join(tmpdir(), "chrysalis-ui-assets-"));
    try {
      const lifted = liftProjectUiAssets({ projectDir: FIXTURE, outDir: out });
      expect(lifted.ok).toBe(true);
      if (!lifted.ok || "skip" in lifted) return;
      expect(lifted.buildRoot).toBe(FIXTURE);
      expect(lifted.bundles.length).toBe(2);
      expect(lifted.written.mapPath).toContain("ui-route-style-map.json");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
