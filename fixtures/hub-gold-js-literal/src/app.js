const express = require("express");
const app = express();

app.get("/health", () => true);
app.get("/ping", () => 42);

module.exports = app;
