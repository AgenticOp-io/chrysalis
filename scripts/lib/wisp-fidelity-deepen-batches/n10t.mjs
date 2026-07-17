/** Deepen batch n10t — passes 193–202 (desk harness; bodies from backend-services). */
export const BATCH_ID = "n10t";
export const KIND = "chrysalis.wisp.fidelity-deepen-n10t";
export const NEED_ADMIN = false;
export const NOTE =
  "Deepen 193–202 — source-doc: mikrotik status/devices/discovery, snmp discovery/discovered, monitoring epc/dashboard/topology, plans mobile, portal tenant (D6442)";

export const DEMO_TENANT = "6a166eb07089304417ec967a";

export const PASSES = [
  { id: 193, title: "Mikrotik status GET" },
  { id: 194, title: "Mikrotik devices GET" },
  { id: 195, title: "Mikrotik discovery GET" },
  { id: 196, title: "SNMP discovery GET" },
  { id: 197, title: "SNMP discovered GET" },
  { id: 198, title: "Monitoring EPC list GET" },
  { id: 199, title: "Monitoring dashboard GET" },
  { id: 200, title: "Monitoring topology GET" },
  { id: 201, title: "Plans mobile by user GET" },
  { id: 202, title: "Portal tenant config GET" },
];

export const REFRESH_PATHS = [
  "/api/mikrotik",
  "/api/snmp",
  "/api/monitoring",
  "/api/plans",
  "/api/portal",
];

export const SOURCE_REFS = [
  "backend-services/routes/mikrotik.js",
  "backend-services/routes/snmp-routes/snmp-discovery.js",
  "backend-services/routes/monitoring.js",
  "backend-services/routes/plans/plans-mobile.js",
  "backend-services/routes/portal-domain.js",
];

export async function runProbes(ctx) {
  const { probeDemo, tenantId } = ctx;
  const tid = tenantId || DEMO_TENANT;
  /** @type {Array<Record<string, unknown>>} */
  const probes = [];

  // 193–195 mikrotik
  {
    probes.push({
      pass: 193,
      ...(await probeDemo("GET", "/api/mikrotik/status")),
      source: "mikrotik.js GET /status",
    });
    probes.push({
      pass: 194,
      ...(await probeDemo("GET", "/api/mikrotik/devices")),
      source: "mikrotik.js GET /devices",
    });
    probes.push({
      pass: 195,
      ...(await probeDemo("GET", "/api/mikrotik/discovery")),
      source: "mikrotik.js GET /discovery",
    });
  }

  // 196–197 snmp discovery (status held residual — bad require path)
  {
    probes.push({
      pass: 196,
      ...(await probeDemo("GET", "/api/snmp/discovery")),
      source: "snmp-discovery.js GET /discovery",
    });
    probes.push({
      pass: 197,
      ...(await probeDemo("GET", "/api/snmp/discovered")),
      source: "snmp-discovery.js GET /discovered",
    });
  }

  // 198–200 monitoring — dashboard/topology are mounted as /monitoring/monitoring/*
  // because monitoring.js defines router.get('/monitoring/dashboard') under app.use('/api/monitoring')
  {
    probes.push({
      pass: 198,
      ...(await probeDemo("GET", "/api/monitoring/epc/list")),
      source: "monitoring.js GET /epc/list",
    });
    probes.push({
      pass: 199,
      ...(await probeDemo("GET", "/api/monitoring/monitoring/dashboard")),
      source: "monitoring.js GET /monitoring/dashboard (mounted under /api/monitoring)",
    });
    probes.push({
      pass: 200,
      ...(await probeDemo("GET", "/api/monitoring/monitoring/topology")),
      source: "monitoring.js GET /monitoring/topology (mounted under /api/monitoring)",
    });
  }

  // 201 plans mobile
  {
    probes.push({
      pass: 201,
      ...(await probeDemo("GET", "/api/plans/mobile/cwl-demo")),
      source: "plans-mobile.js GET /mobile/:userId",
    });
  }

  // 202 portal tenant config
  {
    probes.push({
      pass: 202,
      ...(await probeDemo("GET", `/api/portal/tenant/${tid}`)),
      source: "portal-domain.js GET /tenant/:tenantId",
    });
  }

  return probes;
}
