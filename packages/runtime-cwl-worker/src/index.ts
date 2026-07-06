import type { Module } from "@chrysalis/webir";
import {
  createCwlRuntime,
  type CwlRuntimeConfig,
  type CwlRuntimeHandle,
} from "@chrysalis/runtime-cwl";

export const CWL_WORKER_RUNTIME_KIND = "chrysalis.cwl.runtime.worker" as const;
export const CWL_WORKER_RUNTIME_SCHEMA_VERSION = 1 as const;

export interface CwlWorkerRuntimeHandle {
  readonly kind: typeof CWL_WORKER_RUNTIME_KIND;
  readonly schemaVersion: typeof CWL_WORKER_RUNTIME_SCHEMA_VERSION;
  readonly routeCount: number;
  readonly fetch: CwlRuntimeHandle["fetch"];
  readonly stop: () => Promise<void>;
}

/** Phase 46 scaffold — binds a WebIR module for future worker dispatch. */
export function createCwlWorkerRuntimeHandle(opts: { readonly module: Module }): Omit<
  CwlWorkerRuntimeHandle,
  "fetch" | "stop"
> {
  let routeCount = 0;
  for (const rootId of opts.module.roots) {
    const node = opts.module.nodes.get(rootId);
    if (node?.dialect === "web.request" && node.op === "route") routeCount += 1;
  }
  return {
    kind: CWL_WORKER_RUNTIME_KIND,
    schemaVersion: CWL_WORKER_RUNTIME_SCHEMA_VERSION,
    routeCount,
  };
}

/** Worker/edge fetch handler backed by `@chrysalis/runtime-cwl` simulate dispatch. */
export function createCwlWorkerFetchHandler(config: CwlRuntimeConfig): CwlRuntimeHandle["fetch"] {
  const runtime = createCwlRuntime(config);
  return (input) => runtime.fetch(input);
}

/** Bind a CWL module for worker-style fetch dispatch (verify-gated; no env/network shortcuts). */
export function createCwlWorkerRuntime(config: CwlRuntimeConfig): CwlWorkerRuntimeHandle {
  const runtime = createCwlRuntime(config);
  const meta = createCwlWorkerRuntimeHandle({ module: config.module });
  return {
    ...meta,
    fetch: (input) => runtime.fetch(input),
    stop: () => runtime.stop(),
  };
}
