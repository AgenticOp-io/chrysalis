import { describe, expect, test } from "vitest";
import {
  applyLiftedMarkupToCwlSource,
  findRouteMarkupBundle,
  resolveRouteMarkupHref,
} from "@chrysalis/emit-shared";
import type { UiMarkupBundle, UiRouteMarkupMapV1 } from "@chrysalis/webir";
import { UI_ROUTE_MARKUP_MAP_KIND, UI_ROUTE_MARKUP_MAP_SCHEMA_VERSION } from "@chrysalis/webir";

const map: UiRouteMarkupMapV1 = {
  kind: UI_ROUTE_MARKUP_MAP_KIND,
  schemaVersion: UI_ROUTE_MARKUP_MAP_SCHEMA_VERSION,
  framework: "sveltekit",
  routes: [
    { routeId: "/login", pattern: "^/login/?$", href: "/assets/original-html/login.html" },
    { routeId: "/portal/login", pattern: "^/portal/login/?$", href: "/assets/original-html/portal_login.html" },
  ],
  fallbackHref: null,
};

const bundles: UiMarkupBundle[] = [
  {
    routeId: "/login",
    href: "/assets/original-html/login.html",
    html: '<main class="login-page"><h1>Lifted login</h1></main>',
    classNames: ["login-page"],
    sourceFiles: [],
    provenance: [],
  },
  {
    routeId: "/portal/login",
    href: "/assets/original-html/portal_login.html",
    html: '<main class="login-page portal-shell"><h1>Lifted portal</h1></main>',
    classNames: ["login-page", "portal-shell"],
    sourceFiles: [],
    provenance: [],
  },
];

const cwlSource = `# test
@page GET "/login"
{
  return html "<div>stub login</div>";
}

@page GET "/portal/login"
{
  return html "<div>stub portal</div>";
}

@route GET "/api/health"
{
  return { ok: true };
}
`;

describe("resolveRouteMarkupHref", () => {
  test("matches route patterns", () => {
    expect(resolveRouteMarkupHref(map, "/login")).toBe("/assets/original-html/login.html");
    expect(resolveRouteMarkupHref(map, "/portal/login")).toBe("/assets/original-html/portal_login.html");
  });
});

describe("findRouteMarkupBundle", () => {
  test("returns bundle by pathname", () => {
    const bundle = findRouteMarkupBundle(map, bundles, "/login");
    expect(bundle?.html).toContain("Lifted login");
  });
});

describe("applyLiftedMarkupToCwlSource", () => {
  test("patches @page return html with lifted fragments", () => {
    const result = applyLiftedMarkupToCwlSource(cwlSource, map, bundles);
    expect(result.routesPatched).toBe(2);
    expect(result.text).toContain("Lifted login");
    expect(result.text).toContain("Lifted portal");
    expect(result.text).not.toContain("stub login");
    expect(result.text).toContain("return { ok: true }");
  });

  test("does not multiply duplicate route blocks when patching (G9500)", async () => {
    const { applyLiftedMarkupToCwlSource: apply } = await import("../src/apply-ui-markup-to-cwl.js");
    const dup = `${cwlSource}\n@page GET "/login"\n{\n  return html "<div>second</div>";\n}\n`;
    const result = apply(dup, map, bundles);
    const loginCount = [...result.text.matchAll(/@page\s+GET\s+"\/login"/g)].length;
    expect(loginCount).toBe(2);
    expect(result.text).toContain("Lifted login");
  });
});

describe("extractCwlRouteBlock (G9490)", () => {
  test("ignores braces inside HTML string literals", async () => {
    const { extractCwlRouteBlock, patchCwlRouteBlockHtml } = await import("../src/apply-ui-markup-to-cwl.js");
    const source = `@page GET "/dash"
page dash {
  return html "<div onclick=\\"{() => (x = false)}\\">ok</div>";
}

@page GET "/next"
page next {
  return html "<div>next</div>";
}
`;
    const block = extractCwlRouteBlock(source, "/dash");
    expect(block).not.toBeNull();
    expect(block).toContain("() => (x = false)");
    expect(block).not.toContain("@page GET \"/next\"");
    const patched = patchCwlRouteBlockHtml(block!, "<main>lifted</main>");
    expect(patched).toContain("<main>lifted</main>");
  });
});
