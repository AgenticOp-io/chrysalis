/**
 * @chrysalis/oracle — record/replay sidecar for legacy PHP apps.
 * Milestone 1 will implement an HTTP proxy + SQL capture + corpus persistence.
 */

export interface HttpFrame {
  readonly request: {
    readonly method: string;
    readonly path: string;
    readonly headers: Readonly<Record<string, string>>;
    readonly body: string | null;
  };
  readonly response: {
    readonly status: number;
    readonly headers: Readonly<Record<string, string>>;
    readonly body: string | null;
  };
}

export interface SqlFrame {
  readonly query: string;
  readonly params: ReadonlyArray<unknown>;
  readonly result: unknown;
}

export interface TraceFrame {
  readonly id: string;
  readonly ts: string;
  readonly http: HttpFrame;
  readonly sql: ReadonlyArray<SqlFrame>;
  readonly outbound: ReadonlyArray<{ kind: string; payload: unknown }>;
  readonly determinism: {
    readonly nowMs: ReadonlyArray<number>;
    readonly randomValues: ReadonlyArray<number>;
  };
}

export interface TraceCorpus {
  readonly id: string;
  readonly createdAt: string;
  readonly frames: ReadonlyArray<TraceFrame>;
}

export interface ObserveConfig {
  readonly upstream: string;
  readonly listen: { readonly host: string; readonly port: number };
  readonly outDir: string;
  readonly redact?: ReadonlyArray<string>;
}

export interface ObserveSession {
  stop(): Promise<TraceCorpus>;
}

export async function observe(_config: ObserveConfig): Promise<ObserveSession> {
  throw new Error("oracle: observe not implemented (Milestone 1).");
}
