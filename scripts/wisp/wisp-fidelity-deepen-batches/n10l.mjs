/** Deepen batch n10l — passes 113–122 (desk harness). */
export const BATCH_ID = "n10l";
export const KIND = "chrysalis.wisp.fidelity-deepen-n10l";
export const NEED_ADMIN = false;
export const NOTE =
  "Deepen 113–122 — create surfaces + HD delete + equip bulk + monitoring GET (D6442)";

export const PASSES = [
  { id: 113, title: "Network sectors POST create" },
  { id: 114, title: "Network CPE POST create" },
  { id: 115, title: "Inventory POST create" },
  { id: 116, title: "Customers POST create" },
  { id: 117, title: "Plans POST create" },
  { id: 118, title: "Bundles POST create" },
  { id: 119, title: "Work-orders POST create" },
  { id: 120, title: "Incidents POST (incidentNumber+source)" },
  { id: 121, title: "Hardware-deployments DELETE" },
  { id: 122, title: "Equipment bulk-import + graphs GET" },
];

export const REFRESH_PATHS = [
  "/api/network/sectors",
  "/api/network/cpe",
  "/api/inventory",
  "/api/customers",
  "/api/plans",
  "/api/bundles",
  "/api/work-orders",
  "/api/incidents",
  "/api/network/hardware-deployments",
  "/api/network/equipment",
  "/api/monitoring/graphs",
];

export async function runProbes(ctx) {
  const { stamp, probeDemo, firstIdDemo } = ctx;
  /** @type {Array<Record<string, unknown>>} */
  const probes = [];

  const site = await firstIdDemo("/api/network/sites", ["sites", "items"]);

  // 113 sector
  {
    if (!site.id) probes.push({ pass: 113, action: "skip-no-site" });
    else {
      probes.push({
        pass: 113,
        ...(await probeDemo("POST", "/api/network/sectors", {
          name: `Sec ${stamp}`,
          siteId: site.id,
          technology: "LTE",
          azimuth: 90,
          beamwidth: 60,
          status: "active",
          location: { latitude: 39.75, longitude: -104.98 },
        })),
      });
    }
  }

  // 114 CPE
  {
    probes.push({
      pass: 114,
      ...(await probeDemo("POST", "/api/network/cpe", {
        name: `CPE ${stamp}`,
        serialNumber: `CPE-${stamp}`,
        macAddress: "00:11:22:33:44:77",
        manufacturer: "CWL",
        model: "CPE",
        technology: "LTE",
        serviceType: "residential",
        status: "active",
        location: { latitude: 39.76, longitude: -104.97 },
        azimuth: 0,
        beamwidth: 60,
      })),
    });
  }

  // 115 inventory
  {
    probes.push({
      pass: 115,
      ...(await probeDemo("POST", "/api/inventory", {
        serialNumber: `INV-${stamp}`,
        manufacturer: "CWL",
        model: "M",
        equipmentType: "radio",
        category: "Radio Equipment",
        status: "available",
        currentLocation: { type: "warehouse", name: "Main" },
      })),
    });
  }

  // 116 customers
  {
    probes.push({
      pass: 116,
      ...(await probeDemo("POST", "/api/customers", {
        firstName: "CWL",
        lastName: `N10L${stamp}`,
        primaryPhone: `555${String(stamp).slice(-7)}`,
        email: `cwl-n10l-${stamp}@example.com`,
        serviceStatus: "active",
      })),
    });
  }

  // 117 plans
  {
    probes.push({
      pass: 117,
      ...(await probeDemo("POST", "/api/plans", {
        name: `Plan ${stamp}`,
        status: "draft",
        kind: "plan-project",
      })),
    });
  }

  // 118 bundles
  {
    probes.push({
      pass: 118,
      ...(await probeDemo("POST", "/api/bundles", {
        name: `Bun ${stamp}`,
        category: "installation",
        description: "chrysalis-n10l",
      })),
    });
  }

  // 119 WO
  {
    probes.push({
      pass: 119,
      ...(await probeDemo("POST", "/api/work-orders", {
        title: `WO ${stamp}`,
        type: "installation",
        status: "open",
        priority: "medium",
      })),
    });
  }

  // 120 incidents
  {
    probes.push({
      pass: 120,
      ...(await probeDemo("POST", "/api/incidents", {
        title: `Inc ${stamp}`,
        description: "chrysalis-n10l",
        incidentType: "other",
        source: "other",
        severity: "low",
        status: "new",
        incidentNumber: `INC-CWL-${stamp}`,
      })),
    });
  }

  // 121 HD delete — create hardware first if needed
  {
    let hd = await firstIdDemo("/api/network/hardware-deployments", ["deployments", "items"]);
    if (!hd.id && site.id) {
      await probeDemo("POST", `/api/network/sites/${site.id}/hardware`, {
        name: `HW Del ${stamp}`,
        hardware_type: "router",
        status: "deployed",
      });
      hd = await firstIdDemo("/api/network/hardware-deployments", ["deployments", "items"]);
    }
    if (!hd.id) probes.push({ pass: 121, action: "skip-no-hd" });
    else {
      probes.push({
        pass: 121,
        ...(await probeDemo("DELETE", `/api/network/hardware-deployments/${hd.id}`)),
      });
    }
  }

  // 122 equip bulk + graphs
  {
    const bulk = await probeDemo("POST", "/api/network/equipment/bulk-import", {
      equipment: [
        {
          name: `EQB ${stamp}`,
          type: "radio",
          serialNumber: `EQB-${stamp}`,
          manufacturer: "CWL",
          model: "M",
        },
      ],
    });
    const graphs = await probeDemo("GET", "/api/monitoring/graphs");
    probes.push({
      pass: 122,
      bulk,
      graphs,
      note: bulk.ok && graphs.ok ? "ok" : "partial",
    });
  }

  return probes;
}
