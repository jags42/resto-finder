class FavoritesController < ApplicationController
  before_action :authenticate_user!
  before_action :set_restaurant

  def toggle
    favorite = current_user.favorites.find_by(restaurant: @restaurant)

    begin
      ActiveRecord::Base.transaction do
        if favorite
          favorite.destroy
          is_favorite = false
        else
          current_user.favorites.create!(restaurant: @restaurant, user_likes_restaurant: true)
          is_favorite = true
        end
      end

      render json: { status: is_favorite ? 'favorited' : 'unfavorited', is_favorite: is_favorite }
    rescue ActiveRecord::RecordInvalid => e
      render json: { error: e.message }, status: :unprocessable_entity
    rescue StandardError => e
      render json: { error: 'An unexpected error occurred' }, status: :internal_server_error
    end
  end

  private

  def set_restaurant
    @restaurant = Restaurant.find(params[:restaurant_id])
  end
end

