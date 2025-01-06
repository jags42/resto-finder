require 'net/http'
require 'json'
require 'uri'

class GooglePlacesService
  BASE_URL = "https://places.googleapis.com/v1".freeze

  def initialize
    @api_key = ENV["GOOGLE_PLACES_API_KEY"]
  end

  def geocode_address(address)
    endpoint = "https://maps.googleapis.com/maps/api/geocode/json"
    query_params = { address: address, key: @api_key }
    headers = { "Content-Type" => "application/json" }
  
    response = get_request(endpoint, headers, query_params)
  
    if response["results"] && response["results"].any?
      location = response["results"].first.dig("geometry", "location")
      { latitude: location["lat"], longitude: location["lng"] }
    else
      { error: "Address not found" }
    end
  end

  def search_restaurants(lat, lng, radius = 1000, max_results = 20)
    endpoint = "#{BASE_URL}/places:searchNearby"
    body = {
      includedTypes: ["restaurant"],
      maxResultCount: max_results,
      locationRestriction: {
        circle: {
          center: {
            latitude: lat,
            longitude: lng
          },
          radius: radius.to_f
        }
      }
    }
  
    request_headers = {
      "Content-Type" => "application/json",
      "X-Goog-Api-Key" => @api_key,
      "X-Goog-FieldMask" => "places.id,places.displayName,places.formattedAddress,places.location,places.photos"
    }
  
    puts "\nMaking API request to: #{endpoint}"
    puts "Request headers: #{request_headers}"
    puts "Request body: #{body}"
    
    response = post_request(endpoint, body, request_headers)
    
    if response["places"] && response["places"].any?
      response["places"].map do |place|
        puts "\nProcessing place: #{place['displayName']&.dig('text')}"
        puts "Place photos: #{place['photos']&.inspect || 'No photos'}"
        
        photo_url = if place["photos"]&.first
          photo_name = place["photos"].first["name"]
          puts "Fetching photo for place_id: #{place['id']}, photo_name: #{photo_name}"
          "#{BASE_URL}/#{photo_name}/media?key=#{@api_key}&maxHeightPx=800"
        end
        
        puts "Generated photo_url: #{photo_url || 'No photo URL generated'}"

        {
          name: place.dig("displayName", "text"),
          address: place["formattedAddress"],
          latitude: place.dig("location", "latitude"),
          longitude: place.dig("location", "longitude"),
          place_id: place["id"],
          photo_url: photo_url,
          photo: photo_url
        }
      end
    else
      puts "\nNo places found in the response"
      []
    end
  end

  
  def fetch_place_photo(place_id, photo_name)
    puts "\n=== Starting photo fetch ==="
    endpoint = "#{BASE_URL}/places/#{place_id}/photos/#{photo_name}/media"
    
    request_headers = {
      "X-Goog-Api-Key" => @api_key
    }

    puts "Photo endpoint: #{endpoint}"
    puts "Photo request headers: #{request_headers}"

    uri = URI(endpoint)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true

    request = Net::HTTP::Get.new(uri)
    request_headers.each { |key, value| request[key] = value }

    response = http.request(request)
    
    puts "Photo response code: #{response.code}"
    puts "Photo response location header: #{response['location']}"
    
    if response.is_a?(Net::HTTPRedirection)
      puts "Received photo redirect URL: #{response['location']}"
      response['location']
    else
      puts "Failed to get photo redirect. Response body: #{response.body}"
      nil
    end
  rescue StandardError => e
    puts "Error fetching photo: #{e.message}"
    nil
  end
  

  private

  def fetch_place_details(place_id)
    endpoint = "#{BASE_URL}/places/#{place_id}"
    
    request_headers = {
      "Content-Type" => "application/json",
      "X-Goog-Api-Key" => @api_key,
      "X-Goog-FieldMask" => "photos"
    }

    get_request(endpoint, request_headers)
  end

  def post_request(endpoint, body, headers)
    uri = URI(endpoint)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true

    request = Net::HTTP::Post.new(uri)
    headers.each { |key, value| request[key] = value }
    request.body = body.to_json

    puts "\nMaking POST request to: #{uri}"
    response = http.request(request)
    puts "Response code: #{response.code}"
    
    parse_response(response)
  end

  def get_request(endpoint, headers, query_params = {})
    uri = URI(endpoint)
    uri.query = URI.encode_www_form(query_params) if query_params.any?

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true

    request = Net::HTTP::Get.new(uri)
    headers.each { |key, value| request[key] = value }

    response = http.request(request)
    parse_response(response)
    end


  def parse_response(response)
    if response.is_a?(Net::HTTPSuccess)
      JSON.parse(response.body)
    else
      puts "API request failed. Response code: #{response.code}"
      puts "Response body: #{response.body}"
      { "error" => "API request failed with code #{response.code}: #{response.body}" }
    end
  end

  def map_price_level(price_level)
    case price_level
    when 0 then 1
    when 1 then 2
    when 2 then 3
    when 3 then 4
    when 4 then 5
    else nil
    end
  end
end