/**
 * Corpus replay: turn a TraceCorpus into a sequence of HTTP requests against
 * a running generated app, diff each response against what was captured, and
 * return a per-trace VerifyOutcome.
 */

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";
import type { HttpRequestEvent, Trace, TraceCorpus } from "@chrysalis/oracle";
import { replayOne } from "./replay-http.js";
import type { ReplayOptions, TraceOutcome } from "./replay-types.js";
export type { ReplayOptions, TraceOutcome } from "./replay-types.js";
export { traceDeterminismSeed } from "./replay-types.js";

function normalizeRouteKey(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

function traceRouteKey(trace: Trace): string | null {
  const req = trace.events.find((e) => e.type === "http.request") as HttpRequestEvent | undefined;
  if (!req) return null;
  return normalizeRouteKey(`${req.method} ${req.path}`);
}

function applyTraceFilters(traces: ReadonlyArray<Trace>, opts: ReplayOptions): Trace[] {
  let out = [...traces];
  if (opts.onlyRoute !== undefined && opts.onlyRoute.trim() !== "") {
    const want = normalizeRouteKey(opts.onlyRoute);
    out = out.filter((t) => traceRouteKey(t) === want);
  }
  if (opts.onlyTraceId !== undefined && opts.onlyTraceId.trim() !== "") {
    const id = opts.onlyTraceId.trim();
    out = out.filter((t) => t.header.traceId === id);
  }
  return out;
}

export async function replayCorpus(corpus: TraceCorpus, opts: ReplayOptions): Promise<TraceOutcome[]> {
  const filtered = applyTraceFilters(corpus.traces, opts);
  if (
    (opts.onlyRoute !== undefined && opts.onlyRoute.trim() !== "") ||
    (opts.onlyTraceId !== undefined && opts.onlyTraceId.trim() !== "")
  ) {
    if (filtered.length === 0) {
      throw new Error(
        `replayCorpus: no traces matched filters (onlyRoute=${JSON.stringify(
          opts.onlyRoute ?? null,
        )}, onlyTraceId=${JSON.stringify(opts.onlyTraceId ?? null)}; corpus has ${corpus.traces.length} trace(s))`,
      );
    }
  }
  const ordered = [...filtered].sort((a, b) =>
    a.header.startedAt.localeCompare(b.header.startedAt),
  );
  const conc = Math.max(1, Math.floor(opts.concurrency ?? 1));
  if (conc > 1 && !opts.disableCookieChain) {
    throw new Error(
      "replayCorpus: concurrency > 1 requires disableCookieChain: true (no shared cookie jar between traces)",
    );
  }

  if (opts.workerThreads === true && conc > 1 && !canUseWorkerThreads(opts)) {
    throw new Error(
      "replayCorpus: workerThreads requires global fetch (no injected fetch/onRequest), no IR module attribution, and disableCookieChain",
    );
  }

  if (conc === 1) {
    const cookieJar = new Map<string, string>();
    const outcomes: TraceOutcome[] = [];
    for (const trace of ordered) {
      const outcome = await replayOne(trace, cookieJar, opts);
      if (outcome) outcomes.push(outcome);
    }
    return outcomes;
  }

  if (canUseWorkerThreads(opts)) {
    return replayCorpusWithWorkerThreads(ordered, opts, conc);
  }

  const raw = await mapWithConcurrency(ordered, conc, (trace) => replayOne(trace, new Map(), opts));
  return raw.filter((x): x is TraceOutcome => x != null);
}

function canUseWorkerThreads(opts: ReplayOptions): boolean {
  return (
    opts.workerThreads === true &&
    opts.disableCookieChain === true &&
    opts.fetch === undefined &&
    opts.onRequest === undefined &&
    opts.module === undefined
  );
}

function workerReplayOpts(opts: ReplayOptions): ReplayOptions {
  const base: ReplayOptions = {
    baseUrl: opts.baseUrl,
    disableCookieChain: true,
    timeoutMs: opts.timeoutMs ?? 10_000,
    concurrency: 1,
    workerThreads: false,
  };
  return {
    ...base,
    ...(opts.recordedSqlReplay !== undefined ? { recordedSqlReplay: opts.recordedSqlReplay } : {}),
    ...(opts.injectDeterminismHeaders !== undefined ? { injectDeterminismHeaders: opts.injectDeterminismHeaders } : {}),
  };
}

function replayWorkerScript(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "replay-worker.js"),
    join(here, "..", "dist", "replay-worker.js"),
  ];
  for (const js of candidates) {
    if (existsSync(js)) return js;
  }
  throw new Error(
    `replayCorpus: workerThreads requires compiled replay-worker.js (tried ${candidates.join(", ")}). Run pnpm build in @chrysalis/verify.`,
  );
}

async function replayCorpusWithWorkerThreads(
  ordered: Trace[],
  opts: ReplayOptions,
  conc: number,
): Promise<TraceOutcome[]> {
  const workerPath = replayWorkerScript();
  const wOpts = workerReplayOpts(opts);
  const nWorkers = Math.min(conc, ordered.length);
  const workers = Array.from({ length: nWorkers }, () =>
    new Worker(workerPath, { type: "module" } as ConstructorParameters<typeof Worker>[1]),
  );
  const outcomes: Array<TraceOutcome | null> = new Array(ordered.length).fill(null);

  try {
    await Promise.all(
      workers.map((worker, wid) =>
        (async () => {
          for (let i = wid; i < ordered.length; i += nWorkers) {
            const trace = ordered[i]!;
            const outcome = await new Promise<TraceOutcome | null>((resolve, reject) => {
              const onMessage = (msg: unknown) => {
                const m = msg as
                  | { ok: true; outcome: TraceOutcome | null }
                  | { ok: false; error: string };
                if (m.ok) {
                  resolve(m.outcome);
                } else {
                  reject(new Error(m.error));
                }
              };
              const onError = (e: Error) => {
                reject(e);
              };
              worker.once("message", onMessage);
              worker.once("error", onError);
              worker.postMessage({ index: i, trace, opts: wOpts });
            });
            outcomes[i] = outcome;
          }
        })(),
      ),
    );
  } finally {
    await Promise.all(workers.map((w) => w.terminate()));
  }

  return outcomes.filter((x): x is TraceOutcome => x != null);
}

/** Fixed order `items`; up to `limit` concurrent `fn` runs. */
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length) as R[];
  let next = 0;
  async function worker(): Promise<void> {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]!);
    }
  }
  const n = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}
