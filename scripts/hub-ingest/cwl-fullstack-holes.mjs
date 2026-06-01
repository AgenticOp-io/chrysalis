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
