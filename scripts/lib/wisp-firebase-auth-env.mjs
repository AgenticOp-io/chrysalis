/**
 * Prepare env for non-interactive Firebase Hosting deploy (WISP POC).
 *
 * Prefer Application Default Credentials (service account JSON). A short or
 * stale FIREBASE_TOKEN (legacy `firebase login:ci`) often yields HTTP 401 and
 * must not override a working ADC.
 */
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const SA_BASENAME = "wisptools-production-firebase-adminsdk.json";

/**
 * @param {string} [wispToolsRoot]
 * @returns {string[]}
 */
export function candidateFirebaseAdminSdkPaths(wispToolsRoot) {
  const out = [];
  const fromEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (fromEnv) out.push(resolve(fromEnv));
  const override = process.env.CHRYSALIS_WISP_FIREBASE_SA?.trim();
  if (override) out.push(resolve(override));
  if (wispToolsRoot) {
    out.push(join(resolve(wispToolsRoot), SA_BASENAME));
    out.push(join(resolve(wispToolsRoot), "secrets", SA_BASENAME));
  }
  return [...new Set(out)];
}

/**
 * @param {string} [wispToolsRoot]
 * @returns {string | null}
 */
export function resolveFirebaseAdminSdkPath(wispToolsRoot) {
  for (const p of candidateFirebaseAdminSdkPaths(wispToolsRoot)) {
    if (p && existsSync(p)) return p;
  }
  return null;
}

/**
 * Heuristic: `firebase login:ci` tokens are typically long; sub-200 char values
 * seen in the wild have been truncated/stale and cause Hosting 401.
 * @param {string | undefined} token
 */
export function isSuspiciousFirebaseCiToken(token) {
  if (!token) return false;
  return token.trim().length < 200;
}

/**
 * @param {object} [opts]
 * @param {string} [opts.wispToolsRoot]
 * @param {NodeJS.ProcessEnv} [opts.env]
 * @returns {{ env: NodeJS.ProcessEnv, authMode: string, notes: string[], serviceAccountPath: string | null }}
 */
export function prepareWispFirebaseDeployEnv(opts = {}) {
  /** @type {NodeJS.ProcessEnv} */
  const env = { ...(opts.env ?? process.env) };
  /** @type {string[]} */
  const notes = [];
  const sa = resolveFirebaseAdminSdkPath(opts.wispToolsRoot);
  if (sa) {
    env.GOOGLE_APPLICATION_CREDENTIALS = sa;
    notes.push(`adc:${sa}`);
  }

  const token = env.FIREBASE_TOKEN;
  if (isSuspiciousFirebaseCiToken(token)) {
    delete env.FIREBASE_TOKEN;
    notes.push("unset-suspicious-FIREBASE_TOKEN");
  } else if (token && sa) {
    // Prefer ADC when both present — CI token often wins and 401s.
    delete env.FIREBASE_TOKEN;
    notes.push("prefer-adc-over-FIREBASE_TOKEN");
  }

  let authMode = "default-cli-login";
  if (env.GOOGLE_APPLICATION_CREDENTIALS && !env.FIREBASE_TOKEN) authMode = "adc";
  else if (env.FIREBASE_TOKEN) authMode = "firebase-ci-token";

  return { env, authMode, notes, serviceAccountPath: sa };
}
