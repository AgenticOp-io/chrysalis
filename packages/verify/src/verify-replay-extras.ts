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
 * `CHRYSALIS_VERIFY_WORKER_THREADS=1` (with `concurrency` > 1, no `--project`, global fetch only),
 * `CHRYSALIS_VERIFY_SHARD_COUNT` (>= 2) and optional `CHRYSALIS_VERIFY_SHARD_INDEX` (default `0`).
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

  let shardCount: number | undefined;
  let shardIndex: number | undefined;
  const scFlag = flags["shard-count"];
  if (typeof scFlag === "string") {
    const k = Math.floor(Number.parseFloat(scFlag));
    if (!Number.isFinite(k) || k < 2) {
      return { ok: false, message: "error: --shard-count must be a finite integer >= 2" };
    }
    shardCount = k;
  } else if (process.env.CHRYSALIS_VERIFY_SHARD_COUNT) {
    const k = Math.floor(Number.parseFloat(process.env.CHRYSALIS_VERIFY_SHARD_COUNT));
    if (Number.isFinite(k) && k >= 2) shardCount = k;
  }

  const siFlag = flags["shard-index"];
  if (typeof siFlag === "string") {
    const si = Math.floor(Number.parseFloat(siFlag));
    if (!Number.isFinite(si)) {
      return { ok: false, message: "error: --shard-index must be a finite integer" };
    }
    shardIndex = si;
  } else if (process.env.CHRYSALIS_VERIFY_SHARD_INDEX) {
    const si = Math.floor(Number.parseFloat(process.env.CHRYSALIS_VERIFY_SHARD_INDEX));
    if (Number.isFinite(si)) shardIndex = si;
  }

  if (shardCount !== undefined && shardIndex === undefined) {
    shardIndex = 0;
  }
  if (shardIndex !== undefined && shardCount === undefined) {
    return {
      ok: false,
      message: "error: --shard-index requires --shard-count (>= 2) (or CHRYSALIS_VERIFY_SHARD_COUNT)",
    };
  }
  if (shardCount !== undefined && shardIndex !== undefined && (shardIndex < 0 || shardIndex >= shardCount)) {
    return {
      ok: false,
      message: `error: --shard-index must satisfy 0 <= index < shard-count (got ${shardIndex}, ${shardCount})`,
    };
  }

  const extras: Partial<ReplayOptions> = {
    ...(disableCookieChain ? { disableCookieChain: true as const } : {}),
    ...(concurrency > 1 ? { concurrency } : {}),
    ...(timeoutMs !== undefined ? { timeoutMs } : {}),
    ...(workerThreads ? { workerThreads: true as const } : {}),
    ...(shardCount !== undefined && shardIndex !== undefined ? { shardCount, shardIndex } : {}),
  };

  const parts: string[] = [];
  if (concurrency > 1) parts.push(`concurrency=${concurrency}`);
  if (disableCookieChain) parts.push("cookie-chain=off");
  if (timeoutMs !== undefined) parts.push(`timeoutMs=${timeoutMs}`);
  if (workerThreads) parts.push("workerThreads");
  if (shardCount !== undefined && shardIndex !== undefined) {
    parts.push(`shard=${shardIndex}/${shardCount}`);
  }

  const logHint = parts.length > 0 ? parts.join(", ") : null;

  return { ok: true, extras, logHint };
}
