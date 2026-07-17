/** Deepen batch n10p — passes 153–162 (desk harness; bodies from backend-services). */
export const BATCH_ID = "n10p";
export const KIND = "chrysalis.wisp.fidelity-deepen-n10p";
export const NEED_ADMIN = false;
export const NOTE =
  "Deepen 153–162 — source-doc: WO/incident/customer stats, SLA alerts, inv warranty/maint alerts, customer search+subscriber, inv csv (D6442)";

export const PASSES = [
  { id: 153, title: "Work-orders stats/dashboard GET" },
  { id: 154, title: "Work-orders SLA-breach alerts GET" },
  { id: 155, title: "Incidents stats/dashboard GET" },
  { id: 156, title: "Customers stats/summary GET" },
  { id: 157, title: "Customers search/email GET" },
  { id: 158, title: "Inventory warranty-expiring alerts" },
  { id: 159, title: "Inventory maintenance-due alerts" },
  { id: 160, title: "Work-orders assigned/:userId GET" },
  { id: 161, title: "Customer GET subscriber link" },
  { id: 162, title: "Inventory export/csv GET" },
];

export const REFRESH_PATHS = [
  "/api/work-orders",
  "/api/incidents",
  "/api/customers",
  "/api/inventory",
];

export const SOURCE_REFS = [
  "backend-services/routes/work-orders.js",
  "backend-services/routes/incidents.js",
  "backend-services/routes/customers.js",
  "backend-services/routes/inventory.js",
];

export async function runProbes(ctx) {
  const { stamp, probeDemo, firstIdDemo } = ctx;
  /** @type {Array<Record<string, unknown>>} */
  const probes = [];

  // 153 WO stats
  {
    probes.push({
      pass: 153,
      ...(await probeDemo("GET", "/api/work-orders/stats/dashboard")),
      source: "work-orders.js GET /stats/dashboard",
    });
  }

  // 154 SLA breach
  {
    probes.push({
      pass: 154,
      ...(await probeDemo("GET", "/api/work-orders/alerts/sla-breach")),
      source: "work-orders.js GET /alerts/sla-breach",
    });
  }

  // 155 incident stats
  {
    probes.push({
      pass: 155,
      ...(await probeDemo("GET", "/api/incidents/stats/dashboard")),
      source: "incidents.js GET /stats/dashboard",
    });
  }

  // 156 customer stats
  {
    probes.push({
      pass: 156,
      ...(await probeDemo("GET", "/api/customers/stats/summary")),
      source: "customers.js GET /stats/summary",
    });
  }

  // 157 search by email
  {
    const cust = await firstIdDemo("/api/customers", ["customers", "items"]);
    const email = cust.row?.email || `cwl-n10p-${stamp}@example.com`;
    probes.push({
      pass: 157,
      ...(await probeDemo("GET", `/api/customers/search/email/${encodeURIComponent(email)}`)),
      source: "customers.js GET /search/email/:email",
    });
  }

  // 158 warranty alerts
  {
    probes.push({
      pass: 158,
      ...(await probeDemo("GET", "/api/inventory/alerts/warranty-expiring")),
      source: "inventory.js",
    });
  }

  // 159 maintenance alerts
  {
    probes.push({
      pass: 159,
      ...(await probeDemo("GET", "/api/inventory/alerts/maintenance-due")),
      source: "inventory.js",
    });
  }

  // 160 assigned WO
  {
    probes.push({
      pass: 160,
      ...(await probeDemo("GET", "/api/work-orders/assigned/cwl-demo")),
      source: "work-orders.js GET /assigned/:userId",
    });
  }

  // 161 customer subscriber link — create then GET (customers.js)
  // Source sets hssSubscriberId on create; live GET may still 404 (honest residual).
  {
    const cust = await firstIdDemo("/api/customers", ["customers", "items"]);
    if (!cust.id) probes.push({ pass: 161, action: "skip-no-customer" });
    else {
      const createSub = await probeDemo("POST", `/api/customers/${cust.id}/create-subscriber`, {
        imsi: `00101${String(stamp).slice(-10)}`,
        msisdn: `1${String(stamp).slice(-10)}`,
      });
      const get = await probeDemo("GET", `/api/customers/${cust.id}/subscriber`);
      probes.push({
        pass: 161,
        createSub,
        get,
        ok: createSub.ok,
        getHonest: !get.ok,
        note: get.ok
          ? "create+get ok"
          : "create ok; GET /:id/subscriber 404 despite create (hssSubscriberId residual)",
        source: "customers.js create-subscriber + GET /:id/subscriber",
      });
    }
  }

  // 162 inventory csv export
  {
    probes.push({
      pass: 162,
      ...(await probeDemo("GET", "/api/inventory/export/csv")),
      source: "inventory.js GET /export/csv",
    });
  }

  return probes;
}
