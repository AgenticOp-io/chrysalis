/**
 * Multi-language site inventory adapter registry.
 * Order mirrors packages/ingest UI markup discovery: Svelte → Vue → Angular → Next → PHP Blade → PHP → generic.
 *
 * @typedef {object} SiteInventoryOriginAdapter
 * @property {string} name
 * @property {(root: string) => boolean} detect
 * @property {(root: string) => object} inventoryOrigin
 */
import * as sveltekit from "./sveltekit.mjs";
import * as vue from "./vue.mjs";
import * as angular from "./angular.mjs";
import * as next from "./next.mjs";
import * as phpBlade from "./php-blade.mjs";
import * as php from "./php.mjs";
import * as generic from "./generic.mjs";
import {
  inventoryLivePages,
  routesToLivePaths,
  summarizeInventory,
  WISP_POC_LIVE_PAGES,
} from "./shared.mjs";

/** @type {ReadonlyArray<SiteInventoryOriginAdapter>} */
export const SITE_INVENTORY_ADAPTERS = [
  sveltekit,
  vue,
  angular,
  next,
  phpBlade,
  php,
  generic,
];

export function listAdapterNames() {
  return SITE_INVENTORY_ADAPTERS.map((a) => a.name);
}

/**
 * @param {string} root
 * @param {string} [forcedName]
 */
export function detectOriginAdapter(root, forcedName) {
  if (forcedName) {
    const hit = SITE_INVENTORY_ADAPTERS.find((a) => a.name === forcedName);
    if (!hit) throw new Error(`Unknown inventory adapter: ${forcedName}`);
    return hit;
  }
  for (const a of SITE_INVENTORY_ADAPTERS) {
    if (a.name === "generic") continue;
    try {
      if (a.detect(root)) return a;
    } catch {
      /* try next */
    }
  }
  return generic;
}

/**
 * @param {string} root
 * @param {{ framework?: string }} [opts]
 */
export function inventoryOriginRoot(root, opts = {}) {
  const adapter = detectOriginAdapter(root, opts.framework);
  const origin = adapter.inventoryOrigin(root);
  return { adapter: adapter.name, origin };
}

/**
 * @param {string} baseUrl
 * @param {{ pages?: string[], originRoutes?: string[], useWispPocPages?: boolean }} [opts]
 */
export async function inventoryLive(baseUrl, opts = {}) {
  let pages = opts.pages;
  if (!pages || pages.length === 0) {
    pages = routesToLivePaths(opts.originRoutes || [], opts.useWispPocPages ? WISP_POC_LIVE_PAGES : ["/"]);
  }
  return inventoryLivePages(baseUrl, pages);
}

export { summarizeInventory, WISP_POC_LIVE_PAGES, routesToLivePaths, inventoryLivePages };
