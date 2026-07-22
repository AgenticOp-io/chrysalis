/** Deepen batch n10j — passes 93–102 (desk harness). */
export const BATCH_ID = "n10j";
export const KIND = "chrysalis.wisp.fidelity-deepen-n10j";
export const NEED_ADMIN = false;
export const NOTE =
  "Deepen 93–102 — sectors/sites/WO/incident/inventory/HD/plans visibility/geocode (D6442)";

export const PASSES = [
  { id: 93, title: "Network sectors PUT" },
  { id: 94, title: "Network sites PUT" },
  { id: 95, title: "Site hardware POST" },
  { id: 96, title: "HSS bandwidth-plans PUT" },
  { id: 97, title: "WO log + assign + start" },
  { id: 98, title: "Incident PUT + notes + close" },
  { id: 99, title: "Inventory PUT + deploy" },
  { id: 100, title: "Hardware-deployments PUT" },
  { id: 101, title: "Plans toggle-visibility PUT" },
  { id: 102, title: "Geocode + reverse-geocode" },
];

export const REFRESH_PATHS = [
  "/api/network/sectors",
  "/api/network/sites",
  "/api/hss/bandwidth-plans",
  "/api/work-orders",
  "/api/incidents",
  "/api/inventory",
  "/api/network/hardware-deployments",
  "/api/plans",
];

export async function runProbes(ctx) {
  const { stamp, probeDemo, firstIdDemo } = ctx;
  /** @type {Array<Record<string, unknown>>} */
  const probes = [];

  // 93 sectors PUT
  {
    const sec = await firstIdDemo("/api/network/sectors", ["sectors", "items"]);
    if (!sec.id) probes.push({ pass: 93, action: "skip-no-sector" });
    else {
      probes.push({
        pass: 93,
        ...(await probeDemo("PUT", `/api/network/sectors/${sec.id}`, {
          notes: `chrysalis-sec-${stamp}`,
          azimuth: Number(sec.row?.azimuth || 0) + 1,
        })),
      });
    }
  }

  // 94 sites PUT
  {
    const site = await firstIdDemo("/api/network/sites", ["sites", "items"]);
    if (!site.id) probes.push({ pass: 94, action: "skip-no-site" });
    else {
      probes.push({
        pass: 94,
        ...(await probeDemo("PUT", `/api/network/sites/${site.id}`, {
          notes: `chrysalis-site-${stamp}`,
          name: site.row?.name || `CWL Site ${stamp}`,
        })),
      });
    }
  }

  // 95 site hardware
  {
    const site = await firstIdDemo("/api/network/sites", ["sites", "items"]);
    if (!site.id) probes.push({ pass: 95, action: "skip-no-site" });
    else {
      probes.push({
        pass: 95,
        ...(await probeDemo("POST", `/api/network/sites/${site.id}/hardware`, {
          name: `HW ${stamp}`,
          hardware_type: "router",
          status: "deployed",
        })),
      });
    }
  }

  // 96 BW PUT
  {
    const bw = await firstIdDemo("/api/hss/bandwidth-plans", ["plans"]);
    if (!bw.id) probes.push({ pass: 96, action: "skip-no-bw" });
    else {
      probes.push({
        pass: 96,
        ...(await probeDemo("PUT", `/api/hss/bandwidth-plans/${bw.id}`, {
          description: `n10j-bw-${stamp}`,
          download_mbps: 130,
        })),
      });
    }
  }

  // 97 WO log/assign/start — create fresh WO if needed
  {
    let wo = await firstIdDemo("/api/work-orders", ["workOrders", "items"]);
    if (!wo.id) {
      const created = await probeDemo("POST", "/api/work-orders", {
        title: `CWL WO ${stamp}`,
        type: "installation",
        status: "open",
        priority: "medium",
        notes: "chrysalis-n10j-wo",
      });
      wo = { id: created.body?._id || created.body?.id || "" };
    }
    if (!wo.id) probes.push({ pass: 97, action: "skip-no-wo" });
    else {
      const log = await probeDemo("POST", `/api/work-orders/${wo.id}/log`, {
        message: `chrysalis-log-${stamp}`,
      });
      const assign = await probeDemo("POST", `/api/work-orders/${wo.id}/assign`, {
        assigneeId: "xbQzgkx9FQaqUkaocW8MjVXfUAZ2",
        assigneeName: "Demo",
      });
      const start = await probeDemo("POST", `/api/work-orders/${wo.id}/start`, {});
      probes.push({
        pass: 97,
        log,
        assign,
        start,
        note: log.ok && assign.ok && start.ok ? "ok" : "partial",
      });
    }
  }

  // 98 incident put/notes/close — create if empty
  {
    let inc = await firstIdDemo("/api/incidents", ["incidents", "items"]);
    if (!inc.id) {
      const created = await probeDemo("POST", "/api/incidents", {
        title: `CWL Inc ${stamp}`,
        description: "chrysalis-n10j-incident",
        incidentType: "other",
        severity: "low",
        status: "new",
      });
      inc = { id: created.body?._id || created.body?.id || "" };
    }
    if (!inc.id) probes.push({ pass: 98, action: "skip-no-incident" });
    else {
      const put = await probeDemo("PUT", `/api/incidents/${inc.id}`, {
        status: "investigating",
        notes: `chrysalis-inc-${stamp}`,
      });
      const notes = await probeDemo("POST", `/api/incidents/${inc.id}/notes`, {
        note: `n10j-note-${stamp}`,
      });
      const close = await probeDemo("POST", `/api/incidents/${inc.id}/close`, {
        resolution: "chrysalis",
      });
      probes.push({
        pass: 98,
        put,
        notes,
        close,
        note: put.ok && notes.ok && close.ok ? "ok" : "partial",
      });
    }
  }

  // 99 inventory PUT + deploy
  {
    const inv = await firstIdDemo("/api/inventory", ["items", "inventory"]);
    if (!inv.id) probes.push({ pass: 99, action: "skip-no-inventory" });
    else {
      const put = await probeDemo("PUT", `/api/inventory/${inv.id}`, {
        notes: `chrysalis-inv-${stamp}`,
      });
      const deploy = await probeDemo("POST", `/api/inventory/${inv.id}/deploy`, {
        location: { type: "tower", name: "T1" },
        notes: "n10j-deploy",
      });
      probes.push({
        pass: 99,
        put,
        deploy,
        note: put.ok && deploy.ok ? "ok" : "partial",
      });
    }
  }

  // 100 HD PUT
  {
    const hd = await firstIdDemo("/api/network/hardware-deployments", [
      "deployments",
      "items",
    ]);
    if (!hd.id) probes.push({ pass: 100, action: "skip-no-hd" });
    else {
      probes.push({
        pass: 100,
        ...(await probeDemo("PUT", `/api/network/hardware-deployments/${hd.id}`, {
          notes: `chrysalis-hd-${stamp}`,
        })),
      });
    }
  }

  // 101 plans toggle-visibility (PUT path)
  {
    const plans = await firstIdDemo("/api/plans", ["plans", "items"]);
    if (!plans.id) probes.push({ pass: 101, action: "skip-no-plan" });
    else {
      probes.push({
        pass: 101,
        ...(await probeDemo("PUT", `/api/plans/${plans.id}/toggle-visibility`, {
          showOnMap: true,
        })),
      });
    }
  }

  // 102 geocode pair
  {
    const geo = await probeDemo("POST", "/api/network/geocode", {
      address: "Denver, CO",
    });
    const rev = await probeDemo("POST", "/api/network/reverse-geocode", {
      latitude: 39.75,
      longitude: -104.98,
    });
    probes.push({
      pass: 102,
      geocode: geo,
      reverse: rev,
      note: geo.ok && rev.ok ? "ok" : "partial",
    });
  }

  return probes;
}
