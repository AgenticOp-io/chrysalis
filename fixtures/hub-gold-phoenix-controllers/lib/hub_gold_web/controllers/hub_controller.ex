defmodule HubGoldWeb.HubController do
  use Phoenix.Controller

  # Thin Phoenix.Controller peels for hub-gold-phoenix-controllers (G10126 / D6540).
  # Only json/2 + put_status/2 + params["…"] — no LiveView / views / plugs invent (D6447).

  def health(conn, _params) do
    json(conn, true)
  end

  def ping(conn, _params) do
    json(conn, 42)
  end

  def version(conn, _params) do
    json(conn, 1)
  end

  def ready(conn, _params) do
    json(conn, "ok")
  end

  def count(conn, _params) do
    json(conn, 3)
  end

  def flag(conn, _params) do
    json(conn, "chrysalis")
  end

  def build(conn, _params) do
    json(conn, 2026)
  end

  def tier(conn, _params) do
    json(conn, "gold")
  end

  def meta(conn, _params) do
    json(conn, %{service: "hub-gold-phoenix-controllers", version: 1})
  end

  def echo(conn, _params) do
    json(conn, %{echo: true})
  end

  def search(conn, params) do
    json(conn, %{q: params["q"] || ""})
  end

  def user(conn, params) do
    json(conn, params["userId"])
  end

  def stats(conn, _params) do
    json(conn, 3)
  end

  def notify(conn, _params) do
    conn
    |> put_status(202)
    |> json(%{ok: true})
  end
end
