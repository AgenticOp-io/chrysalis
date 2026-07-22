/** Deepen batch n10m — passes 123–132 (desk harness). */
export const BATCH_ID = "n10m";
export const KIND = "chrysalis.wisp.fidelity-deepen-n10m";
export const NEED_ADMIN = false;
export const NOTE =
  "Deepen 123–132 — scan lookup, transfer, site/WO DELETE, plan ready→approve→auth, tenant company, install create, group GET, requirements, pricing basePrice (D6442)";

export const PASSES = [
  { id: 123, title: "Inventory scan lookup (identifier)" },
  { id: 124, title: "Inventory transfer newLocation" },
  { id: 125, title: "Sites create+DELETE" },
  { id: 126, title: "Work-orders create+DELETE" },
  { id: 127, title: "Plans ready→approve→authorize" },
  { id: 128, title: "Tenant-settings companyInfo PUT" },
  { id: 129, title: "Installation-documentation POST" },
  { id: 130, title: "HSS groups GET by id" },
  { id: 131, title: "Plans requirements (category+qty)" },
  { id: 132, title: "Equipment-pricing create basePrice" },
];

export const REFRESH_PATHS = [
  "/api/inventory",
  "/api/network/sites",
  "/api/work-orders",
  "/api/plans",
  "/api/tenant-settings",
  "/api/installation-documentation",
  "/api/hss/groups",
  "/api/equipment-pricing",
  "/api/subcontractors",
  "/api/monitoring/graphs/devices",
];

export async function runProbes(ctx) {
  const { stamp, probeDemo, firstIdDemo } = ctx;
  /** @type {Array<Record<string, unknown>>} */
  const probes = [];

  // 123 scan lookup
  {
    const created = await probeDemo("POST", "/api/inventory", {
      serialNumber: `SCAN-${stamp}`,
      manufacturer: "CWL",
      model: "M",
      equipmentType: "radio",
      category: "Radio Equipment",
      status: "available",
      currentLocation: { type: "warehouse", name: "Main" },
      barcode: `BC-${stamp}`,
      assetTag: `AT-${stamp}`,
    });
    const lookup = await probeDemo("POST", "/api/inventory/scan/lookup", {
      identifier: `BC-${stamp}`,
    });
    // Honest residual: check-in/out fail HSS locationHistory.reason enum
    const checkOut = await probeDemo("POST", "/api/inventory/scan/check-out", {
      identifier: `BC-${stamp}`,
      location: { type: "vehicle", name: "T1" },
      reason: "other",
    });
    probes.push({
      pass: 123,
      created,
      lookup,
      checkOutHonest: !checkOut.ok,
      checkOutStatus: checkOut.status,
      note: lookup.ok ? "lookup-ok; check-out held residual" : "lookup-failed",
      ok: lookup.ok,
    });
  }

  // 124 transfer
  {
    const inv = await probeDemo("POST", "/api/inventory", {
      serialNumber: `XF-${stamp}`,
      manufacturer: "CWL",
      model: "M",
      equipmentType: "radio",
      category: "Radio Equipment",
      status: "available",
      currentLocation: { type: "warehouse", name: "Main" },
    });
    const id = inv.body?._id || inv.body?.item?._id;
    if (!id) probes.push({ pass: 124, action: "skip-no-inv", created: inv });
    else {
      probes.push({
        pass: 124,
        created: inv,
        ...(await probeDemo("POST", `/api/inventory/${id}/transfer`, {
          newLocation: { type: "tower", name: `T-${stamp}` },
          reason: "transfer",
          notes: `chrysalis-n10m-${stamp}`,
          movedBy: "cwl-demo",
        })),
      });
    }
  }

  // 125 site create+DELETE
  {
    const created = await probeDemo("POST", "/api/network/sites", {
      name: `DelSite ${stamp}`,
      type: "tower",
      status: "active",
      location: { latitude: 39.73, longitude: -104.93 },
    });
    const id = created.body?._id || created.body?.site?._id;
    if (!id) probes.push({ pass: 125, action: "skip-no-site", created });
    else {
      const del = await probeDemo("DELETE", `/api/network/sites/${id}`);
      probes.push({ pass: 125, created, del, ok: created.ok && del.ok });
    }
  }

  // 126 WO create+DELETE
  {
    const created = await probeDemo("POST", "/api/work-orders", {
      title: `DelWO ${stamp}`,
      type: "installation",
      status: "open",
      priority: "low",
    });
    const id = created.body?._id;
    if (!id) probes.push({ pass: 126, action: "skip-no-wo", created });
    else {
      const del = await probeDemo("DELETE", `/api/work-orders/${id}`);
      probes.push({ pass: 126, created, del, ok: created.ok && del.ok });
    }
  }

  // 127 plan ready→approve→authorize
  {
    const created = await probeDemo("POST", "/api/plans", {
      name: `Auth ${stamp}`,
      status: "draft",
      kind: "plan-project",
    });
    const id = created.body?._id;
    if (!id) probes.push({ pass: 127, action: "skip-no-plan", created });
    else {
      const ready = await probeDemo("PUT", `/api/plans/${id}`, { status: "ready" });
      const approve = await probeDemo("POST", `/api/plans/${id}/approve`, {});
      const authorize = await probeDemo("POST", `/api/plans/${id}/authorize`, {
        notes: `chrysalis-n10m-${stamp}`,
      });
      probes.push({
        pass: 127,
        created,
        ready,
        approve,
        authorize,
        ok: created.ok && ready.ok && approve.ok && authorize.ok,
      });
    }
  }

  // 128 tenant companyInfo
  {
    probes.push({
      pass: 128,
      ...(await probeDemo("PUT", "/api/tenant-settings", {
        companyInfo: {
          name: "CWL Demo",
          phone: "555-0100",
          email: "ops@example.com",
        },
      })),
    });
  }

  // 129 install create
  {
    const site = await firstIdDemo("/api/network/sites", ["sites", "items"]);
    if (!site.id) probes.push({ pass: 129, action: "skip-no-site" });
    else {
      probes.push({
        pass: 129,
        ...(await probeDemo("POST", "/api/installation-documentation", {
          installationType: "cpe",
          siteId: site.id,
          status: "draft",
          notes: `chrysalis-n10m-${stamp}`,
        })),
      });
    }
  }

  // 130 HSS group GET by id
  {
    const g = await firstIdDemo("/api/hss/groups", ["groups", "items"]);
    if (!g.id) probes.push({ pass: 130, action: "skip-no-group" });
    else {
      probes.push({
        pass: 130,
        ...(await probeDemo("GET", `/api/hss/groups/${g.id}`)),
      });
    }
  }

  // 131 requirements
  {
    const created = await probeDemo("POST", "/api/plans", {
      name: `Req ${stamp}`,
      status: "draft",
      kind: "plan-project",
    });
    const id = created.body?._id;
    if (!id) probes.push({ pass: 131, action: "skip-no-plan", created });
    else {
      probes.push({
        pass: 131,
        created,
        ...(await probeDemo("POST", `/api/plans/${id}/requirements`, {
          category: "Radio Equipment",
          equipmentType: "radio",
          quantity: 1,
          notes: `chrysalis-n10m-${stamp}`,
        })),
      });
    }
  }

  // 132 pricing basePrice
  {
    probes.push({
      pass: 132,
      ...(await probeDemo("POST", "/api/equipment-pricing", {
        category: "Radio Equipment",
        equipmentType: "Radio",
        manufacturer: "CWL",
        model: `BP-${stamp}`,
        basePrice: 42,
        currency: "USD",
      })),
    });
  }

  return probes;
}
