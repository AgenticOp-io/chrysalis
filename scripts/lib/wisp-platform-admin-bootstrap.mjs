#!/usr/bin/env node
/**
 * Ensure platform-admin Firebase user exists (admin@wisptools.io) with a known demo password.
 * Uses wisptools-production Firebase Admin SDK JSON (modular firebase-admin v14 API).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const reportPath = join(scriptRoot, "reports/wisp/platform-admin-bootstrap.json");

const DEFAULT_EMAIL = "admin@wisptools.io";
const DEFAULT_PASSWORD = process.env.CHRYSALIS_WISP_PLATFORM_ADMIN_PASSWORD || "WisptoolsAdmin2026!";

function loadAuth() {
  const candidates = [
    process.env.CHRYSALIS_WISP_FIREBASE_ADMIN_JSON,
    "C:/Users/david/AgenticOps/products/wisptools/wisptools-production-firebase-adminsdk.json",
    join(scriptRoot, "../../products/wisptools/wisptools-production-firebase-adminsdk.json"),
  ].filter(Boolean);
  const saPath = candidates.find((p) => existsSync(String(p)));
  if (!saPath) throw new Error("firebase-admin-json-missing");
  const { initializeApp, cert, getApps } = require("firebase-admin/app");
  const { getAuth } = require("firebase-admin/auth");
  if (!getApps().length) {
    initializeApp({ credential: cert(JSON.parse(readFileSync(saPath, "utf8"))) });
  }
  return { auth: getAuth(), saPath };
}

export async function bootstrapPlatformAdmin(opts = {}) {
  const email = (opts.email || process.env.CHRYSALIS_WISP_PLATFORM_ADMIN_EMAIL || DEFAULT_EMAIL).trim();
  const password = (opts.password || DEFAULT_PASSWORD).trim();
  const { auth, saPath } = loadAuth();
  let uid = null;
  let action = "updated";
  try {
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
    await auth.updateUser(uid, { password, emailVerified: true, disabled: false });
  } catch (e) {
    if (e?.code === "auth/user-not-found") {
      const created = await auth.createUser({ email, password, emailVerified: true });
      uid = created.uid;
      action = "created";
    } else {
      throw e;
    }
  }
  mkdirSync(dirname(reportPath), { recursive: true });
  const report = {
    kind: "chrysalis.wisp.platform-admin-bootstrap",
    schemaVersion: 1,
    ok: true,
    generatedAt: new Date().toISOString(),
    email,
    uid,
    action,
    saPath,
    note: "Password set; export CHRYSALIS_WISP_PLATFORM_ADMIN_EMAIL/PASSWORD for probes. Do not commit password.",
  };
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return { ...report, password };
}

async function main() {
  const r = await bootstrapPlatformAdmin();
  console.log(JSON.stringify({ ok: r.ok, email: r.email, uid: r.uid, action: r.action, passwordSet: true, reportPath }, null, 2));
}

if (process.argv[1]?.includes("wisp-platform-admin-bootstrap")) main();
