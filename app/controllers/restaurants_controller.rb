class RestaurantsController < ApplicationController
  before_action :authenticate_user!

  def index
  #restaurants = Restaurant.all
  #render json: restaurants
  render "restaurants.html.erb/index"
  end

end