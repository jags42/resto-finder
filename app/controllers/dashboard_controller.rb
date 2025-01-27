class DashboardController < ApplicationController
  before_action :authenticate_user!
    def profile
      @user = current_user
      @reviews = @user.reviews.includes(:restaurant)
      @favorites = @user.favorites.includes(:restaurant)
      render 'user_profiles/profile'  # Explicitly render the custom view
    end
  end
  