import { describe, expect, test } from "vitest";
import {
  matchRouteStylesheetHref,
  resolveRouteStylesheetHref,
  resolveRouteStylesheetHrefs,
  routeStylesheetLinkTag,
  wrapHtmlFragmentWithDocumentShell,
} from "@chrysalis/emit-shared";
import type { UiRouteStyleMapV1 } from "@chrysalis/webir";

const map: UiRouteStyleMapV1 = {
  kind: "chrysalis.ui.route-style-map",
  schemaVersion: 1,
  framework: "sveltekit",
  routes: [
    { routeId: "/login", pattern: "^/login/?$", href: "/assets/original-css/login.css" },
    { routeId: "/portal/[tenantId]", pattern: "^/portal/[^/]+/?$", href: "/assets/original-css/portal_tenantId_.css" },
  ],
  fallbackHref: "/assets/original-css/_layout.css",
  assets: [],
};

describe("resolveRouteStylesheetHref", () => {
  test("exact and param route matches", () => {
    expect(resolveRouteStylesheetHref(map, "/login")).toBe("/assets/original-css/login.css");
    expect(resolveRouteStylesheetHref(map, "/login/")).toBe("/assets/original-css/login.css");
    expect(resolveRouteStylesheetHref(map, "/portal/acme")).toBe("/assets/original-css/portal_tenantId_.css");
  });

  test("query strings are ignored", () => {
    expect(resolveRouteStylesheetHref(map, "/login?next=/dashboard")).toBe("/assets/original-css/login.css");
  });

  test("unknown pages get the layout fallback", () => {
    expect(resolveRouteStylesheetHref(map, "/made-up-page")).toBe("/assets/original-css/_layout.css");
  });

  test("no fallback yields null", () => {
    const noFallback: UiRouteStyleMapV1 = { ...map, fallbackHref: null };
    expect(resolveRouteStylesheetHref(noFallback, "/made-up-page")).toBeNull();
  });
});

describe("resolveRouteStylesheetHrefs (D6368)", () => {
  test("matched route includes route + fallback", () => {
    expect(resolveRouteStylesheetHrefs(map, "/login")).toEqual([
      "/assets/original-css/login.css",
      "/assets/original-css/_layout.css",
    ]);
  });

  test("unknown page is fallback only", () => {
    expect(resolveRouteStylesheetHrefs(map, "/made-up-page")).toEqual(["/assets/original-css/_layout.css"]);
  });

  test("matchRouteStylesheetHref ignores fallback", () => {
    expect(matchRouteStylesheetHref(map, "/made-up-page")).toBeNull();
    expect(matchRouteStylesheetHref(map, "/login")).toBe("/assets/original-css/login.css");
  });
});

describe("routeStylesheetLinkTag", () => {
  test("emits route + fallback link tags", () => {
    expect(routeStylesheetLinkTag(map, "/login")).toBe(
      '<link rel="stylesheet" href="/assets/original-css/login.css"><link rel="stylesheet" href="/assets/original-css/_layout.css">',
    );
  });

  test("empty when nothing applies", () => {
    const noFallback: UiRouteStyleMapV1 = { ...map, fallbackHref: null, routes: [] };
    expect(routeStylesheetLinkTag(noFallback, "/made-up-page")).toBe("");
  });
});

describe("wrapHtmlFragmentWithDocumentShell", () => {
  test("wraps fragment and injects stylesheet links", () => {
    const html = wrapHtmlFragmentWithDocumentShell('<div class="login-page">x</div>', map, "/login", {
      title: "Login",
    });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('href="/assets/original-css/login.css"');
    expect(html).toContain('href="/assets/original-css/_layout.css"');
    expect(html).toContain('<div class="login-page">x</div>');
    expect(html).toContain("<title>Login</title>");
  });

  test("injects into existing document head", () => {
    const html = wrapHtmlFragmentWithDocumentShell(
      "<!DOCTYPE html><html><head><title>t</title></head><body>b</body></html>",
      map,
      "/login",
    );
    expect(html).toContain('href="/assets/original-css/login.css"');
    expect(html).toMatch(/<\/title>\s*<link rel="stylesheet"/);
  });
});
