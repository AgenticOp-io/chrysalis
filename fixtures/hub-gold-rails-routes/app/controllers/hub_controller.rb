# frozen_string_literal: true
# Thin ActionController peels for hub-gold-rails-routes (G10115 / D6540).
# Only render json: + params[:id] — no filters / views / DI invent (D6447).

class HubController < ActionController::API
  def health
    render json: true
  end

  def ping
    render json: 42
  end

  def version
    render json: 1
  end

  def ready
    render json: "ok"
  end

  def count
    render json: 3
  end

  def flag
    render json: "chrysalis"
  end

  def build
    render json: 2026
  end

  def tier
    render json: "gold"
  end

  def meta
    render json: { service: "hub-gold-rails-routes", version: 1 }
  end

  def echo
    render json: { echo: true }
  end

  def search
    render json: { q: params[:q] || "" }
  end

  def user
    render json: params[:userId]
  end

  def stats
    render json: 3
  end

  def notify
    render json: { ok: true }, status: 202
  end
end
