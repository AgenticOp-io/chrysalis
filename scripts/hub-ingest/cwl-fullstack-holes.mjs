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
    rfc: "0012",
    origin: "svelte",
    surface: "data",
    summary: "+page.server load / +layout.server load not modeled.",
  },
  "hub-svelte:form-action": {
    rfc: "0012",
    origin: "svelte",
    surface: "api",
    summary: "SvelteKit form actions not modeled.",
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
