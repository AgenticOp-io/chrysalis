/** Deepen batch n10k — passes 103–112 (desk harness). */
export const BATCH_ID = "n10k";
export const KIND = "chrysalis.wisp.fidelity-deepen-n10k";
export const NEED_ADMIN = false;
export const NOTE =
  "Deepen 103–112 — plan features GET, bundle use, complaints, HSS lists, pricing import, WO close, sites bulk (D6442)";

export const PASSES = [
  { id: 103, title: "Plans features GET" },
  { id: 104, title: "Bundle use POST" },
  { id: 105, title: "Customer complaints POST" },
  { id: 106, title: "Customer complaint PUT resolve" },
  { id: 107, title: "HSS subscribers POST + GET list" },
  { id: 108, title: "HSS groups GET hydrate" },
  { id: 109, title: "Pricing import-from-inventory" },
  { id: 110, title: "Work-order close" },
  { id: 111, title: "Notifications count GET" },
  { id: 112, title: "Sites bulk-import" },
];

export const REFRESH_PATHS = [
  "/api/plans",
  "/api/bundles",
  "/api/customers",
  "/api/hss/subscribers",
  "/api/hss/groups",
  "/api/equipment-pricing",
  "/api/work-orders",
  "/api/notifications",
  "/api/network/sites",
];

export async function runProbes(ctx) {
  const { stamp, probeDemo, firstIdDemo } = ctx;
  /** @type {Array<Record<string, unknown>>} */
  const probes = [];

  // 103 plan features GET
  {
    const plans = await firstIdDemo("/api/plans", ["plans", "items"]);
    if (!plans.id) probes.push({ pass: 103, action: "skip-no-plan" });
    else {
      probes.push({
        pass: 103,
        ...(await probeDemo("GET", `/api/plans/${plans.id}/features`)),
      });
    }
  }

  // 104 bundle use
  {
    const bundles = await firstIdDemo("/api/bundles", ["bundles", "items"]);
    if (!bundles.id) probes.push({ pass: 104, action: "skip-no-bundle" });
    else {
      probes.push({
        pass: 104,
        ...(await probeDemo("POST", `/api/bundles/${bundles.id}/use`, {
          quantity: 1,
          notes: `chrysalis-use-${stamp}`,
        })),
      });
    }
  }

  // 105–106 complaints
  {
    const cust = await firstIdDemo("/api/customers", ["customers", "items"]);
    if (!cust.id) {
      probes.push({ pass: 105, action: "skip-no-customer" });
      probes.push({ pass: 106, action: "skip-no-customer" });
    } else {
      const created = await probeDemo("POST", `/api/customers/${cust.id}/complaints`, {
        subject: `n10k-${stamp}`,
        description: "chrysalis-complaint",
        complaintType: "service",
        priority: "low",
      });
      probes.push({ pass: 105, ...created });
      const full = await probeDemo("GET", `/api/customers/${cust.id}`);
      const comps = full.body?.complaints || [];
      const c0 = comps[comps.length - 1] || comps[0];
      const cid = c0?._id || c0?.id;
      if (!cid) probes.push({ pass: 106, action: "skip-no-complaint-id", get: full });
      else {
        probes.push({
          pass: 106,
          ...(await probeDemo("PUT", `/api/customers/${cust.id}/complaints/${cid}`, {
            status: "resolved",
            resolution: "chrysalis-resolved",
          })),
        });
      }
    }
  }

  // 107 subscribers create + list
  {
    const imsi = `00101${String(stamp).slice(-10)}`;
    const created = await probeDemo("POST", "/api/hss/subscribers", {
      imsi,
      msisdn: `555${String(stamp).slice(-7)}`,
      ki: "00112233445566778899aabbccddeeff",
      opc: "00112233445566778899aabbccddeeff",
      notes: `n10k-sub-${stamp}`,
    });
    const list = await probeDemo("GET", "/api/hss/subscribers");
    probes.push({
      pass: 107,
      create: created,
      list,
      note: created.ok && list.ok ? "ok" : "partial",
    });
  }

  // 108 groups GET
  {
    probes.push({
      pass: 108,
      ...(await probeDemo("GET", "/api/hss/groups")),
    });
  }

  // 109 pricing import
  {
    probes.push({
      pass: 109,
      ...(await probeDemo("POST", "/api/equipment-pricing/import-from-inventory", {
        category: "Radio Equipment",
      })),
    });
  }

  // 110 WO close
  {
    let wo = await firstIdDemo("/api/work-orders", ["workOrders", "items"]);
    if (!wo.id) {
      const created = await probeDemo("POST", "/api/work-orders", {
        title: `CWL WO Close ${stamp}`,
        type: "installation",
        status: "open",
        priority: "medium",
      });
      wo = { id: created.body?._id || created.body?.id || "" };
      if (wo.id) await probeDemo("POST", `/api/work-orders/${wo.id}/start`, {});
    }
    if (!wo.id) probes.push({ pass: 110, action: "skip-no-wo" });
    else {
      probes.push({
        pass: 110,
        ...(await probeDemo("POST", `/api/work-orders/${wo.id}/close`, {})),
      });
    }
  }

  // 111 notif count
  {
    probes.push({
      pass: 111,
      ...(await probeDemo("GET", "/api/notifications/count")),
    });
  }

  // 112 sites bulk-import
  {
    probes.push({
      pass: 112,
      ...(await probeDemo("POST", "/api/network/sites/bulk-import", {
        sites: [
          {
            name: `Bulk ${stamp}`,
            type: ["tower"],
            location: { latitude: 39.7, longitude: -105.0 },
            status: "active",
            notes: "chrysalis-sites-bulk-import",
          },
        ],
      })),
    });
  }

  return probes;
}
