#!/usr/bin/env node
/** Minimal Express listener for WISP API oracle capture (Phase 28d / 29a). */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { listApiRouteSpecs } from "../../../scripts/wisp-cwl-api-oracle-contract.mjs";

const require = createRequire(import.meta.url);
const express = require("express");
const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const host = process.env.CHRYSALIS_HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 0);

const app = express();
const specs = listApiRouteSpecs(join(scriptRoot, "fixtures/hub-wisp-management/wisp-api-paths.json"));

for (const spec of specs) {
  const method = spec.method.toLowerCase();
  const handler = (_req, res) => {
    res.json(spec.golden);
  };
  if (typeof app[method] === "function") {
    app[method](spec.path, handler);
  } else {
    app.all(spec.path, handler);
  }
}

const server = app.listen(port, host, () => {
  const addr = server.address();
  const actualPort = typeof addr === "object" && addr ? addr.port : port;
  process.stdout.write(`${JSON.stringify({ ok: true, host, port: actualPort, routeCount: specs.length })}\n`);
});
