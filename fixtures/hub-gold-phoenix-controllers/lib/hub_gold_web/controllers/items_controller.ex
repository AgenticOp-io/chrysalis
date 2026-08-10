defmodule HubGoldWeb.ItemsController do
  use Phoenix.Controller

  # Items controller for hub-gold-phoenix-controllers (G10126 / D6540).

  def index(conn, _params) do
    json(conn, true)
  end

  def show(conn, params) do
    json(conn, %{id: params["id"]})
  end

  def create(conn, _params) do
    conn
    |> put_status(201)
    |> json(%{created: true})
  end

  def update(conn, params) do
    json(conn, %{updated: true, id: params["id"]})
  end

  def destroy(conn, _params) do
    json(conn, true)
  end

  def patch(conn, params) do
    json(conn, %{patched: true, id: params["id"]})
  end
end
