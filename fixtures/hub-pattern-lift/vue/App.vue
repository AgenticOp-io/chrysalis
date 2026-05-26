<script setup>
import express from "express";
const app = express();
app.get("/health", (req, res) => res.json({ ok: true }));
app.post("/items", (req, res) => res.status(201).end());
</script>
<template><p>hub vue fixture</p></template>
