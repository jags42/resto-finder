// Import Turbo Rails
import "@hotwired/turbo-rails"
import "controllers"

// Global state
let map;
let markers = new Map();
let activeInfoWindow = null;
let restaurants = [];
let allCuisines = new Set();

// Initialize map function
window.initMap = function() {
  const defaultLocation = { lat: 14.5995, lng: 120.9842 };

  map = new google.maps.Map(document.getElementById("map"), {
    center: defaultLocation,
    zoom: 12,
    styles: [
      {
        featureType: "poi",
        elementType: "labels",
        stylers: [{ visibility: "off" }],
      },
    ],
  });

  if (restaurants.length > 0) {
    addRestaurantMarkers(restaurants);
  }
  setupEventListeners();
};

// Add markers to the map
function addRestaurantMarkers(restaurants) {
  const bounds = new google.maps.LatLngBounds();
  
  // Clear existing markers
  markers.forEach(marker => marker.setMap(null));
  markers.clear();

  restaurants.forEach((restaurant) => {
    const position = { 
      lat: parseFloat(restaurant.latitude), 
      lng: parseFloat(restaurant.longitude) 
    };

    const marker = new google.maps.Marker({
      position,
      map,
      title: restaurant.name,
      animation: google.maps.Animation.DROP,
    });

    bounds.extend(position);
    markers.set(restaurant.id, marker);

    marker.addListener("click", () => {
      window.location.href = `/restaurants/${restaurant.id}`;
    });
  });

  if (restaurants.length > 0) {
    map.fitBounds(bounds);
    const listener = google.maps.event.addListener(map, "idle", () => {
      if (map.getZoom() > 16) map.setZoom(16);
      google.maps.event.removeListener(listener);
    });
  }
}

function clearMap() {
  markers.forEach(marker => marker.setMap(null));
  markers.clear();
}

function toggleFavorite(button) {
  const restaurantId = button.dataset.restaurantId;

  fetch(`/restaurants/${restaurantId}/toggle_favorite`, {
    method: 'POST',
    headers: {
      'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    credentials: 'same-origin'
  })
  .then(response => response.json())
  .then(data => {
    if (data.error) {
      console.error('Error:', data.error);
      return;
    }
    updateFavoriteButton(button, data.is_favorite);
    updateRestaurantFavoriteStatus(restaurantId, data.is_favorite);
  })
  .catch(error => console.error('Error:', error));
}

function updateFavoriteButton(button, isFavorite) {
  const svg = button.querySelector('svg');
  if (isFavorite) {
    svg.setAttribute('fill', 'currentColor');
    button.classList.add('text-red-500');
    button.classList.remove('text-gray-400');
  } else {
    svg.setAttribute('fill', 'none');
    button.classList.remove('text-red-500');
    button.classList.add('text-gray-400');
  }
}

function updateRestaurantFavoriteStatus(restaurantId, isFavorite) {
  const restaurant = restaurants.find(r => r.id === parseInt(restaurantId));
  if (restaurant) {
    restaurant.is_favorite = isFavorite;
  }
  filterRestaurants(); // Re-apply filters to update the list if necessary
}

function setupEventListeners() {
  // Restaurant item click
  document.body.addEventListener('click', (e) => {
    const restaurantItem = e.target.closest('.restaurant-item');
    if (restaurantItem && !e.target.closest('.favorite-button')) {
      const restaurantId = restaurantItem.dataset.restaurantId;
      window.location.href = `/restaurants/${restaurantId}`;
    }
  });

  // Favorite buttons
  document.body.addEventListener('click', (e) => {
    if (e.target.closest('.favorite-button')) {
      e.preventDefault();
      e.stopPropagation();
      const button = e.target.closest('.favorite-button');
      toggleFavorite(button);
    }
  });

  // Toggle favorites filter
  document.getElementById('toggleFavorites')?.addEventListener('click', () => {
    const checkbox = document.getElementById('show_favorites');
    checkbox.checked = !checkbox.checked;
    filterRestaurants();
  });

  // Form submission
  const form = document.querySelector('form');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const searchParams = new URLSearchParams(formData);
    
    fetch(`${form.action}?${searchParams.toString()}`, {
      headers: {
        'Accept': 'application/json'
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      if (Array.isArray(data)) {
        restaurants = data;
        updateCuisineFilter(restaurants);
        addRestaurantMarkers(restaurants);
        updateRestaurantList(restaurants);
      } else {
        throw new Error(data.error || 'Invalid response from server');
      }
    })
    .catch(error => {
      console.error('Error:', error);
      clearMap();
      // Display error message to the user
      const resultsList = document.getElementById('resultsList');
      if (resultsList) {
        resultsList.innerHTML = `<div class="p-4 text-red-500">Error: ${error.message}</div>`;
      }
    });
  });

  // Cuisine and sort_by select elements
  document.getElementById('cuisine')?.addEventListener('change', filterRestaurants);
  document.getElementById('sort_by')?.addEventListener('change', filterRestaurants);
}

function updateCuisineFilter(restaurants) {
  allCuisines.clear();
  restaurants.forEach(restaurant => {
    if (restaurant.cuisine) {
      restaurant.cuisine.split(', ').forEach(cuisine => allCuisines.add(cuisine.trim()));
    }
  });

  const cuisineSelect = document.getElementById('cuisine');
  const currentValue = cuisineSelect.value;
  
  cuisineSelect.innerHTML = `
    <option value="">All Cuisines</option>
    ${Array.from(allCuisines).sort().map(cuisine => 
      `<option value="${cuisine}" ${cuisine === currentValue ? 'selected' : ''}>${cuisine}</option>`
    ).join('')}
  `;
}

function filterRestaurants() {
  const cuisine = document.getElementById('cuisine').value;
  const sortBy = document.getElementById('sort_by').value;
  const showFavorites = document.getElementById('show_favorites').checked;

  let filteredRestaurants = restaurants;

  if (cuisine) {
    filteredRestaurants = filteredRestaurants.filter(r => r.cuisine && r.cuisine.toLowerCase().includes(cuisine.toLowerCase()));
  }

  if (showFavorites) {
    filteredRestaurants = filteredRestaurants.filter(r => r.is_favorite);
  }

  switch (sortBy) {
    case 'rating':
      filteredRestaurants.sort((a, b) => b.average_rating - a.average_rating);
      break;
    case 'reviews':
      filteredRestaurants.sort((a, b) => (b.reviews_count || 0) - (a.reviews_count || 0));
      break;
    case 'price_asc':
      const priceOrder = ['Free', 'Inexpensive', 'Moderate', 'Expensive', 'Very Expensive'];
      filteredRestaurants.sort((a, b) => priceOrder.indexOf(a.price_level) - priceOrder.indexOf(b.price_level));
      break;
    case 'price_desc':
      const priceOrderDesc = ['Very Expensive', 'Expensive', 'Moderate', 'Inexpensive', 'Free'];
      filteredRestaurants.sort((a, b) => priceOrderDesc.indexOf(a.price_level) - priceOrderDesc.indexOf(b.price_level));
      break;
  }

  updateRestaurantList(filteredRestaurants);
  addRestaurantMarkers(filteredRestaurants);
}

function updateRestaurantList(restaurants) {
  const resultsList = document.getElementById('resultsList');
  if (!resultsList) return;

  // Clear existing restaurant items
  resultsList.innerHTML = '';

  // Create a new container for restaurant items
  const container = document.createElement('div');
  container.className = 'divide-y divide-gray-200';

  restaurants.forEach(restaurant => {
    const restaurantElement = document.createElement('div');
    restaurantElement.className = 'restaurant-item p-6 hover:bg-gray-50 cursor-pointer';
    restaurantElement.dataset.restaurantId = restaurant.id;

    restaurantElement.innerHTML = `
      <div class="flex gap-4">
        ${restaurant.photo_url ? 
          `<img src="${restaurant.photo_url}" alt="${restaurant.name}" class="w-24 h-24 object-cover rounded-lg">` 
          : ''
        }
        <div class="flex-1 min-w-0 space-y-2">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 truncate">${restaurant.name}</h3>
            <button class="favorite-button p-1 text-gray-400 hover:text-red-500" data-restaurant-id="${restaurant.id}" data-favorite="${restaurant.is_favorite}">
              <svg class="h-6 w-6" fill="${restaurant.is_favorite ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>
          <p class="text-sm text-gray-500">${restaurant.address}</p>
          <div class="flex items-center gap-4">
            <div class="flex items-center">
              <span class="text-yellow-400 text-lg">${"★".repeat(Math.round(restaurant.average_rating))}${"☆".repeat(5 - Math.round(restaurant.average_rating))}</span>
              <span class="ml-1 text-sm text-gray-600">(${restaurant.reviews_count || 0})</span>
            </div>
            ${restaurant.price_level ? 
              `<div class="flex items-center">
                <span class="text-gray-400">${"$".repeat(getPriceLevelIndicator(restaurant.price_level))}</span>
                <span class="ml-1 text-xs text-gray-500">${restaurant.price_level}</span>
              </div>`
              : ''
            }
          </div>
          ${restaurant.cuisine ? 
            `<div class="flex flex-wrap gap-1">
              ${restaurant.cuisine.split(', ').map(cuisine => 
                `<span class="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">${cuisine}</span>`
              ).join('')}
            </div>` 
            : ''
          }
        </div>
      </div>
    `;

    container.appendChild(restaurantElement);
  });

  resultsList.appendChild(container);
}

function getPriceLevelIndicator(priceLevel) {
  switch (priceLevel) {
    case "Free": return 0;
    case "Inexpensive": return 1;
    case "Moderate": return 2;
    case "Expensive": return 3;
    case "Very Expensive": return 4;
    default: return 0;
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  if (typeof google !== 'undefined') {
    initMap();
  }
  setupEventListeners();

  // Initialize restaurants array with data from the server
  restaurants = JSON.parse(document.getElementById('restaurants-data').textContent);

  // Update favorite status for each restaurant
  restaurants.forEach(restaurant => {
    const favoriteButton = document.querySelector(`.favorite-button[data-restaurant-id="${restaurant.id}"]`);
    if (favoriteButton) {
      updateFavoriteButton(favoriteButton, restaurant.is_favorite);
    }
  });

  // Initial filtering and display
  filterRestaurants();
});

