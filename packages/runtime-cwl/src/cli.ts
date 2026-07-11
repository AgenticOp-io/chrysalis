#!/usr/bin/env node
import { resolve } from "node:path";
import { createCwlRuntime } from "./runtime.js";
import { loadModuleFromCwlFile, loadModuleFromWebirJsonFile } from "./load-cwl.js";
import { loadCwlUiAssetsFromProject } from "./load-ui-assets.js";
import { startCwlServer } from "./server.js";

async function main(): Promise<void> {
  let cwlPath: string | null = null;
  let webirPath: string | null = null;
  let projectDir: string | null = null;
  let host = "127.0.0.1";
  let port = 8787;
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === "--cwl" && process.argv[i + 1]) cwlPath = process.argv[++i]!;
    else if (a === "--webir" && process.argv[i + 1]) webirPath = process.argv[++i]!;
    else if (a === "--project" && process.argv[i + 1]) projectDir = resolve(process.argv[++i]!);
    else if (a === "--host" && process.argv[i + 1]) host = process.argv[++i]!;
    else if (a === "--port" && process.argv[i + 1]) port = Number(process.argv[++i]);
  }
  if (!cwlPath && !webirPath) {
    console.error(
      "usage: chrysalis-cwl-serve --cwl routes.cwl [--project <dir>] [--host 127.0.0.1] [--port 8787]",
    );
    process.exit(1);
  }
  const module = cwlPath ? loadModuleFromCwlFile(cwlPath) : loadModuleFromWebirJsonFile(webirPath!);
  const uiAssets =
    projectDir !== null
      ? loadCwlUiAssetsFromProject(projectDir)
      : cwlPath !== null
        ? loadCwlUiAssetsFromProject(resolve(cwlPath, ".."))
        : null;
  const runtime = createCwlRuntime({
    module,
    ...(uiAssets !== null ? { uiAssets } : {}),
  });
  const server = await startCwlServer({ runtime, host, port });
  console.log(
    JSON.stringify({
      kind: "chrysalis.cwl.runtime.serve",
      schemaVersion: 1,
      host: server.host,
      port: server.port,
      routes: runtime.routes.length,
      uiAssets: uiAssets !== null,
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
