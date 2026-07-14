#!/usr/bin/env node
/** Minimal SPA static server for WISP adapter-static build/client output. */
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".json": "application/json",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

function parseArgs(argv) {
  let root = join(dirname(fileURLToPath(import.meta.url)), "../..", "generated/wisp-svelte-sidecar/build/client");
  let host = "127.0.0.1";
  let port = 3000;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root" && argv[i + 1]) root = resolve(argv[++i]);
    else if (a === "--host" && argv[i + 1]) host = argv[++i];
    else if (a === "--port" && argv[i + 1]) port = Number(argv[++i]);
  }
  return { root: resolve(root), host, port };
}

function sendFile(res, filePath) {
  const ext = extname(filePath).toLowerCase();
  res.setHeader("content-type", MIME[ext] ?? "application/octet-stream");
  res.setHeader("cache-control", ext.includes("immutable") ? "public, max-age=31536000, immutable" : "public, max-age=60");
  res.end(readFileSync(filePath));
}

function createSpaStaticServer(opts) {
  const root = opts.root;
  const indexHtml = join(root, "index.html");
  const server = createServer((req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);
      let rel = decodeURIComponent(url.pathname);
      if (rel.endsWith("/")) rel += "index.html";
      const candidate = join(root, rel.replace(/^\/+/, ""));
      if (existsSync(candidate) && statSync(candidate).isFile()) {
        res.statusCode = 200;
        sendFile(res, candidate);
        return;
      }
      if (!existsSync(indexHtml)) {
        res.statusCode = 503;
        res.setHeader("content-type", "text/plain; charset=utf-8");
        res.end("missing index.html");
        return;
      }
      res.statusCode = 200;
      sendFile(res, indexHtml);
    } catch (e) {
      res.statusCode = 500;
      res.setHeader("content-type", "text/plain; charset=utf-8");
      res.end(String(e));
    }
  });
  return { server, root, indexHtml };
}

async function main() {
  const args = parseArgs(process.argv);
  if (!existsSync(args.root)) {
    console.error(`missing client root: ${args.root}`);
    process.exit(1);
  }
  const { server } = createSpaStaticServer(args);
  await new Promise((r) => server.listen(args.port, args.host, r));
  console.log(JSON.stringify({ ok: true, host: args.host, port: args.port, root: args.root }));
}

if (process.argv[1]?.includes("wisp-svelte-static-server.mjs")) {
  main().catch((e) => { console.error(e); process.exit(1); });
}

export { createSpaStaticServer };
