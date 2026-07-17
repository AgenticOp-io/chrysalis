/** Deepen batch n10q — passes 163–172 (desk harness; bodies from backend-services). */
export const BATCH_ID = "n10q";
export const KIND = "chrysalis.wisp.fidelity-deepen-n10q";
export const NEED_ADMIN = false;
export const NOTE =
  "Deepen 163–172 — source-doc: WO by site, customer phone/imsi/history/complaints, inv transfer+by-site, notif count, site sectors, voice schema (D6442)";

export const PASSES = [
  { id: 163, title: "Work-orders by site GET" },
  { id: 164, title: "Customers search/phone GET" },
  { id: 165, title: "Customers search/imsi GET" },
  { id: 166, title: "Customers service-history POST" },
  { id: 167, title: "Customers complaints POST" },
  { id: 168, title: "Inventory transfer (newLocation)" },
  { id: 169, title: "Inventory by-site GET" },
  { id: 170, title: "Notifications count GET" },
  { id: 171, title: "Network site sectors GET" },
  { id: 172, title: "Voice schema GET" },
];

export const REFRESH_PATHS = [
  "/api/work-orders",
  "/api/customers",
  "/api/inventory",
  "/api/notifications",
  "/api/network/sites",
  "/api/voice",
];

export const SOURCE_REFS = [
  "backend-services/routes/work-orders.js",
  "backend-services/routes/customers.js",
  "backend-services/models/customer.js",
  "backend-services/routes/inventory.js",
  "backend-services/models/inventory.js",
  "backend-services/routes/notifications.js",
  "backend-services/routes/network.js",
  "backend-services/routes/voice-sip.js",
];

export async function runProbes(ctx) {
  const { stamp, probeDemo, firstIdDemo } = ctx;
  /** @type {Array<Record<string, unknown>>} */
  const probes = [];

  // 163 WO by site
  {
    const site = await firstIdDemo("/api/network/sites", ["sites", "items"]);
    if (!site.id) probes.push({ pass: 163, action: "skip-no-site" });
    else {
      probes.push({
        pass: 163,
        ...(await probeDemo("GET", `/api/work-orders/site/${site.id}`)),
        source: "work-orders.js GET /site/:siteId",
      });
    }
  }

  // 164 search phone
  {
    const cust = await firstIdDemo("/api/customers", ["customers", "items"]);
    const phone =
      cust.row?.primaryPhone || cust.row?.phone || cust.row?.alternatePhone || "555";
    probes.push({
      pass: 164,
      ...(await probeDemo("GET", `/api/customers/search/phone/${encodeURIComponent(String(phone))}`)),
      source: "customers.js GET /search/phone/:phone",
    });
  }

  // 165 search imsi
  {
    const imsi = custImsiFallback(stamp);
    probes.push({
      pass: 165,
      ...(await probeDemo("GET", `/api/customers/search/imsi/${encodeURIComponent(imsi)}`)),
      source: "customers.js GET /search/imsi/:imsi",
    });
  }

  // 166 service-history (models/customer.js enum)
  {
    const cust = await firstIdDemo("/api/customers", ["customers", "items"]);
    if (!cust.id) probes.push({ pass: 166, action: "skip-no-customer" });
    else {
      probes.push({
        pass: 166,
        ...(await probeDemo("POST", `/api/customers/${cust.id}/service-history`, {
          type: "support-call",
          description: `chrysalis-n10q-${stamp}`,
          notes: "fidelity-deepen",
          technician: "cwl-demo",
        })),
        source: "customers.js POST /:id/service-history + models/customer.js",
      });
    }
  }

  // 167 complaints (models/customer.js enum)
  {
    const cust = await firstIdDemo("/api/customers", ["customers", "items"]);
    if (!cust.id) probes.push({ pass: 167, action: "skip-no-customer" });
    else {
      probes.push({
        pass: 167,
        ...(await probeDemo("POST", `/api/customers/${cust.id}/complaints`, {
          category: "other",
          description: `chrysalis-n10q-${stamp}`,
          priority: "low",
        })),
        source: "customers.js POST /:id/complaints + models/customer.js",
      });
    }
  }

  // 168 inventory transfer — newLocation required (inventory.js + LocationSchema)
  {
    const inv = await firstIdDemo("/api/inventory", ["items", "inventory"]);
    if (!inv.id) probes.push({ pass: 168, action: "skip-no-inventory" });
    else {
      probes.push({
        pass: 168,
        ...(await probeDemo("POST", `/api/inventory/${inv.id}/transfer`, {
          newLocation: {
            type: "warehouse",
            warehouse: {
              name: "CWL Demo Warehouse",
              section: `n10q-${stamp}`,
              aisle: "A",
              shelf: "1",
              bin: "1",
            },
          },
          reason: "transfer",
          movedBy: "cwl-demo",
          notes: `chrysalis-n10q-${stamp}`,
        })),
        source: "inventory.js POST /:id/transfer; models/inventory.js LocationSchema",
      });
    }
  }

  // 169 inventory by-site
  {
    const site = await firstIdDemo("/api/network/sites", ["sites", "items"]);
    if (!site.id) probes.push({ pass: 169, action: "skip-no-site" });
    else {
      probes.push({
        pass: 169,
        ...(await probeDemo("GET", `/api/inventory/by-site/${site.id}`)),
        source: "inventory.js GET /by-site/:siteId",
      });
    }
  }

  // 170 notifications count
  {
    probes.push({
      pass: 170,
      ...(await probeDemo("GET", "/api/notifications/count")),
      source: "notifications.js GET /count",
    });
  }

  // 171 site sectors
  {
    const site = await firstIdDemo("/api/network/sites", ["sites", "items"]);
    if (!site.id) probes.push({ pass: 171, action: "skip-no-site" });
    else {
      probes.push({
        pass: 171,
        ...(await probeDemo("GET", `/api/network/sites/${site.id}/sectors`)),
        source: "network.js GET /sites/:siteId/sectors",
      });
    }
  }

  // 172 voice schema
  {
    probes.push({
      pass: 172,
      ...(await probeDemo("GET", "/api/voice/schema")),
      source: "voice-sip.js GET /schema",
    });
  }

  return probes;
}

function custImsiFallback(stamp) {
  return `00101${String(stamp).slice(-10)}`;
}
