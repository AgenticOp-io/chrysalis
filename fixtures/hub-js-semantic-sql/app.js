/**
 * JavaScript SQL/DB effect lowering (G8713): `db.query` / `pool.query` with
 * literal SQL and bound params from request fields.
 */
const express = require("express");
const db = { query() {} };
const pool = { query() {} };
const app = express();

app.get("/item/:id", (req) => ({
  rows: db.query("SELECT id FROM items WHERE id = ?", [req.params.id]),
}));

app.get("/users/:id", async (req, res) => {
  await pool.query("SELECT name FROM users WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

module.exports = app;
