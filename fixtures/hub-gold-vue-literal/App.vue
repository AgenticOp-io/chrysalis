<script>
const express = require("express");
const app = express();

app.get("/health", () => true);
app.get("/ping", () => 42);

module.exports = app;
</script>
<template><p>hub gold vue literal</p></template>
