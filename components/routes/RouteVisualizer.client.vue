<!-- RouteVisualizer.client.vue -->
<template>
  <div class="route-visualizer">
    <div ref="mapContainer" class="map-container"></div>
    <div v-if="path.length === 0 && !loading" class="no-route">
      <div class="no-route-content">
        <svg class="no-route-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="10" r="3" />
          <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z" />
        </svg>
        <p>No route to display</p>
        <span class="sub-text">Select start and end stations to see the route</span>
      </div>
    </div>
    <div v-if="loading" class="loading-overlay">
      <div class="loading-content">
        <div class="spinner"></div>
        <p>Loading map...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import type { Station } from '~/types/transport';

const props = defineProps({
  path: {
    type: Array as () => string[],
    required: true
  },
  stations: {
    type: Object as () => Record<string, Station>,
    required: true
  },
  selectedRoute: {
    type: Object as () => any,
    default: null
  }
});

const mapContainer = ref<HTMLElement | null>(null);
const loading = ref(true);

let map: google.maps.Map | null = null;
let directionsService: google.maps.DirectionsService | null = null;
let directionsRenderer: google.maps.DirectionsRenderer | null = null;
let markers: google.maps.Marker[] = [];
let polyline: google.maps.Polyline | null = null;

const GOOGLE_MAPS_API_KEY = 'AIzaSyBux3LWgjt4Y2pz0vOoF0TBz4K49BWfzlY';

const loadGoogleMapsScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      resolve();
      return;
    }

    // Check if script is already being loaded
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      // Wait for it to load
      const checkLoaded = () => {
        if (window.google && window.google.maps) {
          resolve();
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      checkLoaded();
      return;
    }

    // Create and load the script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      if (window.google && window.google.maps) {
        resolve();
      } else {
        reject(new Error('Google Maps failed to load'));
      }
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load Google Maps script'));
    };

    document.head.appendChild(script);
  });
};

const initMap = async () => {
  if (!mapContainer.value) {
    console.error('Map container not available');
    loading.value = false;
    return;
  }

  try {
    loading.value = true;

    // Load Google Maps
    await loadGoogleMapsScript();

    let center = { lat: -1.2921, lng: 36.8219 }; // Default to Nairobi
    if (props.path.length > 0) {
      const firstStation = props.stations[props.path[0]];
      if (firstStation) {
        center = {
          lat: firstStation.coordinates.lat,
          lng: firstStation.coordinates.lng
        };
      }
    }

    // Create map instance
    map = new google.maps.Map(mapContainer.value, {
      center,
      zoom: 13,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      zoomControl: true,
      mapTypeControl: false,
      scaleControl: true,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: true,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    // Initialize directions service and renderer
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
      suppressMarkers: true, // We'll create custom markers
      polylineOptions: {
        strokeColor: '#3498db',
        strokeWeight: 4,
        strokeOpacity: 0.8
      }
    });

    directionsRenderer.setMap(map);

    // Initial render
    drawRoute();

    loading.value = false;
  } catch (error) {
    console.error('Error initializing map:', error);
    loading.value = false;
  }
};

const createCustomMarker = (
  position: google.maps.LatLngLiteral,
  title: string,
  isStart: boolean,
  isEnd: boolean,
  index: number,
  station: Station
): google.maps.Marker => {
  const markerColor = isStart ? '#e74c3c' : isEnd ? '#27ae60' : '#3498db';
  const markerText = isStart ? 'S' : isEnd ? 'E' : (index + 1).toString();
  
  // Create custom marker icon
  const markerIcon = {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="${markerColor}" stroke="white" stroke-width="3"/>
        <text x="16" y="21" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="bold">${markerText}</text>
      </svg>
    `)}`,
    scaledSize: new google.maps.Size(32, 32),
    anchor: new google.maps.Point(16, 16)
  };

  const marker = new google.maps.Marker({
    position,
    map,
    title,
    icon: markerIcon,
    animation: google.maps.Animation.DROP
  });

  // Create info window
  const infoWindow = new google.maps.InfoWindow({
    content: `
      <div class="station-popup">
        <h4>${station.name}</h4>
        <div class="popup-details">
          <p><strong>Capacity:</strong> ${station.capacity} vehicles</p>
          ${station.operatingHours ? `
            <p><strong>Hours:</strong> ${station.operatingHours.open} - ${station.operatingHours.close}</p>
          ` : ''}
          <p><strong>Position:</strong> ${isStart ? 'Start' : isEnd ? 'End' : `Stop ${index + 1}`}</p>
        </div>
      </div>
    `,
    maxWidth: 250
  });

  marker.addListener('click', () => {
    infoWindow.open(map, marker);
  });

  return marker;
};

const drawRoute = () => {
  if (!map) return;

  // Clear existing markers and polyline
  markers.forEach(marker => {
    marker.setMap(null);
  });
  markers = [];

  if (polyline) {
    polyline.setMap(null);
    polyline = null;
  }

  if (props.path.length === 0) {
    return;
  }

  const coordinates: google.maps.LatLngLiteral[] = [];
  const bounds = new google.maps.LatLngBounds();

  // Create markers and collect coordinates
  props.path.forEach((stationId, index) => {
    const station = props.stations[stationId];
    if (station) {
      const position = {
        lat: station.coordinates.lat,
        lng: station.coordinates.lng
      };
      
      coordinates.push(position);
      bounds.extend(position);

      const isStart = index === 0;
      const isEnd = index === props.path.length - 1;

      const marker = createCustomMarker(
        position,
        station.name,
        isStart,
        isEnd,
        index,
        station
      );
      
      markers.push(marker);
    }
  });

  // Draw route line if we have multiple points
  if (coordinates.length > 1) {
    polyline = new google.maps.Polyline({
      path: coordinates,
      geodesic: true,
      strokeColor: '#3498db',
      strokeOpacity: 0.8,
      strokeWeight: 4,
      icons: [
        {
          icon: {
            path: 'M 0,-1 0,1',
            strokeOpacity: 1,
            scale: 4
          },
          offset: '0',
          repeat: '20px'
        }
      ]
    });

    polyline.setMap(map);

    // Fit bounds to show all markers
    map.fitBounds(bounds, {
      top: 50,
      right: 50,
      bottom: 50,
      left: 50
    });

    // Ensure minimum zoom level
    const listener = google.maps.event.addListener(map, 'bounds_changed', () => {
      if (map && map.getZoom() && map.getZoom()! > 15) {
        map.setZoom(15);
      }
      google.maps.event.removeListener(listener);
    });
  } else if (coordinates.length === 1) {
    map.setCenter(coordinates[0]);
    map.setZoom(15);
  }
};

onMounted(() => {
  if (process.client) {
    nextTick(() => {
      initMap();
    });
  }
});

watch(() => props.path, () => {
  if (!loading.value) {
    nextTick(() => {
      drawRoute();
    });
  }
}, { deep: true });

watch(() => props.selectedRoute, () => {
  if (!loading.value) {
    nextTick(() => {
      drawRoute();
    });
  }
});

// Type declaration for Google Maps
declare global {
  interface Window {
    google: any;
  }
}
</script>

<style scoped>
.route-visualizer {
  position: relative;
  height: 100%;
  width: 100%;
  min-height: 500px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.map-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
}

.no-route {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  z-index: 10;
}

.no-route-content {
  text-align: center;
  color: #7f8c8d;
  padding: 2rem;
}

.no-route-icon {
  width: 80px;
  height: 80px;
  opacity: 0.6;
  margin-bottom: 1rem;
  color: #95a5a6;
}

.no-route-content p {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #2c3e50;
}

.sub-text {
  font-size: 0.875rem;
  color: #7f8c8d;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.9);
  z-index: 100;
}

.loading-content {
  text-align: center;
  color: #3498db;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e3f2fd;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Google Maps specific styles */
:deep(.gm-style-iw-c) {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

:deep(.station-popup) {
  min-width: 200px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  padding: 0.5rem;
}

:deep(.station-popup h4) {
  margin: 0 0 0.75rem 0;
  color: #2c3e50;
  font-size: 1.1rem;
  font-weight: 600;
  border-bottom: 1px solid #ecf0f1;
  padding-bottom: 0.5rem;
}

:deep(.popup-details p) {
  margin: 0.5rem 0;
  font-size: 0.875rem;
  color: #34495e;
}

:deep(.popup-details strong) {
  color: #2c3e50;
}

/* Hide Google Maps controls we don't want */
:deep(.gm-style .gm-style-cc) {
  display: none;
}

:deep(.gm-style .gm-style-mtc) {
  display: none;
}
</style>