// Import Turbo Rails
import "@hotwired/turbo-rails"
import "controllers"

// Global state
let map;
let markers = new Map();
let activeInfoWindow = null;
let favorites = new Set(JSON.parse(localStorage.getItem('favorites') || '[]'));
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
    markers.set(restaurant.place_id, marker);

    marker.addListener("click", () => {
      showRestaurantDetail(restaurant.place_id);
      highlightListItem(restaurant.place_id);
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

function showRestaurantDetail(placeId) {
  const restaurant = restaurants.find(r => r.place_id === placeId);
  if (!restaurant) return;

  const detailView = document.getElementById('restaurantDetail');
  const detailContent = document.getElementById('restaurantDetailContent');

  if (detailView && detailContent) {
    detailContent.innerHTML = `
      <div class="p-4 space-y-4">
        ${restaurant.photo_url ? 
          `<img src="${restaurant.photo_url}" alt="${restaurant.name}" class="w-full h-64 object-cover rounded-lg">` 
          : ''
        }
        <h1 class="text-2xl font-bold">${restaurant.name}</h1>
        <p class="text-gray-600">${restaurant.address}</p>
        <div class="flex items-center">
          <span class="text-yellow-400 text-lg">${"★".repeat(Math.round(restaurant.ratings))}${"☆".repeat(5 - Math.round(restaurant.ratings))}</span>
          <span class="ml-2 text-gray-600">${restaurant.ratings.toFixed(1)} (${restaurant.reviews_count} reviews)</span>
        </div>
        ${restaurant.price_level ? 
          `<p class="text-gray-600">Price: ${"€".repeat(restaurant.price_level)}</p>` 
          : ''
        }
        ${restaurant.cuisine ? 
          `<p class="text-gray-600">Cuisine: ${restaurant.cuisine}</p>`
          : ''
        }
        <button class="favorite-button p-2 text-gray-400 hover:text-red-500" data-place-id="${restaurant.place_id}">
          <svg class="h-6 w-6" fill="${favorites.has(restaurant.place_id) ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          ${favorites.has(restaurant.place_id) ? 'Remove from Favorites' : 'Add to Favorites'}
        </button>
      </div>
    `;

    detailView.classList.remove('hidden');
    updateFavoriteButtons();
  }
}

function highlightListItem(placeId) {
  const items = document.querySelectorAll('.restaurant-item');
  items.forEach(item => {
    item.classList.remove('bg-gray-100');
    if (item.dataset.placeId === placeId) {
      item.classList.add('bg-gray-100');
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
}

function toggleFavorite(placeId) {
  if (favorites.has(placeId)) {
    favorites.delete(placeId);
  } else {
    favorites.add(placeId);
  }
  localStorage.setItem('favorites', JSON.stringify(Array.from(favorites)));
  updateFavoriteButtons();
}

function updateFavoriteButtons() {
  document.querySelectorAll('.favorite-button').forEach(button => {
    const placeId = button.dataset.placeId;
    const isFavorite = favorites.has(placeId);
    button.querySelector('svg').setAttribute('fill', isFavorite ? 'currentColor' : 'none');
    button.classList.toggle('text-red-500', isFavorite);
    button.classList.toggle('text-gray-400', !isFavorite);
    button.textContent = isFavorite ? 'Remove from Favorites' : 'Add to Favorites';
  });
}

function setupEventListeners() {
  // Back button
  document.getElementById('backToList')?.addEventListener('click', () => {
    document.getElementById('restaurantDetail')?.classList.add('hidden');
  });

  // Restaurant item click
  document.body.addEventListener('click', (e) => {
    const restaurantItem = e.target.closest('.restaurant-item');
    if (restaurantItem && !e.target.closest('.favorite-button')) {
      const placeId = restaurantItem.dataset.placeId;
      showRestaurantDetail(placeId);
      
      const marker = markers.get(placeId);
      if (marker) {
        map.panTo(marker.getPosition());
        map.setZoom(16);
      }
    }
  });

  // Favorite buttons
  document.body.addEventListener('click', (e) => {
    if (e.target.closest('.favorite-button')) {
      e.preventDefault();
      e.stopPropagation();
      const button = e.target.closest('.favorite-button');
      const placeId = button.dataset.placeId;
      toggleFavorite(placeId);
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
    filteredRestaurants = filteredRestaurants.filter(r => favorites.has(r.place_id));
  }

  switch (sortBy) {
    case 'rating':
      filteredRestaurants.sort((a, b) => b.ratings - a.ratings);
      break;
    case 'reviews':
      filteredRestaurants.sort((a, b) => b.reviews_count - a.reviews_count);
      break;
    case 'price_asc':
      filteredRestaurants.sort((a, b) => (a.price_level || 0) - (b.price_level || 0));
      break;
    case 'price_desc':
      filteredRestaurants.sort((a, b) => (b.price_level || 0) - (a.price_level || 0));
      break;
  }

  updateRestaurantList(filteredRestaurants);
  addRestaurantMarkers(filteredRestaurants);
}

function updateRestaurantList(restaurants) {
  const resultsList = document.getElementById('resultsList');
  if (!resultsList) return;

  resultsList.innerHTML = restaurants.map(restaurant => `
    <div class="restaurant-item p-4 hover:bg-gray-50 cursor-pointer" data-place-id="${restaurant.place_id}">
      <div class="flex gap-4">
        ${restaurant.photo_url ? 
          `<img src="${restaurant.photo_url}" alt="${restaurant.name}" class="w-24 h-24 object-cover rounded-lg">` 
          : ''
        }
        <div class="flex-1 min-w-0">
          <h3 class="text-lg font-semibold text-gray-900">${restaurant.name}</h3>
          <p class="text-sm text-gray-500 truncate">${restaurant.address}</p>
          <div class="flex items-center mt-1">
            <div class="flex items-center">
              <span class="text-yellow-400">${"★".repeat(Math.round(restaurant.ratings))}${"☆".repeat(5 - Math.round(restaurant.ratings))}</span>
              <span class="ml-1 text-sm text-gray-600">(${restaurant.reviews_count})</span>
            </div>
            ${restaurant.price_level ? 
              `<span class="ml-2 text-sm text-gray-600">${"€".repeat(restaurant.price_level)}</span>` 
              : ''
            }
          </div>
          ${restaurant.cuisine ? 
            `<div class="mt-1 flex flex-wrap gap-1">
              ${restaurant.cuisine.split(', ').map(cuisine => 
                `<span class="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">${cuisine}</span>`
              ).join('')}
            </div>` 
            : ''
          }
        </div>
        <button class="favorite-button p-2 text-gray-400 hover:text-red-500" data-place-id="${restaurant.place_id}">
          <svg class="h-6 w-6" fill="${favorites.has(restaurant.place_id) ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>
    </div>
  `).join('');

  updateFavoriteButtons();
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  if (typeof google !== 'undefined') {
    initMap();
  }
  setupEventListeners();
  updateFavoriteButtons();
});

