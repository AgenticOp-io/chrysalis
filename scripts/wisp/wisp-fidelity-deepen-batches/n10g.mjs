/** Deepen batch n10g — passes 63–72 (probe body only). */
export const BATCH_ID = "n10g";
export const KIND = "chrysalis.wisp.fidelity-deepen-n10g";
export const NEED_ADMIN = true;
export const NOTE =
  "Deepen 63–72 — same HSS Mongo API; admin mounts use platform-admin when available";

export const PASSES = [
  { id: 63, title: "HSS groups PUT/DELETE" },
  { id: 64, title: "HSS bandwidth-plans PUT/DELETE" },
  { id: 65, title: "HSS subscribers PUT/DELETE" },
  { id: 66, title: "Subcontractors POST + approve" },
  { id: 67, title: "Permissions role PUT" },
  { id: 68, title: "Users invite" },
  { id: 69, title: "Users suspend (+ activate)" },
  { id: 70, title: "Admin tenants assign-owner" },
  { id: 71, title: "Plans DELETE polish" },
  { id: 72, title: "CBRS import with sites/devices body" },
];

export const REFRESH_PATHS = [
  "/api/hss/groups",
  "/api/hss/bandwidth-plans",
  "/api/hss/subscribers",
  "/api/subcontractors",
  "/api/permissions/roles",
  "/api/users",
  "/api/plans",
];

/** @param {import('../wisp-fidelity-deepen-harness.mjs')} _h */
export async function runProbes(ctx) {
  const { stamp, tenantId, demoHeaders, adminHeaders, admin, probeDemo, probeAdmin, firstIdDemo } =
    ctx;
  /** @type {Array<Record<string, unknown>>} */
  const probes = [];

  {
    const created = await probeDemo("POST", "/api/hss/groups", {
      name: `CWL Group ${stamp}`,
      description: "chrysalis-hss-group",
      default_apn: "internet",
      default_qci: 9,
    });
    const gid =
      created.body?.group?.group_id ||
      created.body?.group?.id ||
      created.body?.group_id ||
      created.body?.id;
    let put = { action: "skip-no-id" };
    let del = { action: "skip-no-id" };
    if (created.ok && gid) {
      put = await probeDemo("PUT", `/api/hss/groups/${gid}`, {
        description: "chrysalis-hss-group-put",
      });
      del = await probeDemo("DELETE", `/api/hss/groups/${gid}`);
    }
    probes.push({ pass: 63, create: created, put, del });
  }

  {
    const created = await probeDemo("POST", "/api/hss/bandwidth-plans", {
      name: `CWL BW ${stamp}`,
      download_mbps: 100,
      upload_mbps: 20,
      description: "chrysalis-bw-plan",
    });
    let pid =
      created.body?.plan?.plan_id ||
      created.body?.plan?.id ||
      created.body?.plan_id ||
      created.body?.id;
    if (!pid) {
      const listed = await firstIdDemo("/api/hss/bandwidth-plans", ["plans", "items"]);
      pid = listed.id || undefined;
    }
    let put = { action: "skip-no-id" };
    let del = { action: "skip-no-id" };
    if (pid) {
      put = await probeDemo("PUT", `/api/hss/bandwidth-plans/${pid}`, {
        description: "chrysalis-bw-put",
        download_mbps: 120,
      });
    }
    probes.push({
      pass: 64,
      create: created,
      put,
      del,
      note: created.ok ? "ok" : put.ok ? "honest-create-500-put-existing" : "honest-create-failed",
    });
  }

  {
    const imsi = `00101${String(stamp).slice(-10)}`;
    const created = await probeDemo("POST", "/api/hss/subscribers", {
      imsi,
      msisdn: `555${String(stamp).slice(-7)}`,
      ki: "00112233445566778899aabbccddeeff",
      opc: "00112233445566778899aabbccddeeff",
      notes: "chrysalis-hss-subscriber",
    });
    const sid = String(created.body?.id || created.body?._id || "");
    let put = { action: "skip-no-id" };
    let del = { action: "skip-no-id" };
    if (created.ok && sid) {
      put = await probeDemo("PUT", `/api/hss/subscribers/${sid}`, {
        notes: "chrysalis-hss-subscriber-put",
      });
      del = await probeDemo("DELETE", `/api/hss/subscribers/${sid}`);
    }
    probes.push({
      pass: 65,
      create: created,
      put,
      del,
      note: put.ok || del.ok ? "ok" : "honest-id-shape-or-auth",
    });
  }

  {
    const headers = admin.ok ? adminHeaders : demoHeaders;
    const created = await probeAdmin("POST", "/api/subcontractors", {
      companyName: `CWL Sub ${stamp}`,
      taxId: `TAX-${stamp}`,
      primaryContact: {
        name: "CWL Contact",
        email: `cwl-sub-${stamp}@example.com`,
        phone: "5550100",
      },
      notes: "chrysalis-subcontractor",
    });
    // probeAdmin already uses admin headers; keep note accurate
    void headers;
    const id = created.body?._id || created.body?.id;
    let approve = { action: "skip-no-id" };
    if (created.ok && id) {
      approve = await probeAdmin("POST", `/api/subcontractors/${id}/approve`, {
        approvalNotes: "chrysalis-sub-approve",
      });
    }
    probes.push({
      pass: 66,
      create: created,
      approve,
      note: created.ok
        ? approve.ok
          ? "ok"
          : "honest-approve-gate"
        : created.error?.includes("aborted")
          ? "honest-timeout"
          : "honest-admin-or-schema",
      auth: admin.ok ? "platform-admin" : "demo",
    });
  }

  {
    const put = await probeAdmin("PUT", "/api/permissions/role/installer", {
      permissions: [
        {
          module: "inventory",
          fault: { read: true, write: false, delete: false },
          configuration: { read: true, write: false, delete: false },
          accounting: { read: false, write: false, delete: false },
          performance: { read: true, write: false, delete: false },
          security: { read: false, write: false, delete: false },
        },
      ],
    });
    probes.push({
      pass: 67,
      ...put,
      note: put.ok
        ? "ok"
        : put.status === 500
          ? "honest-hss-isPlatformAdminUser-bug"
          : "honest-auth-or-schema",
      auth: admin.ok ? "platform-admin" : "demo",
    });
  }

  {
    probes.push({
      pass: 68,
      ...(await probeAdmin("POST", "/api/users/invite", {
        email: `cwl-invite-${stamp}@example.com`,
        role: "installer",
        tenantId,
        sendEmail: false,
        displayName: "CWL Invite",
      })),
      auth: admin.ok ? "platform-admin" : "demo",
    });
  }

  {
    const inviteEmail = `cwl-suspend-${stamp}@example.com`;
    const invited = await probeAdmin("POST", "/api/users/invite", {
      email: inviteEmail,
      role: "installer",
      tenantId,
      sendEmail: false,
      displayName: "CWL Suspend Probe",
    });
    const uid = String(
      invited.body?.uid || invited.body?.userId || invited.body?.id || invited.body?.user?.uid || "",
    );
    if (invited.ok && uid) {
      const suspend = await probeAdmin("POST", `/api/users/${uid}/suspend`, { tenantId });
      const activate = await probeAdmin("POST", `/api/users/${uid}/activate`, { tenantId });
      probes.push({
        pass: 69,
        invite: invited,
        suspend,
        activate,
        note: suspend.ok ? "ok" : "honest-suspend-server-error",
        auth: admin.ok ? "platform-admin" : "demo",
      });
    } else {
      probes.push({
        pass: 69,
        invite: invited,
        action: "skip-no-invitee",
        note: invited.ok ? "invite-ok-but-no-uid" : "honest-invite-failed",
        auth: admin.ok ? "platform-admin" : "demo",
      });
    }
  }

  {
    if (admin.ok) {
      probes.push({
        pass: 70,
        ...(await probeAdmin("POST", `/admin/tenants/${tenantId}/assign-owner`, {
          email: "demo@wisptools.io",
        })),
      });
    } else {
      probes.push({ pass: 70, action: "skip-no-platform-admin" });
    }
  }

  {
    const created = await probeDemo("POST", "/api/plans", {
      name: `CWL Plan Del ${stamp}`,
      status: "draft",
      kind: "plan-project",
      notes: "chrysalis-plan-delete",
    });
    const id = created.body?._id || created.body?.id;
    if (created.ok && id) {
      probes.push({
        pass: 71,
        create: created,
        ...(await probeDemo("DELETE", `/api/plans/${id}`)),
      });
    } else probes.push({ pass: 71, action: "skip-create-failed", create: created });
  }

  {
    probes.push({
      pass: 72,
      ...(await probeDemo("POST", "/api/network/import/cbrs", {
        sites: [
          {
            name: `CWL CBRS Site ${stamp}`,
            displayName: `CWL CBRS Site ${stamp}`,
            location: { latitude: 39.75, longitude: -104.98 },
          },
        ],
        devices: [
          {
            name: `CWL CBSD ${stamp}`,
            serialNumber: `CBRS-${stamp}`,
            cbsdId: `cbsd-${stamp}`,
            manufacturer: "CBRS",
            model: "CBSD",
          },
        ],
      })),
    });
  }

  return probes;
}
