/**
 * Translation Hub organization registry (multi-tenant teams).
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export const HUB_ORGS_KIND = "chrysalis.translation-hub.orgs";
export const HUB_ORGS_SCHEMA = 0;

const hubRoot = process.env.CHRYSALIS_HUB_ROOT ?? join(homedir(), ".chrysalis-hub");
const orgsPath = join(hubRoot, "orgs.json");

function slugOrg(name) {
  const base = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  return `${base || "org"}-${Date.now().toString(36)}`;
}

async function loadOrgs() {
  await mkdir(hubRoot, { recursive: true });
  try {
    const raw = await readFile(orgsPath, "utf8");
    const j = JSON.parse(raw);
    if (j.kind !== HUB_ORGS_KIND) return { kind: HUB_ORGS_KIND, schemaVersion: HUB_ORGS_SCHEMA, orgs: [] };
    return j;
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "ENOENT") {
      return { kind: HUB_ORGS_KIND, schemaVersion: HUB_ORGS_SCHEMA, orgs: [] };
    }
    throw e;
  }
}

async function saveOrgs(reg) {
  const tmp = `${orgsPath}.tmp`;
  await writeFile(tmp, `${JSON.stringify(reg, null, 2)}\n`, "utf8");
  await rename(tmp, orgsPath);
}

export async function listOrgs() {
  const reg = await loadOrgs();
  return reg.orgs;
}

export async function getOrg(orgId) {
  return (await listOrgs()).find((o) => o.id === orgId) ?? null;
}

export async function createOrg({ name, actorId }) {
  const reg = await loadOrgs();
  const org = {
    id: slugOrg(name),
    name,
    createdAt: new Date().toISOString(),
    members: [{ actorId, role: "owner", joinedAt: new Date().toISOString() }],
  };
  reg.orgs.push(org);
  await saveOrgs(reg);
  return org;
}

export async function joinOrg(orgId, actorId, role = "member") {
  const reg = await loadOrgs();
  const org = reg.orgs.find((o) => o.id === orgId);
  if (!org) throw new Error("org not found");
  if (!org.members.some((m) => m.actorId === actorId)) {
    org.members.push({ actorId, role, joinedAt: new Date().toISOString() });
  }
  await saveOrgs(reg);
  return org;
}

export function orgIdsForActor(actor, orgs) {
  if (!actor?.id) return [];
  if (actor.role === "admin" || actor.role === "open") return orgs.map((o) => o.id);
  return orgs.filter((o) => o.members.some((m) => m.actorId === actor.id)).map((o) => o.id);
}

export async function orgIdsForActorFromStore(actor) {
  return orgIdsForActor(actor, await listOrgs());
}

export function canAccessProjectWithOrgs(project, actor, memberOrgIds) {
  if (!actor || actor.role === "open" || actor.role === "admin") return true;
  if (project.orgId && memberOrgIds.includes(project.orgId)) return true;
  if (project.owner && project.owner === actor.id) return true;
  return false;
}

/** Invite token for join-by-link (hash stored, not raw secret). */
export function makeOrgInviteToken(orgId, secret) {
  return createHash("sha256").update(`${orgId}:${secret}`).digest("hex").slice(0, 32);
}
