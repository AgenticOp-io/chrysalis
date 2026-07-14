import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import {
  collectNextPageStylesheets,
  descopeNextCssSelector,
  liftUiAssets,
  nextAppCssAdapter,
} from "@chrysalis/ingest";
import { verifyUiRouteStyleParity } from "@chrysalis/verify";

const FIXTURE = resolve(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/ui-markup-next");

describe("descopeNextCssSelector", () => {
  test("strips css-module hashes", () => {
    expect(descopeNextCssSelector("._login-page_a1b2c3")).toBe(".login-page");
  });
});

describe("collectNextPageStylesheets", () => {
  test("finds co-located and imported module css", () => {
    const sheets = collectNextPageStylesheets(FIXTURE, join(FIXTURE, "app/login/page.tsx"));
    expect(sheets.some((s) => s.includes("login/page.module.css"))).toBe(true);
  });
});

describe("liftUiAssets (next-app fixture)", () => {
  const result = liftUiAssets({ buildRoot: FIXTURE, adapter: nextAppCssAdapter });

  test("lifts per-route next css bundles", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.framework).toBe("next-app");
    expect(result.bundles.map((b) => b.routeId).sort()).toEqual([
      "/dashboard",
      "/login",
      "/portal/login",
    ]);
  });

  test("preserves per-route isolation", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const login = result.bundles.find((b) => b.routeId === "/login");
    const portal = result.bundles.find((b) => b.routeId === "/portal/login");
    expect(login?.css).toContain("#111827");
    expect(login?.css).not.toContain("#0d9488");
    expect(portal?.css).toContain("#0d9488");
  });

  test("passes selector parity verification", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const all = [...result.bundles, ...(result.fallbackBundle ? [result.fallbackBundle] : [])];
    expect(verifyUiRouteStyleParity(result.map, all).ok).toBe(true);
  });
});
