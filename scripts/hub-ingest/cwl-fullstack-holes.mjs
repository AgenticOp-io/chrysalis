/**
 * Full-stack CWL hole catalog (RFC-0012 / G1149).
 * Honest holes for UI/component semantics not yet lowered to WebIR.
 */

/**
 * `param` marks a reason that carries a `:<argument>` suffix at the hole site
 * (e.g. `cwl:unknown-proxy-param:region`); only those resolve by prefix.
 * @typedef {{ rfc: string, origin: string, surface: string, summary: string, param?: string }} CwlFullstackHoleEntry
 */

/** @type {Record<string, CwlFullstackHoleEntry>} */
export const CWL_FULLSTACK_HOLE_CATALOG = {
  "hub-svelte:page-component": {
    rfc: "0012",
    origin: "svelte",
    surface: "page",
    summary: "Svelte +page.svelte component tree not lowered; route shell only.",
  },
  "hub-svelte:server-handler": {
    rfc: "0012",
    origin: "svelte",
    surface: "api",
    summary: "SvelteKit +server handler body not lowered (json/load/actions).",
  },
  "hub-svelte:load-function": {
    rfc: "0013",
    origin: "svelte",
    surface: "data",
    summary: "+page.server load not lowered (complex shapes); simple literal+param loads use RFC-0013.",
  },
  "hub-svelte:form-action": {
    rfc: "0012",
    origin: "svelte",
    surface: "api",
    summary: "SvelteKit form actions not modeled.",
  },
  "hub-svelte:firebase-auth": {
    rfc: "0012",
    origin: "svelte",
    surface: "client",
    summary: "Firebase client auth (email, OAuth, token refresh) not lowered to CWL.",
  },
  "hub-svelte:arcgis-map": {
    rfc: "0012",
    origin: "svelte",
    surface: "client",
    summary:
      "@arcgis/core MapView/widgets stay a vendor client island — preserve source ArcGIS Vite/@arcgis/core load (D6441/D6442); do not rewrite to Bing, OSM-default, or CDN AMD/ESM dialects.",
  },
  "hub-svelte:cross-frame-messaging": {
    rfc: "0012",
    origin: "svelte",
    surface: "client",
    summary: "SharedMap iframe postMessage between plan and coverage-map not modeled in CWL.",
  },
  "hub-svelte:chart-component": {
    rfc: "0012",
    origin: "svelte",
    surface: "client",
    summary: "echarts, vis-network, and similar chart components not lowered.",
  },
  "hub-cwl:upstream-proxy": {
    rfc: "0012",
    origin: "cwl",
    surface: "api",
    summary:
      "Host-owned forward mechanics. The destination is expressible as `proxy upstream \"…\"` (RFC-0033); keep this hole only for the transfer itself — TLS, hop-by-hop headers, retries, timeouts, tunnels.",
  },
  "hub-cwl:html-fragment": {
    rfc: "0012",
    origin: "cwl",
    surface: "page",
    summary:
      "Live HTML fragment bytes the host still owns. Repeated markup over a collection is now expressible as `repeat … as … html` (RFC-0031) — keep this hole only for fragments CWL cannot name yet.",
  },
  "hub-cwl:credential-store": {
    rfc: "0012",
    origin: "cwl",
    surface: "api",
    summary:
      "Host-owned credential store beyond declared intent. Verify / mint / revoke are expressible as effects (RFC-0032); keep this hole only for the store itself — hashing, token format, and expiry stay with the host.",
  },
  "hub-cwl:keypair-gen": {
    rfc: "0012",
    origin: "cwl",
    surface: "api",
    summary:
      "Host generates an asymmetric keypair (WireGuard / X25519 / SSH). Private material never enters the genome; CWL names the route and its media type only.",
  },
  "hub-cwl:binary-render": {
    rfc: "0012",
    origin: "cwl",
    surface: "api",
    summary:
      "Host renders non-text bytes (QR PNG, PDF, archive, config blob). The declared `content-type` stays in CWL — only the byte production is host-owned.",
  },
  "cwl:empty-handler": {
    rfc: "0012",
    origin: "cwl",
    surface: "api",
    summary: "Handler body intentionally empty / not yet authored; placeholder hole.",
  },
  "cwl:invalid-html-repeat": {
    rfc: "0031",
    origin: "cwl",
    surface: "page",
    summary: "`repeat … as … html` statement template is not a string literal — kept as an honest hole.",
  },
  "cwl:emit:html-repeat": {
    rfc: "0031",
    origin: "cwl",
    surface: "emit",
    summary: "Thin emit: repeat node lost its iterable or item template — do not guess the markup.",
  },
  "cwl:invalid-proxy-upstream": {
    rfc: "0033",
    origin: "cwl",
    surface: "api",
    summary: "`proxy upstream` target is not a string literal — kept as an honest hole.",
  },
  "cwl:unknown-proxy-param": {
    rfc: "0033",
    origin: "cwl",
    surface: "api",
    param: "param name",
    summary:
      "`proxy upstream` target references a `:name` the route's path does not declare — the destination is not guessed.",
  },
  "cwl:param-not-in-path": {
    rfc: "0002",
    origin: "cwl",
    surface: "api",
    param: "param name",
    summary: "Handler declares `param <name>;` but the route path has no `:<name>` segment.",
  },
  "cwl:unknown-component": {
    rfc: "0028",
    origin: "cwl",
    surface: "page",
    param: "component name",
    summary: "Route uses a `component` that no `component <name> { … }` decl defines after resolve.",
  },
  "cwl:emit:unsupported-call": {
    rfc: "0012",
    origin: "cwl",
    surface: "emit",
    param: "callee",
    summary: "Thin emit met a call it has no CWL surface for — kept as a hole instead of guessed syntax.",
  },
  "cwl:emit:proxy-target": {
    rfc: "0033",
    origin: "cwl",
    surface: "emit",
    summary: "Thin emit: proxy node lost its target literal — do not guess a destination.",
  },
  "cwl:unknown-layout": {
    rfc: "0029",
    origin: "cwl",
    surface: "page",
    summary: "Page references `layout name;` but no matching `layout name { … }` decl was found after resolve.",
  },
  "cwl:unknown-layout-statement": {
    rfc: "0029",
    origin: "cwl",
    surface: "page",
    summary: "Statement inside a layout block is not chrome/header/cookie/hole/client-island — kept as an honest hole.",
  },
  "unsupported:php-session": {
    rfc: "0012",
    origin: "php",
    surface: "api",
    summary: "PHP session semantics not modeled in CWL; explicit hole required.",
  },
  "unsupported:wasm-module": {
    rfc: "0024",
    origin: "cwl",
    surface: "client",
    summary: "Wasm compute island — declare only; do not invent Wasm Component Model in CWL grammar.",
  },
  "unsupported:vendor-sdk": {
    rfc: "0024",
    origin: "cwl",
    surface: "client",
    summary: "Third-party client SDK island (maps/payments/analytics) — preserve origin; do not invent.",
  },
  "unsupported:opaque-script": {
    rfc: "0024",
    origin: "cwl",
    surface: "client",
    summary: "Unclassified browser script — honest hole until a catalogued island kind applies.",
  },
  "unsupported:sse": {
    rfc: "0027",
    origin: "cwl",
    surface: "api",
    summary:
      "SSE residual beyond single-shot stream sse (RFC-0027) — keep hole; do not invent EventSource runtimes.",
  },
  "unsupported:websocket": {
    rfc: "0012",
    origin: "cwl",
    surface: "api",
    summary: "WebSocket upgrade — declare hole until a duplex surface RFC exists; do not invent WS framework façades.",
  },
  "unsupported:multipart": {
    rfc: "0026",
    origin: "cwl",
    surface: "api",
    summary:
      "multipart/form-data residual beyond named field/file bindings (RFC-0026) — keep hole; do not invent upload middleware.",
  },

  // Thin emit reverse residuals (WebIR → CWL; never invent semantics)
  "cwl:emit:missing-value": {
    rfc: "0012",
    origin: "cwl",
    surface: "emit",
    summary: "Thin emit: WebIR value node missing.",
  },
  "cwl:emit:unsupported-response": {
    rfc: "0012",
    origin: "cwl",
    surface: "emit",
    summary: "Thin emit: response shape not projectable (keep hole).",
  },
  "cwl:emit:multi-statement-body": {
    rfc: "0012",
    origin: "cwl",
    surface: "emit",
    summary: "Thin emit: multi-statement block without known peel wrapper.",
  },
  "cwl:emit:unsupported-html": {
    rfc: "0014",
    origin: "cwl",
    surface: "emit",
    summary: "Thin emit: HTML template/literal not reconstructable.",
  },
  "cwl:emit:ui-hole": {
    rfc: "0017",
    origin: "cwl",
    surface: "emit",
    summary: "Thin emit: UI tree node not projectable.",
  },
  "cwl:emit:ui-text-binding": {
    rfc: "0017",
    origin: "cwl",
    surface: "emit",
    summary: "Thin emit: UI text binding operand missing name.",
  },
  "cwl:emit:not-ui-tree": {
    rfc: "0017",
    origin: "cwl",
    surface: "emit",
    summary: "Thin emit: expected data.ui.tree node.",
  },

  "hub-next:page-component": {
    rfc: "0012",
    origin: "nextjs",
    surface: "page",
    summary: "Next.js app/page.tsx component tree not lowered; static JSX shell only.",
  },
  "hub-next:route-handler": {
    rfc: "0012",
    origin: "nextjs",
    surface: "api",
    summary: "Next.js app route.ts handler body not lowered.",
  },
  "hub-next:load-function": {
    rfc: "0013",
    origin: "nextjs",
    surface: "data",
    summary: "Next.js page.server.ts load not lowered (complex shapes); simple literal+param loads use RFC-0013.",
  },
  "hub-nuxt:nitro-handler": {
    rfc: "0012",
    origin: "nuxt",
    surface: "api",
    summary:
      "Nuxt Nitro/h3 defineEventHandler body not lowered (unsupported h3 helpers or shapes). Supported: getRouterParam, getQuery.field, setResponseStatus, (await) readBody(event).field, const body = await readBody; body.x, const { x } = await readBody, getHeader/getRequestHeader/getCookie (+ ??); not: whole-body readBody, header/cookie dumps, rest destructure.",
  },
  "hub-nuxt:nitro-middleware": {
    rfc: "0012",
    origin: "nuxt",
    surface: "middleware",
    summary:
      "Nuxt Nitro server/middleware defineEventHandler body not lowered. Empty/pass-through presets lower; nested dirs are discovered but do not imply path mounts (Nitro middleware is global unless origin encodes a mount).",
  },
};

/**
 * @param {string} reason
 * @returns {CwlFullstackHoleEntry | null}
 */
export function lookupFullstackHole(reason) {
  const exact = CWL_FULLSTACK_HOLE_CATALOG[reason];
  if (exact) return exact;
  // Parameterized reasons carry their argument as a trailing `:<value>`.
  let base = String(reason ?? "");
  while (base.includes(":")) {
    base = base.slice(0, base.lastIndexOf(":"));
    const entry = CWL_FULLSTACK_HOLE_CATALOG[base];
    if (entry?.param) return entry;
  }
  return null;
}

/**
 * @param {string} reason
 */
export function isCataloguedFullstackHole(reason) {
  return lookupFullstackHole(reason) !== null;
}
