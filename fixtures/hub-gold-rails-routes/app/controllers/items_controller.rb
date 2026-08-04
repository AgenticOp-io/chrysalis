# frozen_string_literal: true
# Items controller for hub-gold-rails-routes (G10115 / D6540).

class ItemsController < ActionController::API
  def index
    render json: true
  end

  def show
    render json: { id: params[:id] }
  end

  def create
    render json: { created: true }, status: 201
  end

  def update
    render json: { updated: true, id: params[:id] }
  end

  def destroy
    render json: true
  end

  def patch
    render json: { patched: true, id: params[:id] }
  end
end
