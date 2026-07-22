/** Deepen batch n10u — passes 203–212 (desk harness; bodies from backend-services). */
export const BATCH_ID = "n10u";
export const KIND = "chrysalis.wisp.fidelity-deepen-n10u";
export const NEED_ADMIN = false;
export const NOTE =
  "Deepen 203–212 — source-doc: permissions/me, users visible, install-docs, monitoring mikrotik/snmp, snmp metrics, voice service-location POST, portal published GETs (D6442)";

export const DEMO_TENANT = "6a166eb07089304417ec967a";

export const PASSES = [
  { id: 203, title: "Permissions me GET" },
  { id: 204, title: "Users tenant visible GET" },
  { id: 205, title: "Installation-documentation list GET" },
  { id: 206, title: "Monitoring mikrotik devices GET" },
  { id: 207, title: "Monitoring snmp devices GET" },
  { id: 208, title: "Monitoring snmp discovered GET" },
  { id: 209, title: "SNMP metrics latest GET" },
  { id: 210, title: "Voice service-locations POST" },
  { id: 211, title: "Portal-content alerts/active GET" },
  { id: 212, title: "Portal-content FAQ published GET" },
];

export const REFRESH_PATHS = [
  "/api/permissions",
  "/api/users",
  "/api/installation-documentation",
  "/api/monitoring",
  "/api/snmp",
  "/api/voice",
  "/api/portal-content",
];

export const SOURCE_REFS = [
  "backend-services/routes/permissions.js",
  "backend-services/routes/users/index.js",
  "backend-services/routes/installation-documentation.js",
  "backend-services/routes/monitoring.js",
  "backend-services/routes/snmp-routes/snmp-metrics.js",
  "backend-services/routes/voice-sip.js",
  "backend-services/routes/portal-content.js",
];

export async function runProbes(ctx) {
  const { stamp, probeDemo, tenantId } = ctx;
  const tid = tenantId || DEMO_TENANT;
  /** @type {Array<Record<string, unknown>>} */
  const probes = [];

  probes.push({
    pass: 203,
    ...(await probeDemo("GET", "/api/permissions/me")),
    source: "permissions.js GET /me",
  });

  probes.push({
    pass: 204,
    ...(await probeDemo("GET", `/api/users/tenant/${tid}/visible`)),
    source: "users/index.js GET /tenant/:tenantId/visible",
  });

  probes.push({
    pass: 205,
    ...(await probeDemo("GET", "/api/installation-documentation")),
    source: "installation-documentation.js GET /",
  });

  probes.push({
    pass: 206,
    ...(await probeDemo("GET", "/api/monitoring/mikrotik/devices")),
    source: "monitoring.js GET /mikrotik/devices",
  });

  probes.push({
    pass: 207,
    ...(await probeDemo("GET", "/api/monitoring/snmp/devices")),
    source: "monitoring.js GET /snmp/devices",
  });

  probes.push({
    pass: 208,
    ...(await probeDemo("GET", "/api/monitoring/snmp/discovered")),
    source: "monitoring.js GET /snmp/discovered",
  });

  probes.push({
    pass: 209,
    ...(await probeDemo("GET", "/api/snmp/metrics/latest")),
    source: "snmp-metrics.js GET /metrics/latest",
  });

  // 210 voice service location create
  {
    probes.push({
      pass: 210,
      ...(await probeDemo("POST", "/api/voice/service-locations", {
        street: `${stamp} CWL St`,
        city: "Denver",
        state: "CO",
        postal: "80202",
        country: "US",
        geocodeSource: "manual",
      })),
      source: "voice-sip.js POST /service-locations",
    });
  }

  probes.push({
    pass: 211,
    ...(await probeDemo("GET", `/api/portal-content/${tid}/alerts/active`)),
    source: "portal-content.js GET /:tenantId/alerts/active",
  });

  probes.push({
    pass: 212,
    ...(await probeDemo("GET", `/api/portal-content/${tid}/faq/published`)),
    source: "portal-content.js GET /:tenantId/faq/published",
  });

  return probes;
}
