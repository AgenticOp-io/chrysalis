# frozen_string_literal: true
require "sinatra"
require "sinatra/json"

# hub-flagship-ruby — 20-route Sinatra mirror of hub-flagship-express / go / python / csharp.
# No invented product UI (D6447). Bodies use string/status/json idioms the hub Ruby→WebIR lift understands.

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
  json service: "hub-flagship-ruby", version: 1
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
