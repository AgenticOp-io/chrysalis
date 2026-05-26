#!/usr/bin/env node
import { resolve } from "node:path";
import { Recorder } from "./src/recorder.mjs";

const out = resolve(process.argv[2] ?? "trace.ndjson");
const rec = new Recorder();
rec.onRequestStart("GET", "/health", { headers: { host: "127.0.0.1" } });
rec.onResponse(200, "true", { headers: { "content-type": "application/json" } });
await rec.writeNdjson(out);
console.log(out);
