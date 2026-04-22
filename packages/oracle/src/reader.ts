/**
 * TraceCorpus reader: turns a directory of NDJSON trace files into an
 * in-memory {@link TraceCorpus}.
 *
 * Layout on disk:
 *   traces/
 *     <iso-date>/
 *       <trace-id>.ndjson        (one file per request)
 *
 * We read and validate each file strictly; a malformed file raises rather
 * than being silently dropped, because the downstream `verify` stage relies
 * on the corpus being complete.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  SCHEMA_VERSION,
  type Trace,
  type TraceBodyEvent,
  type TraceCorpus,
  type TraceEvent,
  type TraceFooter,
  type TraceHeader,
  parseEvent,
} from "./trace-schema.js";

export class TraceFileError extends Error {
  constructor(
    public readonly file: string,
    public readonly lineNumber: number,
    message: string,
  ) {
    super(`${file}:${lineNumber}: ${message}`);
    this.name = "TraceFileError";
  }
}

export function parseTraceFile(file: string): Trace {
  const raw = readFileSync(file, "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) {
    throw new TraceFileError(file, 1, "trace must contain at least a header and footer");
  }

  const events: TraceEvent[] = lines.map((line, i) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch (e) {
      throw new TraceFileError(file, i + 1, `invalid JSON: ${(e as Error).message}`);
    }
    try {
      return parseEvent(parsed);
    } catch (e) {
      throw new TraceFileError(file, i + 1, (e as Error).message);
    }
  });

  const header = events[0];
  const footer = events[events.length - 1];
  if (header?.type !== "header") {
    throw new TraceFileError(file, 1, "first event must be of type 'header'");
  }
  if (footer?.type !== "footer") {
    throw new TraceFileError(file, events.length, "last event must be of type 'footer'");
  }

  const bodyEvents = events.slice(1, -1).map((e, i) => {
    if (e.type === "header" || e.type === "footer") {
      throw new TraceFileError(file, i + 2, "header/footer events are only allowed at endpoints");
    }
    return e as TraceBodyEvent;
  });

  return {
    header: header as TraceHeader,
    events: bodyEvents,
    footer: footer as TraceFooter,
  };
}

export interface ReadCorpusOptions {
  readonly root: string; // root `traces/` directory
}

export function readCorpus(opts: ReadCorpusOptions): TraceCorpus {
  const traces: Trace[] = [];
  const root = opts.root;
  for (const day of readdirSync(root)) {
    const dayPath = join(root, day);
    if (!statSync(dayPath).isDirectory()) continue;
    for (const file of readdirSync(dayPath)) {
      if (!file.endsWith(".ndjson")) continue;
      const trace = parseTraceFile(join(dayPath, file));
      if (trace.header.schemaVersion !== SCHEMA_VERSION) {
        throw new TraceFileError(
          join(dayPath, file),
          1,
          `schema version mismatch: got ${trace.header.schemaVersion}, expected ${SCHEMA_VERSION}`,
        );
      }
      traces.push(trace);
    }
  }
  // Deterministic ordering: by startedAt then traceId.
  traces.sort((a, b) => {
    const cmp = a.header.startedAt.localeCompare(b.header.startedAt);
    return cmp !== 0 ? cmp : a.header.traceId.localeCompare(b.header.traceId);
  });
  return {
    id: `corpus:${root}`,
    createdAt: new Date().toISOString(),
    root,
    traces,
  };
}

/**
 * Indexes a corpus by route signature (METHOD + path template) so ingest and
 * verify can quickly enumerate observed examples for a given handler.
 */
export interface RouteSignature {
  readonly method: string;
  readonly path: string;
}

export function groupByRoute(corpus: TraceCorpus): Map<string, Trace[]> {
  const m = new Map<string, Trace[]>();
  for (const t of corpus.traces) {
    const req = t.events.find((e) => e.type === "http.request");
    if (!req || req.type !== "http.request") continue;
    const key = `${req.method} ${req.path}`;
    let arr = m.get(key);
    if (!arr) {
      arr = [];
      m.set(key, arr);
    }
    arr.push(t);
  }
  return m;
}
