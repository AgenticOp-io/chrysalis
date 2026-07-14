import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import {
  cleanupDescopedSelector,
  descopeVueSelector,
  liftUiAssets,
  viteVueCssAdapter,
  viteVueManifestKeyToRouteId,
} from "@chrysalis/ingest";
import { verifyUiRouteStyleParity } from "@chrysalis/verify";

const FIXTURE = resolve(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/ui-assets-vue");

describe("descopeVueSelector", () => {
  test("strips data-v attribute scopes", () => {
    expect(descopeVueSelector(".login-page[data-v-log001]")).toBe(".login-page");
    expect(descopeVueSelector("nav[data-v-app001] a[data-v-app001]")).toBe("nav a");
  });

  test("unwraps :deep and :slotted", () => {
    expect(descopeVueSelector(":deep(.child[data-v-x])")).toBe(".child");
    expect(descopeVueSelector(":slotted(.slot-item[data-v-x])")).toBe(".slot-item");
  });

  test("unwraps :global, ::v-deep, and /deep/ (G9929)", () => {
    expect(descopeVueSelector(":global(.toast)")).toBe(".toast");
    expect(descopeVueSelector("::v-deep(.child)")).toBe(".child");
    expect(descopeVueSelector("/deep/ .child")).toBe(".child");
    expect(descopeVueSelector(">>> .child")).toBe(".child");
  });

  test("drops over-broad selectors", () => {
    expect(descopeVueSelector("[data-v-x]:hover")).toBeNull();
  });
});


describe("viteVueManifestKeyToRouteId", () => {
  test("maps view file paths to route ids", () => {
    expect(viteVueManifestKeyToRouteId("src/views/login.vue")).toBe("/login");
    expect(viteVueManifestKeyToRouteId("src/views/portal/login.vue")).toBe("/portal/login");
    expect(viteVueManifestKeyToRouteId("src/App.vue")).toBeNull();
  });
});

describe("liftUiAssets (vite-vue fixture)", () => {
  const result = liftUiAssets({ buildRoot: FIXTURE, adapter: viteVueCssAdapter });

  test("lifts per-route bundles with vue framework tag", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.framework).toBe("vite-vue");
    expect(result.bundles.map((b) => b.routeId).sort()).toEqual(["/login", "/portal/login"]);
  });

  test("preserves per-route isolation between login pages", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const login = result.bundles.find((b) => b.routeId === "/login");
    const portal = result.bundles.find((b) => b.routeId === "/portal/login");
    expect(login?.css).toContain("#111827");
    expect(login?.css).not.toContain("#0d9488");
    expect(portal?.css).toContain("#0d9488");
    expect(portal?.css).not.toContain("#1f2937");
  });

  test("passes selector parity verification", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const all = [...result.bundles, ...(result.fallbackBundle ? [result.fallbackBundle] : [])];
    const parity = verifyUiRouteStyleParity(result.map, all);
    expect(parity.ok).toBe(true);
  });

  test("detect() recognizes the fixture", () => {
    expect(viteVueCssAdapter.detect(FIXTURE)).toBe(true);
    expect(cleanupDescopedSelector("  .foo  ")).toBe(".foo");
  });
});
