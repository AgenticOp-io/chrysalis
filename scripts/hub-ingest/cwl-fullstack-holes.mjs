/**
 * Full-stack CWL hole catalog (RFC-0012 / G1149).
 * Honest holes for UI/component semantics not yet lowered to WebIR.
 */

/** @typedef {{ rfc: string, origin: string, surface: string, summary: string }} CwlFullstackHoleEntry */

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
    summary: "HTTP upstream proxy to existing WISP backend-services (operator-owned; Mongo unchanged).",
  },
  "cwl:empty-handler": {
    rfc: "0012",
    origin: "cwl",
    surface: "api",
    summary: "Handler body intentionally empty / not yet authored; placeholder hole.",
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
  return CWL_FULLSTACK_HOLE_CATALOG[reason] ?? null;
}

/**
 * @param {string} reason
 */
export function isCataloguedFullstackHole(reason) {
  return reason in CWL_FULLSTACK_HOLE_CATALOG;
}
