/**
 * WISP demo / platform-admin credentials for operator scripts.
 * Passwords must come from the environment — never commit defaults (OSS / D6447 trust).
 *
 * CHRYSALIS_WISP_DEMO_EMAIL (default demo@wisptools.io)
 * CHRYSALIS_WISP_DEMO_PASSWORD (required for live login)
 * CHRYSALIS_WISP_PLATFORM_ADMIN_EMAIL (default admin@wisptools.io)
 * CHRYSALIS_WISP_PLATFORM_ADMIN_PASSWORD (required for admin probes)
 */
export function wispDemoEmail() {
  return (process.env.CHRYSALIS_WISP_DEMO_EMAIL || "demo@wisptools.io").trim();
}

/**
 * @param {{ required?: boolean }} [opts]
 * @returns {string}
 */
export function wispDemoPassword(opts = {}) {
  const p = (process.env.CHRYSALIS_WISP_DEMO_PASSWORD || "").trim();
  if (!p && opts.required !== false) {
    throw new Error(
      "CHRYSALIS_WISP_DEMO_PASSWORD is required (no committed password default — see docs/GO-PUBLIC.md)",
    );
  }
  return p;
}

export function wispPlatformAdminEmail() {
  return (
    process.env.CHRYSALIS_WISP_PLATFORM_ADMIN_EMAIL || "admin@wisptools.io"
  ).trim();
}

/**
 * @param {{ required?: boolean }} [opts]
 * @returns {string}
 */
export function wispPlatformAdminPassword(opts = {}) {
  const p = (process.env.CHRYSALIS_WISP_PLATFORM_ADMIN_PASSWORD || "").trim();
  if (!p && opts.required !== false) {
    throw new Error(
      "CHRYSALIS_WISP_PLATFORM_ADMIN_PASSWORD is required (no committed password default — see docs/GO-PUBLIC.md)",
    );
  }
  return p;
}
