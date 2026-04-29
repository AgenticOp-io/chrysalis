import { parentPort } from "node:worker_threads";
import type { Trace } from "@chrysalis/oracle";
import type { ReplayOptions } from "./replay-types.js";
import { replaySingleTrace } from "./replay-http.js";

export interface ReplayWorkerMessage {
  readonly index: number;
  readonly trace: Trace;
  readonly opts: ReplayOptions;
}

parentPort?.on("message", async (msg: ReplayWorkerMessage) => {
  try {
    const outcome = await replaySingleTrace(msg.trace, msg.opts);
    parentPort?.postMessage({ ok: true as const, outcome });
  } catch (e) {
    parentPort?.postMessage({
      ok: false as const,
      error: e instanceof Error ? e.message : String(e),
    });
  }
});
