defmodule HubGold.Router do
  use Plug.Router

  # hub-gold-elixir-plug — 20-route Plug.Router foundation (D6442).
  # Inline get|post|… do…end + Jason.encode! + send_resp status.
  # No Phoenix LiveView / controller runtime invented (D6447).

  plug :match
  plug :dispatch

  get "/health" do
    send_resp(conn, 200, Jason.encode!(true))
  end

  get "/ping" do
    send_resp(conn, 200, Jason.encode!(42))
  end

  get "/version" do
    send_resp(conn, 200, Jason.encode!(1))
  end

  get "/ready" do
    send_resp(conn, 200, Jason.encode!("ok"))
  end

  get "/count" do
    send_resp(conn, 200, Jason.encode!(3))
  end

  get "/flag" do
    send_resp(conn, 200, Jason.encode!("chrysalis"))
  end

  get "/build" do
    send_resp(conn, 200, Jason.encode!(2026))
  end

  get "/tier" do
    send_resp(conn, 200, Jason.encode!("gold"))
  end

  get "/meta" do
    send_resp(conn, 200, Jason.encode!(%{service: "hub-gold-elixir-plug", version: 1}))
  end

  post "/echo" do
    kind = conn.body_params["kind"] || "plain"
    send_resp(conn, 200, Jason.encode!(%{echo: true, kind: kind}))
  end

  get "/items" do
    send_resp(conn, 200, Jason.encode!(true))
  end

  get "/items/:id" do
    id = conn.params["id"]
    send_resp(conn, 200, Jason.encode!(%{id: id}))
  end

  post "/items" do
    send_resp(conn, 201, Jason.encode!(%{created: true}))
  end

  get "/search" do
    q = conn.query_params["q"] || ""
    send_resp(conn, 200, Jason.encode!(%{q: q}))
  end

  put "/items/:id" do
    id = conn.params["id"]
    send_resp(conn, 200, Jason.encode!(%{updated: true, id: id}))
  end

  delete "/items/:id" do
    send_resp(conn, 200, Jason.encode!(true))
  end

  patch "/items/:id" do
    id = conn.params["id"]
    send_resp(conn, 200, Jason.encode!(%{patched: true, id: id}))
  end

  get "/users/:userId" do
    send_resp(conn, 200, conn.params["userId"])
  end

  get "/stats" do
    send_resp(conn, 200, Jason.encode!(3))
  end

  post "/notify" do
    send_resp(conn, 202, Jason.encode!(%{ok: true}))
  end
end
