import type { Module } from "@chrysalis/webir";
import type { HttpResponseEvent } from "@chrysalis/oracle";
import type { DiffResult } from "./diff.js";
import type { ReplayedResponse } from "./diff.js";

export interface ReplayOptions {
  readonly baseUrl: string;
  readonly fetch?: typeof globalThis.fetch;
  readonly onRequest?: (r: { url: string; init: RequestInit }) => void;
  readonly disableCookieChain?: boolean;
  readonly recordedSqlReplay?: boolean;
  readonly timeoutMs?: number;
  readonly module?: Module;
  readonly injectDeterminismHeaders?: boolean;
  readonly concurrency?: number;
  /**
   * When true with `concurrency > 1`, `disableCookieChain`, global fetch (no injected `fetch` /
   * `onRequest`), and no `module`, replay uses `worker_threads` for isolation (remote `--base-url`
   * verify). Requires built `replay-worker.js` next to `replay.js`. Ignored when incompatible.
   */
  readonly workerThreads?: boolean;
  /**
   * When set, only replay traces whose route key is exactly this string (after
   * trim / internal whitespace collapse), e.g. `GET /posts`. Matches the same
   * `route` string as {@link TraceOutcome.route}. Intended for large corpora.
   */
  readonly onlyRoute?: string;
  /**
   * When set, only replay the trace with this `header.traceId` (exact match after trim).
   */
  readonly onlyTraceId?: string;
}

export interface TraceOutcome {
  readonly traceId: string;
  readonly route: string;
  readonly expected: HttpResponseEvent;
  readonly actual: ReplayedResponse;
  readonly diff: DiffResult;
  readonly ok: boolean;
  readonly attributedNodeIds?: ReadonlyArray<string>;
}

/** Stable uint32 seed derived from a trace id (used for `x-chrysalis-random-seed`). */
export function traceDeterminismSeed(traceId: string): number {
  let h = 2166136261;
  for (let i = 0; i < traceId.length; i++) {
    h ^= traceId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
