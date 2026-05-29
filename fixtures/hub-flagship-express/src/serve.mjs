#!/usr/bin/env node
/**
 * Minimal Express listener for live oracle capture (fixtures/hub-flagship-express).
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("../oracle/app-live.js");
const host = process.env.CHRYSALIS_HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 0);

const server = app.listen(port, host, () => {
  const addr = server.address();
  const actualPort = typeof addr === "object" && addr ? addr.port : port;
  // Line-buffered stdout for hub live capture (spawn pipes do not flush console.log promptly).
  process.stdout.write(`${JSON.stringify({ ok: true, host, port: actualPort })}\n`);
});
