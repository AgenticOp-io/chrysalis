/**
 * Runnable Express oracle for WISP GET /api/tenants pilot (Phase 28d).
 * Mirrors backend-services list contract without MongoDB/Firebase deps.
 */
const express = require("express");

const app = express();

/** @type {import("express").RequestHandler} */
function listTenants(_req, res) {
  res.json({
    ok: true,
    surface: "wisp-api-native",
    resource: "tenants",
    op: "list",
    count: 1,
    tenants: [
      {
        id: "674a1b2c3d4e5f6789012345",
        name: "WISP Oracle Tenant",
        subdomain: "wisp-oracle",
        status: "active",
        userCount: 1,
      },
    ],
  });
}

app.get("/api/tenants", listTenants);

module.exports = app;
