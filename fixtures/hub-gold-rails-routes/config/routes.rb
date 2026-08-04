# frozen_string_literal: true
# hub-gold-rails-routes — 20-route Rails routes.rb table (secondary to Sinatra ST).
# Flat get|post|put|patch|delete string paths + to: "ctrl#action" (G10115 / D6540).
# No resources / namespace / scope macros. Bodies in app/controllers (render json:).

Rails.application.routes.draw do
  get "/health", to: "hub#health"
  get "/ping", to: "hub#ping"
  get "/version", to: "hub#version"
  get "/ready", to: "hub#ready"
  get "/count", to: "hub#count"
  get "/flag", to: "hub#flag"
  get "/build", to: "hub#build"
  get "/tier", to: "hub#tier"
  get "/meta", to: "hub#meta"
  post "/echo", to: "hub#echo"
  get "/items", to: "items#index"
  get "/items/:id", to: "items#show"
  post "/items", to: "items#create"
  get "/search", to: "hub#search"
  put "/items/:id", to: "items#update"
  delete "/items/:id", to: "items#destroy"
  patch "/items/:id", to: "items#patch"
  get "/users/:userId", to: "hub#user"
  get "/stats", to: "hub#stats"
  post "/notify", to: "hub#notify"
end
