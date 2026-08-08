defmodule HubGoldWeb.Router do
  use Phoenix.Router

  # hub-gold-phoenix-controllers — 20-route Phoenix controller table (G10126 / D6540).
  # Flat get|post|… "/path", Ctrl, :action + thin json/put_status controllers.
  # No live "/…" / LiveView / pipeline invent (D6447). Plug.Router remains Elixir ST.

  get "/health", HubGoldWeb.HubController, :health
  get "/ping", HubGoldWeb.HubController, :ping
  get "/version", HubGoldWeb.HubController, :version
  get "/ready", HubGoldWeb.HubController, :ready
  get "/count", HubGoldWeb.HubController, :count
  get "/flag", HubGoldWeb.HubController, :flag
  get "/build", HubGoldWeb.HubController, :build
  get "/tier", HubGoldWeb.HubController, :tier
  get "/meta", HubGoldWeb.HubController, :meta
  post "/echo", HubGoldWeb.HubController, :echo
  get "/items", HubGoldWeb.ItemsController, :index
  get "/items/:id", HubGoldWeb.ItemsController, :show
  post "/items", HubGoldWeb.ItemsController, :create
  get "/search", HubGoldWeb.HubController, :search
  put "/items/:id", HubGoldWeb.ItemsController, :update
  delete "/items/:id", HubGoldWeb.ItemsController, :destroy
  patch "/items/:id", HubGoldWeb.ItemsController, :patch
  get "/users/:userId", HubGoldWeb.HubController, :user
  get "/stats", HubGoldWeb.HubController, :stats
  post "/notify", HubGoldWeb.HubController, :notify
end
