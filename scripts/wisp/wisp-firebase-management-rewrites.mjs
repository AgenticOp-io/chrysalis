/**
 * Ensure WISPTools firebase.json management hosting keeps multipage CWL static
 * (no SPA `**` → index.html) while rewriting `/api/**` to Cloud Functions so the
 * converted site can call logical Module_Manager API paths same-origin.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const MANAGEMENT_API_REWRITES = [
  { source: "/api/deploy/**", function: "isoProxy" },
  { source: "/api/user-tenants/tenant/**", function: "apiProxy" },
  { source: "/api/user-tenants/**", function: "userTenants" },
  { source: "/api/**", function: "apiProxy" },
  { source: "/admin/**", function: "apiProxy" },
];

/**
 * @param {string} wispToolsRoot parent of Module_Manager (contains firebase.json)
 * @param {{ write?: boolean, preferDirectBackend?: boolean }} [opts]
 */
export function ensureWispManagementFirebaseApiRewrites(wispToolsRoot, opts = {}) {
  const root = resolve(wispToolsRoot);
  const firebaseJsonPath = join(root, "firebase.json");
  const preferDirect =
    opts.preferDirectBackend === true ||
    process.env.CHRYSALIS_WISP_PREFER_DIRECT_BACKEND === "1" ||
    process.env.CHRYSALIS_WISP_SKIP_API_REWRITES === "1";
  const base = {
    ok: false,
    firebaseJsonPath,
    changed: false,
  };
  if (!existsSync(firebaseJsonPath)) {
    return { ...base, skip: "missing-firebase-json" };
  }
  /** @type {any} */
  let doc;
  try {
    const raw = readFileSync(firebaseJsonPath, "utf8").replace(/^\uFEFF/, "");
    doc = JSON.parse(raw);
  } catch {
    return { ...base, skip: "invalid-firebase-json" };
  }
  const hosting = Array.isArray(doc.hosting) ? doc.hosting : doc.hosting ? [doc.hosting] : [];
  const mgmt = hosting.find((h) => h && h.target === "management");
  if (!mgmt) {
    return { ...base, skip: "missing-management-hosting-target" };
  }

  // CWL static on management talks to HSS directly while apiProxy is down.
  // Keep multipage (no SPA catch-all); leave rewrites empty — do not point /api at a 503 CF.
  if (preferDirect) {
    const before = JSON.stringify(mgmt.rewrites ?? []);
    mgmt.rewrites = [];
    mgmt.cleanUrls = true;
    mgmt.trailingSlash = false;
    const changed = before !== "[]";
    if (opts.write !== false && changed) {
      if (Array.isArray(doc.hosting)) doc.hosting = hosting;
      else doc.hosting = mgmt;
      writeFileSync(firebaseJsonPath, `${JSON.stringify(doc, null, 2)}\n`);
    }
    return {
      ...base,
      ok: true,
      changed,
      note: "prefer-direct-backend-empty-rewrites",
      rewrites: [],
    };
  }

  const before = JSON.stringify(mgmt.rewrites ?? []);
  // Keep multipage static: never add SPA catch-all. Replace empty/incomplete API rewrites.
  const hasApi = (mgmt.rewrites ?? []).some((r) => r && r.source === "/api/**" && r.function);
  const hasSpaCatchAll = (mgmt.rewrites ?? []).some(
    (r) => r && (r.source === "**" || r.source === "/**") && r.destination,
  );
  if (hasApi && !hasSpaCatchAll) {
    return { ...base, ok: true, changed: false, note: "management-api-rewrites-present" };
  }

  mgmt.rewrites = MANAGEMENT_API_REWRITES.map((r) => ({ ...r }));
  mgmt.cleanUrls = true;
  mgmt.trailingSlash = false;
  const after = JSON.stringify(mgmt.rewrites);
  const changed = before !== after;

  if (opts.write !== false && changed) {
    if (Array.isArray(doc.hosting)) {
      doc.hosting = hosting;
    } else {
      doc.hosting = mgmt;
    }
    writeFileSync(firebaseJsonPath, `${JSON.stringify(doc, null, 2)}\n`);
  }

  return {
    ...base,
    ok: true,
    changed,
    removedSpaCatchAll: hasSpaCatchAll,
    rewrites: mgmt.rewrites,
  };
}
