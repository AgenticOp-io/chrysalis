<script>
const express = require("express");
const app = express();

app.use(express.json());
app.get("/ready", (_req, res) => res.json({ ready: true }));
app.post("/echo", (_req, res) => res.json({ ok: true }));

module.exports = app;
</script>
<template><p>hub gold vue middleware</p></template>
