class RestaurantsController < ApplicationController
  before_action :authenticate_user!

  def search
    Rails.logger.debug "=== Starting Restaurant Search ==="
    
    address = params[:address]
    radius = params[:radius] || 1000
    max_results = params[:max_results] || 20

    Rails.logger.debug "Search params: address=#{address}, radius=#{radius}, max_results=#{max_results}"

    if address.blank?
      flash.now[:alert] = "Address is required"
      return render :search
    end

    places_service = GooglePlacesService.new

    # Step 1: Geocode the address
    location = places_service.geocode_address(address)
    Rails.logger.debug "Geocoded location: #{location.inspect}"

    if location[:error]
      flash.now[:alert] = location[:error]
      return render :search
    end

    # Step 2: Search restaurants using lat/lng from geocoding
    lat = location[:latitude]
    lng = location[:longitude]

    begin
      restaurant_attrs_list = places_service.search_restaurants(
        lat,
        lng,
        radius.to_f,
        max_results.to_i
      )

      Rails.logger.debug "Received #{restaurant_attrs_list.length} restaurants"
      Rails.logger.debug "First restaurant attrs: #{restaurant_attrs_list.first.inspect}" if restaurant_attrs_list.any?

      if restaurant_attrs_list.any?
        @restaurants = restaurant_attrs_list.map do |attrs|
          Rails.logger.debug "Processing restaurant: #{attrs[:name]}"
          Rails.logger.debug "Photo URL: #{attrs[:photo_url]}"
          
          restaurant = Restaurant.find_or_initialize_by(place_id: attrs[:place_id])
          restaurant.assign_attributes(attrs)
          
          Rails.logger.debug "Restaurant after assignment: #{restaurant.inspect}"
          Rails.logger.debug "Restaurant changes: #{restaurant.changes}" if restaurant.changed?
          
          restaurant.save if restaurant.new_record? || restaurant.changed?
          Rails.logger.debug "Restaurant after save: #{restaurant.inspect}"
          
          restaurant
        end
      else
        flash.now[:notice] = "No restaurants found near the specified location"
        @restaurants = []
      end
    rescue StandardError => e
      Rails.logger.error("Restaurant Search Error: #{e.message}")
      Rails.logger.error(e.backtrace.join("\n"))
      flash.now[:alert] = "An error occurred while searching for restaurants"
      @restaurants = []
    end

    render :search
  end
end