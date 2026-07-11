import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import {
  descopeSvelteSelector,
  liftUiAssets,
  svelteKitCssAdapter,
  svelteKitRoutePatternSource,
  uiRouteBundleSlug,
} from "@chrysalis/ingest";
import { UI_ROUTE_STYLE_MAP_KIND, parseUiRouteStyleMapJson } from "@chrysalis/webir";

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(here, "../../../fixtures/ui-assets-svelte");
const GOLDEN = resolve(here, "golden/ui-assets-login.css");

describe("descopeSvelteSelector", () => {
  test("plain selectors pass through", () => {
    expect(descopeSvelteSelector("body")).toBe("body");
    expect(descopeSvelteSelector(".login-page .card")).toBe(".login-page .card");
  });

  test("strips svelte hash classes", () => {
    expect(descopeSvelteSelector(".login-page.svelte-log1n")).toBe(".login-page");
    expect(descopeSvelteSelector("nav.svelte-nav1a a.svelte-nav1a")).toBe("nav a");
  });

  test("repairs Svelte 5 functional pseudo scoping", () => {
    expect(descopeSvelteSelector("h1:where(.svelte-log1n)")).toBe("h1");
    expect(descopeSvelteSelector(".card:is(.svelte-x, .highlight)")).toBe(".card:is(.highlight)");
  });

  test("drops selectors that become over-broad", () => {
    expect(descopeSvelteSelector(".svelte-home9z:hover")).toBeNull();
    expect(descopeSvelteSelector(".svelte-x > p")).toBeNull();
    expect(descopeSvelteSelector(".svelte-x")).toBeNull();
  });
});

describe("svelteKitRoutePatternSource", () => {
  test("static and param routes", () => {
    expect(new RegExp(svelteKitRoutePatternSource("/login")).test("/login")).toBe(true);
    expect(new RegExp(svelteKitRoutePatternSource("/login")).test("/login/")).toBe(true);
    expect(new RegExp(svelteKitRoutePatternSource("/login")).test("/loginx")).toBe(false);
    const portal = new RegExp(svelteKitRoutePatternSource("/portal/[tenantId]"));
    expect(portal.test("/portal/acme")).toBe(true);
    expect(portal.test("/portal/acme/extra")).toBe(false);
    expect(new RegExp(svelteKitRoutePatternSource("/")).test("/")).toBe(true);
  });
});

describe("liftUiAssets (sveltekit fixture)", () => {
  const result = liftUiAssets({ buildRoot: FIXTURE });

  test("detects sveltekit and lifts one bundle per route", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.framework).toBe("sveltekit");
    expect(result.bundles.map((b) => b.routeId).sort()).toEqual(["/", "/login", "/portal/[tenantId]"]);
    expect(result.fallbackBundle?.href).toBe("/assets/original-css/_layout.css");
  });

  test("preserves per-route isolation: portal colors never enter the login bundle", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const login = result.bundles.find((b) => b.routeId === "/login");
    const portal = result.bundles.find((b) => b.routeId === "/portal/[tenantId]");
    expect(login).toBeDefined();
    expect(portal).toBeDefined();
    // Both routes define .login-page — the collision that motivated D6365.
    expect(login?.css).toContain(".login-page{min-height:100vh;background:linear-gradient(135deg,#0f1419");
    expect(portal?.css).toContain(".login-page{min-height:100vh;background:linear-gradient(135deg,#0fb8a9");
    expect(login?.css).not.toContain("#0fb8a9");
    expect(portal?.css).not.toContain("#0f1419,#1e3a4f");
  });

  test("records provenance and drops over-broad selectors", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const home = result.bundles.find((b) => b.routeId === "/");
    expect(home?.droppedSelectors).toContain(".svelte-home9z:hover");
    for (const bundle of result.bundles) {
      expect(bundle.provenance.length).toBeGreaterThan(0);
      for (const p of bundle.provenance) {
        expect(p.source).toBe("ui-asset-lift");
        expect(p.locator.kind).toBe("asset");
      }
    }
  });

  test("rewrites url() assets and lists copies", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.fallbackBundle?.css).toContain("url(/assets/original/inter.woff2)");
    expect(result.assetCopies.some((c) => c.href === "/assets/original/inter.woff2")).toBe(true);
  });

  test("map round-trips through the webir parser", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const parsed = parseUiRouteStyleMapJson(JSON.stringify(result.map));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.map.kind).toBe(UI_ROUTE_STYLE_MAP_KIND);
    expect(parsed.map.routes).toHaveLength(3);
    expect(parsed.map.fallbackHref).toBe("/assets/original-css/_layout.css");
  });

  test("login bundle matches committed golden", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const login = result.bundles.find((b) => b.routeId === "/login");
    const expected = readFileSync(GOLDEN, "utf8").replace(/\r\n/g, "\n");
    expect(`${login?.css ?? ""}\n`).toBe(expected);
  });

  test("unsupported build root holes instead of guessing", () => {
    const missing = liftUiAssets({ buildRoot: resolve(here, "does-not-exist") });
    expect(missing.ok).toBe(false);
    if (missing.ok) return;
    expect(missing.hole.reason).toBe("legacy:css-scoping-unknown");
  });

  test("adapter detect() is honest about the fixture", () => {
    expect(svelteKitCssAdapter.detect(FIXTURE)).toBe(true);
    expect(uiRouteBundleSlug("/portal/[tenantId]")).toBe("portal_tenantId_");
  });
});
