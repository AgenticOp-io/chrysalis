/**
 * Upload files into a site workspace (portal multipart / zip): oracle traces, and
 * (see saveSourceFiles/saveZipSource below) origin source code — the browser-upload
 * alternative to SSH pull, for visitors/projects with no SSH-reachable origin server.
 */
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile, rename, readdir, unlink } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, basename, normalize, sep } from "node:path";
import { defaultTracesDir } from "./chrysalis-hub-verify.mjs";
import { isHubDemoMode } from "./chrysalis-hub-demo-guard.mjs";

const hubRoot = process.env.CHRYSALIS_HUB_ROOT ?? join(homedir(), ".chrysalis-hub");
const uploadsRoot = join(hubRoot, "uploads");

export const CHUNK_SIZE = 2 * 1024 * 1024;

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
  // `start` always points just past a delimiter's dashes (never at them) so the close-check
  // below examines the two bytes *following* `--boundary` — that's what distinguishes a
  // closing `--boundary--` from an ordinary `--boundary\r\n` between parts (both start with
  // the same two dashes as `delim` itself, so checking bytes *at* `start` misidentified every
  // non-final boundary as the close and silently dropped every file after the first).
  let start = buffer.indexOf(delim);
  if (start < 0) return parts;
  start += delim.length;
  while (start < buffer.length) {
    if (buffer[start] === 45 && buffer[start + 1] === 45) break;
    if (buffer[start] === 13 && buffer[start + 1] === 10) start += 2;
    const headEnd = buffer.indexOf("\r\n\r\n", start);
    if (headEnd < 0) break;
    const header = buffer.slice(start, headEnd).toString("utf8");
    const bodyStart = headEnd + 4;
    const next = buffer.indexOf(delim, bodyStart);
    if (next < 0) break;
    const bodyEnd = next - 2;
    const cd = header.match(/name="([^"]+)"/);
    const fn = header.match(/filename="([^"]+)"/);
    if (cd && fn) {
      parts.push({
        field: cd[1],
        filename: fn[1],
        data: buffer.slice(bodyStart, bodyEnd),
      });
    }
    start = next + delim.length;
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

export async function startResumableUpload({ projectId, siteId, filename, totalBytes }) {
  await mkdir(uploadsRoot, { recursive: true });
  const uploadId = `up-${Date.now().toString(36)}`;
  const dir = join(uploadsRoot, uploadId);
  await mkdir(dir, { recursive: true });
  const meta = {
    uploadId,
    projectId,
    siteId,
    filename: safeTraceName(filename),
    totalBytes: Number(totalBytes) || null,
    receivedBytes: 0,
    chunkSize: CHUNK_SIZE,
    startedAt: new Date().toISOString(),
  };
  await writeFile(join(dir, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`, "utf8");
  return meta;
}

export async function appendUploadChunk(uploadId, chunkIndex, data) {
  const dir = join(uploadsRoot, uploadId);
  const meta = JSON.parse(await readFile(join(dir, "meta.json"), "utf8"));
  const chunkPath = join(dir, `chunk-${String(chunkIndex).padStart(6, "0")}`);
  await writeFile(chunkPath, data);
  meta.receivedBytes = (meta.receivedBytes ?? 0) + data.length;
  meta.lastChunkIndex = chunkIndex;
  await writeFile(join(dir, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`, "utf8");
  return meta;
}

export async function finishResumableUpload(uploadId, siteLocalDir) {
  const dir = join(uploadsRoot, uploadId);
  const meta = JSON.parse(await readFile(join(dir, "meta.json"), "utf8"));
  const tracesDir = defaultTracesDir(siteLocalDir);
  await mkdir(tracesDir, { recursive: true });
  const outPath = join(tracesDir, meta.filename);
  const tmp = `${outPath}.partial`;
  const names = (await readdir(dir)).filter((n) => n.startsWith("chunk-")).sort();
  const { open, write, close } = await import("node:fs/promises");
  const fh = await open(tmp, "w");
  for (const name of names) {
    const buf = await readFile(join(dir, name));
    await fh.write(buf);
  }
  await fh.close();
  await rename(tmp, outPath);
  for (const name of names) {
    await unlink(join(dir, name)).catch(() => {});
  }
  await unlink(join(dir, "meta.json")).catch(() => {});
  return { tracesDir, saved: 1, filename: meta.filename, uploadId };
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

// --- Source-code upload (no-SSH alternative for populating a site's origin tree) ---

const SKIP_NAME_SEGMENTS = new Set([".git", "node_modules", ".DS_Store", "__MACOSX"]);

/** Demo mode gets much smaller upload caps (disk-quota abuse, not just LLM cost) than a private hub. */
function maxSourceUploadBytes() {
  const fallback = isHubDemoMode() ? 5 * 1024 * 1024 : 25 * 1024 * 1024;
  const n = Number(process.env.CHRYSALIS_HUB_MAX_SOURCE_UPLOAD_BYTES ?? String(fallback));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function maxSourceUploadFiles() {
  const fallback = isHubDemoMode() ? 40 : 500;
  const n = Number(process.env.CHRYSALIS_HUB_MAX_SOURCE_UPLOAD_FILES ?? String(fallback));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Validate + normalize a relative path from an untrusted multipart filename or zip entry.
 * Rejects absolute paths, drive letters, and any `..` traversal segment. Returns a posix-style
 * relative path (safe to join under a site's localDir), or null if the entry should be dropped.
 */
export function safeRelativePath(name) {
  const posixName = String(name ?? "").replace(/\\/g, "/");
  if (!posixName || posixName.startsWith("/") || /^[a-zA-Z]:/.test(posixName)) return null;
  const normalized = normalize(posixName).split(sep).join("/");
  const segments = normalized.split("/").filter(Boolean);
  if (segments.some((s) => s === ".." || SKIP_NAME_SEGMENTS.has(s))) return null;
  const rel = segments.join("/");
  return rel || null;
}

/** Write uploaded source files (multipart, field "files") into a site's origin tree (localDir). */
export async function saveSourceFiles(siteLocalDir, files) {
  const maxFiles = maxSourceUploadFiles();
  if (files.length > maxFiles) {
    throw new Error(`too many files in one upload (max ${maxFiles})`);
  }
  const maxBytes = maxSourceUploadBytes();
  const totalBytes = files.reduce((sum, f) => sum + (f.data?.length ?? 0), 0);
  if (totalBytes > maxBytes) {
    throw new Error(`upload exceeds ${maxBytes} bytes`);
  }
  let saved = 0;
  let skipped = 0;
  let hasRoutesManifest = false;
  for (const f of files) {
    const rel = safeRelativePath(f.filename);
    if (!rel || !f.data?.length) {
      skipped += 1;
      continue;
    }
    const dest = join(siteLocalDir, ...rel.split("/"));
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, f.data);
    if (rel === "chrysalis.routes.json") hasRoutesManifest = true;
    saved += 1;
  }
  return { saved, skipped, hasRoutesManifest };
}

/** Extract an uploaded zip of a site's origin tree into localDir, after validating every entry name. */
export async function saveZipSource(siteLocalDir, zipBuffer) {
  const maxBytes = maxSourceUploadBytes();
  if (zipBuffer.length > maxBytes) {
    throw new Error(`upload exceeds ${maxBytes} bytes`);
  }
  await mkdir(siteLocalDir, { recursive: true });
  const zipPath = join(siteLocalDir, "_source-upload.zip");
  await writeFile(zipPath, zipBuffer);
  try {
    const listing = await new Promise((resolve, reject) => {
      const child = spawn("unzip", ["-Z1", zipPath], { shell: false });
      let out = "";
      child.stdout.on("data", (c) => (out += c.toString()));
      child.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(`unzip listing failed (${code})`))));
      child.on("error", () => reject(new Error("unzip not on PATH — upload individual files instead of a zip")));
    });
    const entries = listing.split("\n").map((l) => l.trim()).filter(Boolean);
    const maxFiles = maxSourceUploadFiles();
    if (entries.length > maxFiles) {
      throw new Error(`zip has too many entries (max ${maxFiles})`);
    }
    const unsafe = entries.filter((e) => !e.endsWith("/") && !safeRelativePath(e));
    if (unsafe.length > 0) {
      throw new Error(`zip contains unsafe path(s): ${unsafe.slice(0, 3).join(", ")}`);
    }
    await new Promise((resolve, reject) => {
      const child = spawn("unzip", ["-o", zipPath, "-d", siteLocalDir], { shell: false });
      child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`unzip failed (${code})`))));
      child.on("error", () => reject(new Error("unzip not on PATH — upload individual files instead of a zip")));
    });
    const hasRoutesManifest = entries.some((e) => safeRelativePath(e) === "chrysalis.routes.json");
    return { saved: entries.filter((e) => !e.endsWith("/")).length, hasRoutesManifest };
  } finally {
    await unlink(zipPath).catch(() => {});
  }
}
