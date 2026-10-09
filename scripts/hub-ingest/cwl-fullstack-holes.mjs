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
  "cwl:invalid-html-repeat-if": {
    rfc: "0031",
    origin: "cwl",
    surface: "page",
    summary:
      "`repeat … if …` filter must be a field chain rooted on the item — free names are not guessed.",
  },
  "cwl:invalid-html-repeat-nested": {
    rfc: "0031",
    origin: "cwl",
    surface: "page",
    summary:
      "`repeat` collection nests deeper than one level (`a.b.c`) — only `outerItem.field` is in the genome; deeper nests stay holes.",
  },
  "cwl:emit:html-repeat": {
    rfc: "0031",
    origin: "cwl",
    surface: "emit",
    summary: "Thin emit: repeat node lost its iterable, item template, or when filter — do not guess the markup.",
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
    rfc: "0035",
    origin: "cwl",
    surface: "api",
    summary:
      "WebSocket residual beyond stream websocket (RFC-0035) — keep hole; do not invent channel/LiveView façades. Prefer stream websocket; when the peel can declare duplex.",
  },
  "unsupported:offsite-form": {
    rfc: "0029",
    origin: "cwl",
    surface: "page",
    summary:
      "Form action is not a same-site path. Off-site and protocol-relative actions stay a hole so the page cannot post the browser to another origin.",
  },
  "unsupported:open-redirect": {
    rfc: "0006",
    origin: "cwl",
    surface: "api",
    summary:
      "Redirect target is not a same-site path. Off-site and protocol-relative targets stay a hole so the genome cannot declare an open redirect.",
  },
  "unsupported:tracking-cookie": {
    rfc: "0034",
    origin: "cwl",
    surface: "api",
    summary:
      "Cookie is not a closed purpose (session, csrf, or enumerated preference) or uses samesite none. Refused so a stable joinable identifier cannot be declared. No tracking runtime is invented.",
  },
  "unsupported:multipart": {
    rfc: "0026",
    origin: "cwl",
    surface: "api",
    summary:
      "multipart/form-data residual beyond named field/file bindings (RFC-0026) — keep hole; do not invent upload middleware.",
  },
  "unsupported:nest-di": {
    rfc: "0038",
    origin: "nest",
    surface: "api",
    summary:
      "NestJS dependency-injection / module graph not lowered. Prefer peel into CWL effects or keep this hole — never invent a Nest façade.",
  },
  "unsupported:liveview": {
    rfc: "0038",
    origin: "phoenix",
    surface: "page",
    summary:
      "Phoenix LiveView (or kin) duplex UI protocol not lowered. Prefer stream websocket; + islands when peel can declare them — never invent LiveView runtime.",
  },
  "unsupported:flutter": {
    rfc: "0038",
    origin: "flutter",
    surface: "page",
    summary:
      "Flutter / Dart UI tree is not a web-page genome. Peel to routes/pages when possible; otherwise keep this hole — never invent Flutter-in-CWL.",
  },
  "unsupported:middleware-onion": {
    rfc: "0038",
    origin: "cwl",
    surface: "middleware",
    summary:
      "Layered middleware onion not expressible as ordered CWL effects. Name discrete effects when peel can; otherwise keep this hole.",
  },
  "unsupported:raw-sql": {
    rfc: "0038",
    origin: "cwl",
    surface: "api",
    summary:
      "Raw SQL text is not a CWL statement. Bound db select/insert/update/delete on a named engine stay; free SQL strings stay this hole.",
  },
  "cwl:replaces-not-url": {
    rfc: "0039",
    origin: "cwl",
    surface: "page",
    summary:
      "`replaces` must be an absolute http(s) URL or a same-site path. javascript: and protocol-relative values are refused.",
  },
  "cwl:peel-not-identity": {
    rfc: "0039",
    origin: "cwl",
    surface: "api",
    summary:
      "`from peel` stack must be a lowercase id (`php`, `express`, …) and `at` a non-empty origin path. Bad identity is not stored.",
  },
  "cwl:unknown-capability": {
    rfc: "0039",
    origin: "cwl",
    surface: "api",
    summary:
      "`capability` must be one of cookies, network-same-origin, network-cross-origin, storage, client. Unknown classes are refused.",
  },
  "cwl:bad-integrity": {
    rfc: "0040",
    origin: "cwl",
    surface: "page",
    summary:
      "`integrity` must be an SRI token (`sha256-` / `sha384-` / `sha512-` + base64). Empty or non-SRI values are refused — CWL does not invent hashes.",
  },
  "cwl:bad-asset-url": {
    rfc: "0040",
    origin: "cwl",
    surface: "page",
    summary:
      "`script` / `style` href must be a same-site path or absolute http(s) URL. javascript: and protocol-relative values are refused.",
  },
  "cwl:bad-asset-tail": {
    rfc: "0040",
    origin: "cwl",
    surface: "page",
    summary:
      "Trailing tokens after `script` / `style` are only `module` (script), `integrity \"…\"`, and `crossorigin` in that order. Unknown tails are refused.",
  },
  "cwl:file-needs-multipart": {
    rfc: "0041",
    origin: "cwl",
    surface: "page",
    summary:
      "`field … \"file\"` requires `form … enctype multipart`. File inputs without multipart stay a hole — no upload middleware invent.",
  },
  "cwl:multipart-not-get": {
    rfc: "0041",
    origin: "cwl",
    surface: "page",
    summary:
      "`enctype multipart` is refused on GET forms. Multipart bodies are POST (or kin) only.",
  },
  "cwl:dna-certificate-not-url": {
    rfc: "0042",
    origin: "cwl",
    surface: "api",
    summary:
      "`dna certificate` must be a same-site path, relative artifact path, or absolute http(s) URL. javascript: and exotic schemes are refused.",
  },
  "cwl:bad-dna-fingerprint": {
    rfc: "0042",
    origin: "cwl",
    surface: "api",
    summary:
      "`dna fingerprint` must be an SRI token (`sha384-` / `sha512-` + base64). CWL does not invent digests — host / Secure verify.",
  },
  "cwl:dna-fingerprint-too-weak": {
    rfc: "0043",
    origin: "cwl",
    surface: "api",
    summary:
      "`dna fingerprint` refuses `sha256-` for DNA binds (Grover margin). Use `sha384-` or `sha512-`. Asset integrity (RFC-0040) may still use sha256.",
  },
  "cwl:dna-bank-not-path": {
    rfc: "0042",
    origin: "cwl",
    surface: "api",
    summary:
      "`dna bank` must be a same-site path, relative directory/path, or absolute http(s) URL naming a bank of known certificates.",
  },
  "cwl:dna-bank-not-on-route": {
    rfc: "0042",
    origin: "cwl",
    surface: "api",
    summary:
      "`dna bank` is module-scope only. Per-route banks are refused so the genome has one proof corpus.",
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
