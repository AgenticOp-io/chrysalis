<script>
const express = require("express");
const app = express();

app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/meta", (_req, res) => res.json({ service: "hub-gold-vue-structured", version: 1 }));

module.exports = app;
</script>
<template><p>hub gold vue structured</p></template>
