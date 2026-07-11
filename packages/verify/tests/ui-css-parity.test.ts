import { describe, expect, test } from "vitest";
import { UI_CSS_PARITY_KIND, verifyUiRouteStyleParity } from "@chrysalis/verify";
import type { UiRouteStyleMapV1, UiStylesheetBundle } from "@chrysalis/webir";

function bundle(routeId: string, href: string, css: string, selectors: string[]): UiStylesheetBundle {
  return {
    routeId,
    href,
    css,
    selectors,
    droppedSelectors: [],
    sourceFiles: ["_app/immutable/assets/x.css"],
    provenance: [
      {
        source: "ui-asset-lift",
        locator: { kind: "asset", file: "_app/immutable/assets/x.css" },
        reason: `test bundle for ${routeId}`,
      },
    ],
  };
}

const map: UiRouteStyleMapV1 = {
  kind: "chrysalis.ui.route-style-map",
  schemaVersion: 1,
  framework: "sveltekit",
  routes: [{ routeId: "/login", pattern: "^/login/?$", href: "/assets/original-css/login.css" }],
  fallbackHref: null,
  assets: [],
};

describe("verifyUiRouteStyleParity", () => {
  test("passes when every inventoried selector is present", () => {
    const login = bundle(
      "/login",
      "/assets/original-css/login.css",
      ".login-page{background:#0f1419}.login-card{padding:2rem}",
      [".login-page", ".login-card"],
    );
    const report = verifyUiRouteStyleParity(map, [login]);
    expect(report.kind).toBe(UI_CSS_PARITY_KIND);
    expect(report.ok).toBe(true);
    expect(report.routesChecked).toBe(1);
    expect(report.routesFailed).toBe(0);
  });

  test("fails when a selector is missing from the bundle css", () => {
    const broken = bundle(
      "/login",
      "/assets/original-css/login.css",
      ".login-page{background:#0f1419}",
      [".login-page", ".login-card"],
    );
    const report = verifyUiRouteStyleParity(map, [broken]);
    expect(report.ok).toBe(false);
    expect(report.routes[0]?.missing).toEqual([".login-card"]);
  });

  test("flags map entries with no bundle (broken emit wiring)", () => {
    const report = verifyUiRouteStyleParity(map, []);
    expect(report.ok).toBe(false);
    expect(report.unmatchedMapEntries).toEqual(["/assets/original-css/login.css"]);
  });

  test("checks the fallback bundle when the map declares one", () => {
    const withFallback: UiRouteStyleMapV1 = { ...map, fallbackHref: "/assets/original-css/_layout.css" };
    const login = bundle("/login", "/assets/original-css/login.css", ".login-page{color:red}", [".login-page"]);
    const layout = bundle("(layout)", "/assets/original-css/_layout.css", "body{margin:0}", ["body"]);
    const report = verifyUiRouteStyleParity(withFallback, [login, layout]);
    expect(report.ok).toBe(true);
    expect(report.routesChecked).toBe(2);
  });
});
