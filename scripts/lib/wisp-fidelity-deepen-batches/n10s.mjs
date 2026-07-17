/** Deepen batch n10s — passes 183–192 (desk harness; bodies from backend-services). */
export const BATCH_ID = "n10s";
export const KIND = "chrysalis.wisp.fidelity-deepen-n10s";
export const NEED_ADMIN = false;
export const NOTE =
  "Deepen 183–192 — source-doc: portal-content GETs, voice emergency/port-orders + provider POST, snmp status/devices, pricing import (D6442)";

export const DEMO_TENANT = "6a166eb07089304417ec967a";

export const PASSES = [
  { id: 183, title: "Portal-content alerts GET" },
  { id: 184, title: "Portal-content FAQ GET" },
  { id: 185, title: "Portal-content knowledge-base GET" },
  { id: 186, title: "Portal-content chat-settings GET" },
  { id: 187, title: "Voice emergency-addresses GET" },
  { id: 188, title: "Voice port-orders GET" },
  { id: 189, title: "SNMP configuration GET" },
  { id: 190, title: "SNMP devices GET" },
  { id: 191, title: "Voice provider-accounts POST" },
  { id: 192, title: "Equipment-pricing import-from-inventory" },
];

export const REFRESH_PATHS = [
  "/api/portal-content",
  "/api/voice",
  "/api/snmp",
  "/api/equipment-pricing",
];

export const SOURCE_REFS = [
  "backend-services/routes/portal-content.js",
  "backend-services/routes/voice-sip.js",
  "backend-services/models/voice-sip.js",
  "backend-services/routes/snmp-routes/snmp-status.js",
  "backend-services/routes/snmp-routes/snmp-devices.js",
  "backend-services/routes/equipment-pricing.js",
];

export async function runProbes(ctx) {
  const { stamp, probeDemo, tenantId } = ctx;
  const tid = tenantId || DEMO_TENANT;
  /** @type {Array<Record<string, unknown>>} */
  const probes = [];

  // 183–186 portal content
  {
    probes.push({
      pass: 183,
      ...(await probeDemo("GET", `/api/portal-content/${tid}/alerts`)),
      source: "portal-content.js GET /:tenantId/alerts",
    });
    probes.push({
      pass: 184,
      ...(await probeDemo("GET", `/api/portal-content/${tid}/faq`)),
      source: "portal-content.js GET /:tenantId/faq",
    });
    probes.push({
      pass: 185,
      ...(await probeDemo("GET", `/api/portal-content/${tid}/knowledge-base`)),
      source: "portal-content.js GET /:tenantId/knowledge-base",
    });
    probes.push({
      pass: 186,
      ...(await probeDemo("GET", `/api/portal-content/${tid}/chat-settings`)),
      source: "portal-content.js GET /:tenantId/chat-settings",
    });
  }

  // 187–188 voice lists
  {
    probes.push({
      pass: 187,
      ...(await probeDemo("GET", "/api/voice/emergency-addresses")),
      source: "voice-sip.js GET /emergency-addresses",
    });
    probes.push({
      pass: 188,
      ...(await probeDemo("GET", "/api/voice/port-orders")),
      source: "voice-sip.js GET /port-orders",
    });
  }

  // 189–190 snmp (status is held residual: HSS missing snmp-metrics-schema require path)
  {
    probes.push({
      pass: 189,
      ...(await probeDemo("GET", "/api/snmp/configuration")),
      source: "snmp-status.js GET /configuration",
    });
    probes.push({
      pass: 190,
      ...(await probeDemo("GET", "/api/snmp/devices")),
      source: "snmp-devices.js GET /devices",
    });
  }

  // 191 voice provider create (models/voice-sip.js provider enum)
  {
    const created = await probeDemo("POST", "/api/voice/provider-accounts", {
      provider: "bandwidth",
      externalAccountId: `cwl-n10s-${stamp}`,
      displayName: `CWL n10s ${stamp}`,
    });
    probes.push({
      pass: 191,
      ...created,
      ok: created.ok || created.status === 409,
      note: created.status === 409 ? "idempotent conflict ok" : undefined,
      source: "voice-sip.js POST /provider-accounts",
    });
  }

  // 192 pricing import
  {
    probes.push({
      pass: 192,
      ...(await probeDemo("POST", "/api/equipment-pricing/import-from-inventory", {})),
      source: "equipment-pricing.js POST /import-from-inventory",
    });
  }

  return probes;
}
