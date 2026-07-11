import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import {
  angularComponentManifestKeyToRouteId,
  angularCssAdapter,
  descopeAngularSelector,
  liftUiAssets,
  resolveAngularBrowserRoot,
} from "@chrysalis/ingest";
import { verifyUiRouteStyleParity } from "@chrysalis/verify";

const FIXTURE = resolve(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/ui-assets-angular");

describe("descopeAngularSelector", () => {
  test("strips _ngcontent and _nghost attribute scopes", () => {
    expect(descopeAngularSelector(".login-page[_ngcontent-ng-c100]")).toBe(".login-page");
    expect(descopeAngularSelector("nav[_ngcontent-ng-c100] a[_ngcontent-ng-c100]")).toBe("nav a");
    expect(descopeAngularSelector("body[_nghost-ng-c000]")).toBe("body");
  });

  test("drops over-broad selectors", () => {
    expect(descopeAngularSelector("[_ngcontent-ng-c100]:hover")).toBeNull();
  });
});

describe("angularComponentManifestKeyToRouteId", () => {
  test("maps component paths to route ids", () => {
    expect(angularComponentManifestKeyToRouteId("src/app/login/login.component.ts")).toBe("/login");
    expect(angularComponentManifestKeyToRouteId("src/app/portal/login/login.component.ts")).toBe(
      "/portal/login",
    );
    expect(angularComponentManifestKeyToRouteId("src/main.ts")).toBeNull();
  });
});

describe("liftUiAssets (angular fixture)", () => {
  const result = liftUiAssets({ buildRoot: FIXTURE, adapter: angularCssAdapter });

  test("lifts per-route bundles with angular framework tag", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.framework).toBe("angular");
    expect(result.bundles.map((b) => b.routeId).sort()).toEqual(["/login", "/portal/login"]);
  });

  test("preserves per-route isolation between login pages", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const login = result.bundles.find((b) => b.routeId === "/login");
    const portal = result.bundles.find((b) => b.routeId === "/portal/login");
    expect(login?.css).toContain("#312e81");
    expect(login?.css).not.toContain("#7c3aed");
    expect(portal?.css).toContain("#7c3aed");
    expect(portal?.css).not.toContain("#4338ca");
  });

  test("passes selector parity verification", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const all = [...result.bundles, ...(result.fallbackBundle ? [result.fallbackBundle] : [])];
    const parity = verifyUiRouteStyleParity(result.map, all);
    expect(parity.ok).toBe(true);
  });

  test("detect() recognizes the fixture", () => {
    expect(resolveAngularBrowserRoot(FIXTURE)?.replace(/\\/g, "/")).toContain("dist/demo/browser");
    expect(angularCssAdapter.detect(FIXTURE)).toBe(true);
  });
});
