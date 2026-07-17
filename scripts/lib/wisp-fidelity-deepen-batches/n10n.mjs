/** Deepen batch n10n — passes 133–142 (desk harness). */
export const BATCH_ID = "n10n";
export const KIND = "chrysalis.wisp.fidelity-deepen-n10n";
export const NEED_ADMIN = false;
export const NOTE =
  "Deepen 133–142 — plan features GET/DELETE, reject, inv bulk-update, customer history/subscriber, incident ack/resolve/ticket (D6442)";

export const PASSES = [
  { id: 133, title: "Plans features GET" },
  { id: 134, title: "Plans feature create+DELETE by id" },
  { id: 135, title: "Plans ready→reject" },
  { id: 136, title: "Inventory bulk-update itemIds" },
  { id: 137, title: "Customer service-history POST" },
  { id: 138, title: "Customer create-subscriber" },
  { id: 139, title: "Incident acknowledge" },
  { id: 140, title: "Incident resolve" },
  { id: 141, title: "Incident convert-to-ticket" },
  { id: 142, title: "CBRS import devices body" },
];

export const REFRESH_PATHS = [
  "/api/plans",
  "/api/inventory",
  "/api/customers",
  "/api/incidents",
  "/api/work-orders",
  "/api/hss/subscribers",
  "/api/network/import/cbrs",
];

export async function runProbes(ctx) {
  const { stamp, probeDemo, firstIdDemo } = ctx;
  /** @type {Array<Record<string, unknown>>} */
  const probes = [];

  // 133 features GET
  {
    const plan = await firstIdDemo("/api/plans", ["plans", "items"]);
    if (!plan.id) probes.push({ pass: 133, action: "skip-no-plan" });
    else {
      probes.push({
        pass: 133,
        ...(await probeDemo("GET", `/api/plans/${plan.id}/features`)),
      });
    }
  }

  // 134 feature create+DELETE
  {
    const created = await probeDemo("POST", "/api/plans", {
      name: `Feat ${stamp}`,
      status: "draft",
      kind: "plan-project",
    });
    const pid = created.body?._id;
    if (!pid) probes.push({ pass: 134, action: "skip-no-plan", created });
    else {
      const feat = await probeDemo("POST", `/api/plans/${pid}/features`, {
        featureType: "sector",
        name: `F ${stamp}`,
        geometry: { type: "Point", coordinates: [-104.99, 39.74] },
        status: "draft",
        notes: `chrysalis-n10n-${stamp}`,
      });
      const fid =
        feat.body?.feature?._id ||
        feat.body?.feature?.id ||
        feat.body?._id ||
        (await probeDemo("GET", `/api/plans/${pid}/features`)).body?.features?.[0]?._id;
      if (!fid) probes.push({ pass: 134, action: "skip-no-feature", created, feat });
      else {
        const del = await probeDemo("DELETE", `/api/plans/${pid}/features/${fid}`);
        probes.push({ pass: 134, created, feat, del, ok: created.ok && feat.ok && del.ok });
      }
    }
  }

  // 135 ready→reject
  {
    const created = await probeDemo("POST", "/api/plans", {
      name: `Rej ${stamp}`,
      status: "draft",
      kind: "plan-project",
    });
    const id = created.body?._id;
    if (!id) probes.push({ pass: 135, action: "skip-no-plan", created });
    else {
      const ready = await probeDemo("PUT", `/api/plans/${id}`, { status: "ready" });
      const reject = await probeDemo("POST", `/api/plans/${id}/reject`, {
        reason: `chrysalis-n10n-${stamp}`,
      });
      probes.push({
        pass: 135,
        created,
        ready,
        reject,
        ok: created.ok && ready.ok && reject.ok,
      });
    }
  }

  // 136 bulk-update
  {
    const inv = await firstIdDemo("/api/inventory", ["items"]);
    if (!inv.id) probes.push({ pass: 136, action: "skip-no-inv" });
    else {
      probes.push({
        pass: 136,
        ...(await probeDemo("POST", "/api/inventory/bulk-update", {
          itemIds: [inv.id],
          updates: { notes: `chrysalis-n10n-${stamp}` },
        })),
      });
    }
  }

  // 137 service-history
  {
    const cust = await firstIdDemo("/api/customers", ["customers", "items"]);
    if (!cust.id) probes.push({ pass: 137, action: "skip-no-customer" });
    else {
      probes.push({
        pass: 137,
        ...(await probeDemo("POST", `/api/customers/${cust.id}/service-history`, {
          type: "note",
          description: `chrysalis-n10n-${stamp}`,
          status: "completed",
        })),
      });
    }
  }

  // 138 create-subscriber
  {
    const cust = await firstIdDemo("/api/customers", ["customers", "items"]);
    if (!cust.id) probes.push({ pass: 138, action: "skip-no-customer" });
    else {
      probes.push({
        pass: 138,
        ...(await probeDemo("POST", `/api/customers/${cust.id}/create-subscriber`, {
          imsi: `00101${String(stamp).slice(-10)}`,
          msisdn: `1${String(stamp).slice(-10)}`,
        })),
      });
    }
  }

  // 139–141 incident lifecycle (fresh incident)
  {
    const created = await probeDemo("POST", "/api/incidents", {
      title: `Inc ${stamp}`,
      description: "chrysalis-n10n",
      incidentType: "other",
      source: "other",
      severity: "low",
      status: "new",
      incidentNumber: `INC-CWL-${stamp}`,
    });
    const id = created.body?._id;
    if (!id) {
      probes.push({ pass: 139, action: "skip-no-incident", created });
      probes.push({ pass: 140, action: "skip-no-incident" });
      probes.push({ pass: 141, action: "skip-no-incident" });
    } else {
      probes.push({
        pass: 139,
        created,
        ...(await probeDemo("POST", `/api/incidents/${id}/acknowledge`, {
          userId: "cwl-demo",
          userName: "CWL Demo",
        })),
      });
      probes.push({
        pass: 140,
        ...(await probeDemo("POST", `/api/incidents/${id}/resolve`, {
          resolution: `chrysalis-n10n-${stamp}`,
        })),
      });
      probes.push({
        pass: 141,
        ...(await probeDemo("POST", `/api/incidents/${id}/convert-to-ticket`, {})),
      });
    }
  }

  // 142 CBRS import
  {
    probes.push({
      pass: 142,
      ...(await probeDemo("POST", "/api/network/import/cbrs", {
        devices: [
          {
            name: `CBRS ${stamp}`,
            serialNumber: `CBRS-${stamp}`,
            latitude: 39.74,
            longitude: -104.99,
          },
        ],
      })),
    });
  }

  return probes;
}
