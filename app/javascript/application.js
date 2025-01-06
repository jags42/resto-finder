// Import Turbo Rails
import "@hotwired/turbo-rails"
import "controllers"

// Global state
let map;
let markers = new Map();
let activeInfoWindow = null;
let favorites = new Set(JSON.parse(localStorage.getItem('favorites') || '[]'));

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

  if (typeof restaurants !== 'undefined' && restaurants.length > 0) {
    addRestaurantMarkers(restaurants);
    setupEventListeners();
  }
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

function showRestaurantDetail(placeId) {
  const restaurant = restaurants.find(r => r.place_id === placeId);
  if (!restaurant) return;

  const detailView = document.getElementById('restaurantDetail');
  const detailContent = document.getElementById('restaurantDetailContent');

  if (detailView && detailContent) {
    detailContent.innerHTML = `
      <div class="space-y-4">
        ${restaurant.photo_url ? 
          `<div class="relative h-64">
            <img src="${restaurant.photo_url}" alt="${restaurant.name}" class="w-full h-full object-cover">
          </div>` 
          : ''
        }
        <div class="p-4 space-y-4">
          <div class="flex items-center justify-between">
            <h1 class="text-2xl font-bold">${restaurant.name}</h1>
            <button class="favorite-button p-2 ${favorites.has(restaurant.place_id) ? 'text-red-500' : 'text-gray-400'} hover:text-red-500">
              <svg class="h-6 w-6" fill="${favorites.has(restaurant.place_id) ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>
          <div class="flex items-center gap-2">
            <div class="flex items-center">
              <span class="text-yellow-400 text-lg">${"★".repeat(Math.round(restaurant.ratings))}${"☆".repeat(5 - Math.round(restaurant.ratings))}</span>
              <span class="ml-1 text-sm text-gray-600">(${restaurant.reviews_count} reviews)</span>
            </div>
            ${restaurant.price_level ? 
              `<span class="text-sm text-gray-600">• ${"€".repeat(restaurant.price_level)}</span>` 
              : ''
            }
          </div>
          <p class="text-gray-600">${restaurant.address}</p>
          ${restaurant.cuisine ? 
            `<div class="flex flex-wrap gap-2">
              ${restaurant.cuisine.split(',').map(cuisine => 
                `<span class="px-2 py-1 rounded-full bg-gray-100 text-sm text-gray-600">${cuisine.trim()}</span>`
              ).join('')}
            </div>`
            : ''
          }
        </div>
      </div>
    `;

    detailView.classList.remove('hidden');
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
  updateFavoriteButtons(placeId);
}

function updateFavoriteButtons(placeId) {
  const buttons = document.querySelectorAll(`.favorite-button[data-place-id="${placeId}"]`);
  buttons.forEach(button => {
    const isFavorite = favorites.has(placeId);
    button.querySelector('svg').setAttribute('fill', isFavorite ? 'currentColor' : 'none');
    button.classList.toggle('text-red-500', isFavorite);
    button.classList.toggle('text-gray-400', !isFavorite);
  });
}

function setupEventListeners() {
  // Back button
  document.getElementById('backToList')?.addEventListener('click', () => {
    document.getElementById('restaurantDetail')?.classList.add('hidden');
  });

  // Restaurant item click
  document.querySelectorAll('.restaurant-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.favorite-button')) {
        const placeId = item.dataset.placeId;
        showRestaurantDetail(placeId);
        
        const marker = markers.get(placeId);
        if (marker) {
          map.panTo(marker.getPosition());
          map.setZoom(16);
        }
      }
    });
  });

  // Favorite buttons
  document.querySelectorAll('.favorite-button').forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const placeId = button.closest('[data-place-id]').dataset.placeId;
      toggleFavorite(placeId);
    });
  });

  // Toggle favorites filter
  document.getElementById('toggleFavorites')?.addEventListener('click', (e) => {
    e.target.classList.toggle('bg-indigo-100');
    const showOnlyFavorites = e.target.classList.contains('bg-indigo-100');
    
    document.querySelectorAll('.restaurant-item').forEach(item => {
      const placeId = item.dataset.placeId;
      const marker = markers.get(placeId);
      
      if (showOnlyFavorites) {
        item.style.display = favorites.has(placeId) ? 'block' : 'none';
        marker?.setVisible(favorites.has(placeId));
      } else {
        item.style.display = 'block';
        marker?.setVisible(true);
      }
    });
  });
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  if (typeof google !== 'undefined') {
    initMap();
  }
});

