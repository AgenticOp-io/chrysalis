/**
 * Milestone 6A — auth-boundary oracle replay roll-up for flagship verify scripts.
 * Routes use verify's `"METHOD PATH"` keys (see `@chrysalis/verify` replay outcomes).
 */

/** Laravel-shaped pilot (`flagship/laravel-min`): login / logout / session identity. */
export const LARAVEL_MIN_AUTH_BOUNDARY_ROUTES = Object.freeze([
  "GET /login",
  "POST /login",
  "POST /logout",
  "GET /session/me",
  "GET /gate-probe",
]);

/** Composer scaffold pilot (`chrysalis-laravel-work`): Chrysalis session helpers. */
export const LARAVEL_FULL_AUTH_BOUNDARY_ROUTES = Object.freeze([
  "GET /chrysalis-session/login",
  "POST /chrysalis-session/login",
  "GET /chrysalis-session/me",
  "GET /chrysalis-session/logout",
  "POST /chrysalis-session/logout",
  "GET /chrysalis-auth-probe",
  "GET /chrysalis-socialite-fortify-probe",
]);

/**
 * @param {{ endpoints: ReadonlyArray<{ route: string; framesTotal: number; framesPassed: number }> }} report
 * @param {readonly string[]} requiredRoutes
 */
export function authBoundaryReplayRollup(report, requiredRoutes) {
  let framesTotal = 0;
  let framesPassed = 0;
  /** @type {string[]} */
  const missingRoutes = [];
  for (const key of requiredRoutes) {
    const ep = report.endpoints.find((e) => e.route === key);
    if (!ep || ep.framesTotal === 0) {
      missingRoutes.push(key);
      continue;
    }
    framesTotal += ep.framesTotal;
    framesPassed += ep.framesPassed;
  }
  const correctness = framesTotal === 0 ? 0 : framesPassed / framesTotal;
  return { correctness, framesTotal, framesPassed, missingRoutes };
}
