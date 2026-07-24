# frozen_string_literal: true
require "roda"

# hub-gold-roda — 20-route Roda dialect (secondary to Sinatra hub-flagship-ruby ST).
# Shallow r.get|post + String/:id matchers + Hash / response.status / r.params
# (D6447 — no invented r.on nest / plugins / auth runtime). G10022 / D6484.

class App < Roda
  plugin :json

  route do |r|
    r.get "health" do
      true
    end

    r.get "ping" do
      42
    end

    r.get "version" do
      1
    end

    r.get "ready" do
      "ok"
    end

    r.get "count" do
      3
    end

    r.get "flag" do
      "chrysalis"
    end

    r.get "build" do
      2026
    end

    r.get "tier" do
      "gold"
    end

    r.get "meta" do
      { service: "hub-gold-roda", version: 1 }
    end

    r.post "echo" do
      { echo: true }
    end

    r.get "items" do
      true
    end

    r.get "items", String do |id|
      { id: id }
    end

    r.post "items" do
      response.status = 201
      { created: true }
    end

    r.get "search" do
      { q: r.params["q"] || "" }
    end

    r.put "items", String do |id|
      { updated: true, id: id }
    end

    r.delete "items", String do |id|
      true
    end

    r.patch "items", String do |id|
      { patched: true, id: id }
    end

    r.get "users", String do |userId|
      userId
    end

    r.get "stats" do
      3
    end

    r.post "notify" do
      response.status = 202
      { ok: true }
    end
  end
end
