#!/usr/bin/env node
/** Long-running WISP chimera gateway (GCE bundle entrypoint). */
import { createWispChimeraGateway } from "./wisp-cwl-chimera-gateway.mjs";
import { homedir } from "node:os";
import { join } from "node:path";

function parseArgs(argv) {
  let cwlPath = join(homedir(), "wisp-cwl-poc/routes.cwl");
  let backendUrl = process.env.WISP_BACKEND_URL ?? "http://127.0.0.1:3001";
  let host = process.env.WISP_CWL_POC_BIND ?? "0.0.0.0";
  let port = Number(process.env.WISP_CWL_POC_PORT ?? 19100);
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--cwl" && argv[i + 1]) cwlPath = argv[++i];
    else if (a === "--backend" && argv[i + 1]) backendUrl = argv[++i];
    else if (a === "--host" && argv[i + 1]) host = argv[++i];
    else if (a === "--port" && argv[i + 1]) port = Number(argv[++i]);
  }
  return { cwlPath, backendUrl, host, port };
}

const args = parseArgs(process.argv);
const gw = await createWispChimeraGateway({
  ...args,
  nativeApi: true,
  svelteFallback: "",
});
console.log(
  JSON.stringify({
    kind: gw.kind,
    schemaVersion: gw.schemaVersion,
    host: gw.host,
    port: gw.port,
    cwlPath: gw.cwlPath,
    svelteFallback: gw.svelteFallback,
  }),
);
process.on("SIGTERM", () => {
  void gw.stop().then(() => process.exit(0));
});
process.on("SIGINT", () => {
  void gw.stop().then(() => process.exit(0));
});
