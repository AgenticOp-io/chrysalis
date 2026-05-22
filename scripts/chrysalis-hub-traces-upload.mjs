/**
 * Upload oracle trace files into a site workspace (portal multipart / zip).
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { defaultTracesDir } from "./chrysalis-hub-verify.mjs";

const MAX_UPLOAD_BYTES = Number(process.env.CHRYSALIS_HUB_MAX_UPLOAD_BYTES ?? String(100 * 1024 * 1024));

export async function readRawBody(req, maxBytes = MAX_UPLOAD_BYTES) {
  const chunks = [];
  let total = 0;
  for await (const c of req) {
    total += c.length;
    if (total > maxBytes) throw new Error(`upload exceeds ${maxBytes} bytes`);
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}

/**
 * Minimal multipart/form-data parser (file fields only).
 * @returns {{ field: string, filename: string, data: Buffer }[]}
 */
export function parseMultipartFiles(buffer, contentType) {
  const m = contentType.match(/boundary=([^;]+)/i);
  if (!m) throw new Error("multipart boundary missing");
  const boundary = m[1].trim().replace(/^"|"$/g, "");
  const delim = Buffer.from(`--${boundary}`);
  const parts = [];
  let start = buffer.indexOf(delim) + delim.length;
  while (start < buffer.length) {
    if (buffer[start] === 45 && buffer[start + 1] === 45) break;
    if (buffer[start] === 13 && buffer[start + 1] === 10) start += 2;
    const headEnd = buffer.indexOf("\r\n\r\n", start);
    if (headEnd < 0) break;
    const header = buffer.slice(start, headEnd).toString("utf8");
    const bodyStart = headEnd + 4;
    const next = buffer.indexOf(delim, bodyStart);
    const bodyEnd = next < 0 ? buffer.length : next - 2;
    const cd = header.match(/name="([^"]+)"/);
    const fn = header.match(/filename="([^"]+)"/);
    if (cd && fn) {
      parts.push({
        field: cd[1],
        filename: fn[1],
        data: buffer.slice(bodyStart, bodyEnd),
      });
    }
    start = next < 0 ? buffer.length : next;
  }
  return parts;
}

function safeTraceName(name) {
  const base = basename(name).replace(/[^\w.\-]+/g, "_");
  if (!base.endsWith(".ndjson") && !base.endsWith(".json")) return `${base}.ndjson`;
  return base;
}

export async function saveTraceFiles(siteLocalDir, files) {
  const dir = defaultTracesDir(siteLocalDir);
  await mkdir(dir, { recursive: true });
  let saved = 0;
  for (const f of files) {
    if (!f.data?.length) continue;
    const name = safeTraceName(f.filename);
    await writeFile(join(dir, name), f.data);
    saved += 1;
  }
  return { tracesDir: dir, saved };
}

export async function saveZipTraces(siteLocalDir, zipBuffer) {
  const dir = defaultTracesDir(siteLocalDir);
  await mkdir(dir, { recursive: true });
  const zipPath = join(dir, "_upload.zip");
  await writeFile(zipPath, zipBuffer);
  await new Promise((resolve, reject) => {
    const child = spawn("unzip", ["-o", zipPath, "-d", dir], { shell: false });
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`unzip failed (${code})`))));
    child.on("error", () => reject(new Error("unzip not on PATH — upload .ndjson files instead of zip")));
  });
  return { tracesDir: dir, saved: "zip" };
}
