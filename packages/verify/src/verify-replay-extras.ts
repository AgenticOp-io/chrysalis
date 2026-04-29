import type { ReplayOptions } from "./replay-types.js";

export type VerifyReplayExtrasResult =
  | { ok: true; extras: Partial<ReplayOptions>; logHint: string | null }
  | { ok: false; message: string };

/**
 * Resolve optional HTTP replay tuning from CLI-style flags and/or `process.env`,
 * matching `chrysalis verify` / `repair` (D204).
 *
 * Env (when flags omit a value): `CHRYSALIS_VERIFY_REPLAY_CONCURRENCY`,
 * `CHRYSALIS_VERIFY_DISABLE_COOKIE_CHAIN=1`, `CHRYSALIS_VERIFY_TIMEOUT_MS` (>= 1000),
 * `CHRYSALIS_VERIFY_WORKER_THREADS=1` (with `concurrency` > 1, no `--project`, global fetch only).
 * `concurrency` > 1 requires cookie chain off (flag or env).
 */
export function resolveVerifyReplayExtras(
  flags: Record<string, string | boolean> = {},
): VerifyReplayExtrasResult {
  const disableCookieChain =
    flags["disable-cookie-chain"] === true || process.env.CHRYSALIS_VERIFY_DISABLE_COOKIE_CHAIN === "1";

  const workerThreads =
    flags["replay-worker-threads"] === true || process.env.CHRYSALIS_VERIFY_WORKER_THREADS === "1";

  let concurrency = 1;
  const rcFlag = flags["replay-concurrency"];
  if (typeof rcFlag === "string") {
    const n = Math.floor(Number.parseFloat(rcFlag));
    if (!Number.isFinite(n) || n < 1) {
      return { ok: false, message: "error: --replay-concurrency must be a finite number >= 1" };
    }
    concurrency = n;
  } else if (process.env.CHRYSALIS_VERIFY_REPLAY_CONCURRENCY) {
    const n = Math.floor(Number.parseFloat(process.env.CHRYSALIS_VERIFY_REPLAY_CONCURRENCY));
    if (Number.isFinite(n) && n >= 1) concurrency = n;
  }

  if (concurrency > 1 && !disableCookieChain) {
    return {
      ok: false,
      message:
        "error: --replay-concurrency > 1 requires --disable-cookie-chain (or CHRYSALIS_VERIFY_DISABLE_COOKIE_CHAIN=1); see DESIGN D202",
    };
  }

  let timeoutMs: number | undefined;
  const toFlag = flags["replay-timeout-ms"];
  if (typeof toFlag === "string") {
    const n = Math.floor(Number.parseFloat(toFlag));
    if (!Number.isFinite(n) || n < 1000) {
      return { ok: false, message: "error: --replay-timeout-ms must be a finite number >= 1000" };
    }
    timeoutMs = n;
  } else if (process.env.CHRYSALIS_VERIFY_TIMEOUT_MS) {
    const n = Math.floor(Number.parseFloat(process.env.CHRYSALIS_VERIFY_TIMEOUT_MS));
    if (Number.isFinite(n) && n >= 1000) timeoutMs = n;
  }

  const extras = {
    ...(disableCookieChain ? { disableCookieChain: true as const } : {}),
    ...(concurrency > 1 ? { concurrency } : {}),
    ...(timeoutMs !== undefined ? { timeoutMs } : {}),
    ...(workerThreads ? { workerThreads: true as const } : {}),
  } as Partial<ReplayOptions>;

  const parts: string[] = [];
  if (concurrency > 1) parts.push(`concurrency=${concurrency}`);
  if (disableCookieChain) parts.push("cookie-chain=off");
  if (timeoutMs !== undefined) parts.push(`timeoutMs=${timeoutMs}`);
  if (workerThreads) parts.push("workerThreads");
  const logHint = parts.length > 0 ? parts.join(", ") : null;

  return { ok: true, extras, logHint };
}
