/**
 * Demo safety limits for the public Translation Hub (hub.agenticop.io).
 *
 * Off by default — local and private hub deployments are unaffected. The public
 * demo VM sets CHRYSALIS_HUB_DEMO_MODE=1 so a visitor pointing the hub at a real
 * site can't turn a "demo" into an unbounded, LLM-assisted rewrite of the whole
 * codebase (and the bill that comes with it). Two limits, both overridable:
 *   - CHRYSALIS_HUB_DEMO_MAX_ROUTES: pages/routes translated per site per request (default 2)
 *   - CHRYSALIS_HUB_DEMO_MAX_SITES: origin sites started per batch/pipeline request (default 1)
 * The single-flight lock (only one job/batch/setup/verify running hub-wide) already
 * lives in chrysalis-operator-web.mjs's hubBusy() — this module only adds the scope caps.
 */

export function isHubDemoMode() {
  return process.env.CHRYSALIS_HUB_DEMO_MODE === "1";
}

function positiveIntEnv(name, fallback) {
  const n = Number(process.env[name] ?? String(fallback));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function demoMaxRoutes() {
  return positiveIntEnv("CHRYSALIS_HUB_DEMO_MAX_ROUTES", 2);
}

export function demoMaxSites() {
  return positiveIntEnv("CHRYSALIS_HUB_DEMO_MAX_SITES", 1);
}

export class HubDemoLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = "HubDemoLimitError";
    this.code = "demo-scope-limit";
  }
}

/** Throws when demo mode is on and a batch/pipeline request targets too many sites. */
export function assertDemoSiteScope(siteCount) {
  if (!isHubDemoMode()) return;
  const max = demoMaxSites();
  if (siteCount > max) {
    throw new HubDemoLimitError(
      `This public demo runs ${max} origin site${max === 1 ? "" : "s"} per request (asked for ${siteCount}). ` +
        `Ask for a full pilot at hello@agenticop.io to run the whole batch.`,
    );
  }
}

/** Throws when demo mode is on and a site has more declared routes than the demo allows. */
export function assertDemoRouteScope(routeCount) {
  if (!isHubDemoMode()) return;
  const max = demoMaxRoutes();
  if (routeCount > max) {
    throw new HubDemoLimitError(
      `This public demo translates ${max} page${max === 1 ? "" : "s"} per request (this site declares ${routeCount} routes). ` +
        `Ask for a full pilot at hello@agenticop.io to run the whole site.`,
    );
  }
}
