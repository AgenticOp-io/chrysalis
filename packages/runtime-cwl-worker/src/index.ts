import type { Module } from "@chrysalis/webir";

export const CWL_WORKER_RUNTIME_KIND = "chrysalis.cwl.runtime.worker" as const;
export const CWL_WORKER_RUNTIME_SCHEMA_VERSION = 1 as const;

export interface CwlWorkerRuntimeHandle {
  readonly kind: typeof CWL_WORKER_RUNTIME_KIND;
  readonly schemaVersion: typeof CWL_WORKER_RUNTIME_SCHEMA_VERSION;
  readonly routeCount: number;
}

/** Phase 46 scaffold — binds a WebIR module for future worker dispatch. */
export function createCwlWorkerRuntimeHandle(opts: { readonly module: Module }): CwlWorkerRuntimeHandle {
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
