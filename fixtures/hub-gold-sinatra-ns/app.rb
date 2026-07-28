# frozen_string_literal: true
require "sinatra"
require "sinatra/namespace"
require "sinatra/json"

# hub-gold-sinatra-ns — 20-route Sinatra namespace('/api') prefix peel (G10073 / D6535).
# Deepens Sinatra D6448-ST with literal namespace path join (D6442/D6447 — no invent).
# Same express-depth surface as hub-flagship-ruby; paths are /api/... after peel.

namespace "/api" do
  get "/health" do
    true
  end

  get "/ping" do
    42
  end

  get "/version" do
    1
  end

  get "/ready" do
    "ok"
  end

  get "/count" do
    3
  end

  get "/flag" do
    "chrysalis"
  end

  get "/build" do
    2026
  end

  get "/tier" do
    "gold"
  end

  get "/meta" do
    json service: "hub-gold-sinatra-ns", version: 1
  end

  post "/echo" do
    json echo: true
  end

  get "/items" do
    true
  end

  get "/items/:id" do
    json id: params["id"]
  end

  post "/items" do
    status 201
    json created: true
  end

  get "/search" do
    json q: params.fetch("q", "")
  end

  put "/items/:id" do
    json updated: true, id: params["id"]
  end

  delete "/items/:id" do
    true
  end

  patch "/items/:id" do
    json patched: true, id: params["id"]
  end

  get "/users/:userId" do
    params["userId"]
  end

  get "/stats" do
    3
  end

  post "/notify" do
    status 202
    json ok: true
  end
end
