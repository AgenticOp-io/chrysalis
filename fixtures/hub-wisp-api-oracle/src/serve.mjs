#!/usr/bin/env node
/** Minimal Express listener for WISP API oracle capture (Phase 28d). */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("../oracle/app-live.js");
const host = process.env.CHRYSALIS_HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 0);

const server = app.listen(port, host, () => {
  const addr = server.address();
  const actualPort = typeof addr === "object" && addr ? addr.port : port;
  process.stdout.write(`${JSON.stringify({ ok: true, host, port: actualPort })}\n`);
});
