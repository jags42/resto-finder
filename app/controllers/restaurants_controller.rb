class RestaurantsController < ApplicationController
  before_action :authenticate_user!

  def search
    Rails.logger.debug "=== Starting Restaurant Search ==="
    
    address = params[:address]
    radius = params[:radius] || 1000
    max_results = params[:max_results] || 20
    cuisine = params[:cuisine]
    sort_by = params[:sort_by]
    show_favorites = params[:show_favorites] == 'true'

    Rails.logger.debug "Search params: address=#{address}, radius=#{radius}, max_results=#{max_results}, cuisine=#{cuisine}, sort_by=#{sort_by}, show_favorites=#{show_favorites}"

    if address.blank?
      respond_to do |format|
        format.html { return render :search }
      end
    end

    places_service = GooglePlacesService.new

    # Step 1: Geocode the address
    location = places_service.geocode_address(address)
    Rails.logger.debug "Geocoded location: #{location.inspect}"

    if location[:error]
      respond_to do |format|
        format.html { return render :search }
      end
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

      if restaurant_attrs_list.any?
        @restaurants = restaurant_attrs_list.map do |attrs|
          restaurant = Restaurant.find_or_initialize_by(place_id: attrs[:place_id])
          attrs[:cuisine] = normalize_cuisine(attrs[:cuisine])
          restaurant.assign_attributes(attrs)
          restaurant.save if restaurant.new_record? || restaurant.changed?
          restaurant
        end

        # Apply filters
        @restaurants = filter_restaurants(@restaurants, cuisine, sort_by, show_favorites)
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

    respond_to do |format|
      format.html
      format.json { render json: @restaurants }
    end
  end

  private

  def normalize_cuisine(cuisine)
    return nil if cuisine.blank?

    normalized = cuisine.downcase
      .gsub('_restaurant', '')
      .gsub('_food', '')
      .gsub('_house', '')
      .split(',')
      .map(&:strip)
      .uniq
      .join(', ')

    normalized
  end

  def filter_restaurants(restaurants, cuisine, sort_by, show_favorites)
    # Filter by cuisine
    if cuisine.present?
      restaurants = restaurants.select { |r| r.cuisine&.downcase&.include?(cuisine.downcase) }
    end

    # Filter favorites
    if show_favorites && current_user
      favorite_restaurant_ids = current_user.favorites.pluck(:restaurant_id)
      restaurants = restaurants.select { |r| favorite_restaurant_ids.include?(r.id) }
    end

    # Sort restaurants
    case sort_by
    when 'rating'
      restaurants = restaurants.sort_by { |r| -r.ratings }
    when 'reviews'
      restaurants = restaurants.sort_by { |r| -r.reviews_count }
    when 'price_asc'
      restaurants = restaurants.sort_by { |r| r.price_level || 0 }
    when 'price_desc'
      restaurants = restaurants.sort_by { |r| -(r.price_level || 0) }
    end

    restaurants
  end
end

