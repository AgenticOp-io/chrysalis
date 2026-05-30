import { createServer, type Server } from "node:http";
import type { CwlRuntimeHandle } from "./runtime.js";

export interface CwlServerHandle {
  readonly port: number;
  readonly host: string;
  readonly runtime: CwlRuntimeHandle;
  readonly server: Server;
  stop(): Promise<void>;
}

export async function startCwlServer(opts: {
  runtime: CwlRuntimeHandle;
  host?: string;
  port?: number;
}): Promise<CwlServerHandle> {
  const host = opts.host ?? "127.0.0.1";
  const port = opts.port ?? 0;
  const server = createServer((req, res) => {
    void opts.runtime.handleNodeRequest(req, res);
  });
  await new Promise<void>((resolveP, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolveP());
  });
  const addr = server.address();
  const boundPort = typeof addr === "object" && addr ? addr.port : port;
  return {
    host,
    port: boundPort,
    runtime: opts.runtime,
    server,
    async stop() {
      await new Promise<void>((resolveP, reject) => {
        server.close((err) => (err ? reject(err) : resolveP()));
      });
    },
  };
}
