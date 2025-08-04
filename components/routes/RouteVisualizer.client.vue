<!-- RouteVisualizer.client.vue -->
<template>
  <div class="route-visualizer">
    <div ref="mapContainer" class="map-container"></div>
    <div v-if="path.length === 0" class="no-route">
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
import 'leaflet/dist/leaflet.css';
import type { Station } from '~/types/transport';

// Import Leaflet only on client side
const L = process.client ? (await import('leaflet')).default : null;

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
let map: any = null;
let routeLayer: any = null;
let markers: any[] = [];

const initMap = async () => {
  if (!mapContainer.value || !L) return;

  try {
    loading.value = true;

    // Find center of all stations if path exists
    let center: [number, number] = [-1.2921, 36.8219]; // Default to Nairobi
    if (props.path.length > 0) {
      const firstStation = props.stations[props.path[0]];
      if (firstStation) {
        center = [firstStation.coordinates.lat, firstStation.coordinates.lng];
      }
    }

    map = L.map(mapContainer.value, {
      center,
      zoom: 13,
      zoomControl: false,
      attributionControl: false
    });

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18
    }).addTo(map);

    // Add zoom control to top right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Add attribution
    L.control.attribution({ position: 'bottomright' }).addTo(map);

    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    loading.value = false;

    // Draw route after map is loaded
    await nextTick();
    drawRoute();
  } catch (error) {
    console.error('Error initializing map:', error);
    loading.value = false;
  }
};

const drawRoute = () => {
  if (!map || !L) return;

  // Clear existing layers
  if (routeLayer) {
    map.removeLayer(routeLayer);
    routeLayer = null;
  }
  
  markers.forEach(marker => {
    map?.removeLayer(marker);
  });
  markers = [];

  if (props.path.length === 0) return;

  const coordinates: [number, number][] = [];
  const bounds = L.latLngBounds([]);

  props.path.forEach((stationId, index) => {
    const station = props.stations[stationId];
    if (station) {
      const coord: [number, number] = [station.coordinates.lat, station.coordinates.lng];
      coordinates.push(coord);
      bounds.extend(coord);

      // Create custom marker icon
      const isStart = index === 0;
      const isEnd = index === props.path.length - 1;
      const markerColor = isStart ? '#e74c3c' : isEnd ? '#27ae60' : '#3498db';
      const markerText = isStart ? 'S' : isEnd ? 'E' : (index + 1).toString();

      const marker = L.marker(coord, {
        icon: L.divIcon({
          className: 'custom-station-marker',
          html: `
            <div class="marker-inner" style="background-color: ${markerColor}">
              ${markerText}
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        }),
        title: station.name
      }).addTo(map);
      
      // Add popup with station details
      marker.bindPopup(`
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
      `, {
        maxWidth: 250,
        className: 'custom-popup'
      });
      
      markers.push(marker);
    }
  });

  // Draw route line if multiple coordinates
  if (coordinates.length > 1) {
    routeLayer = L.polyline(coordinates, {
      color: '#3498db',
      weight: 4,
      opacity: 0.8,
      dashArray: '10, 5',
      lineJoin: 'round',
      lineCap: 'round'
    }).addTo(map);
    
    // Fit map to show all markers with padding
    map.fitBounds(bounds, { 
      padding: [50, 50],
      maxZoom: 15
    });
  } else if (coordinates.length === 1) {
    map.setView(coordinates[0], 15);
  }
};

onMounted(() => {
  if (process.client) {
    initMap();
  }
});

watch(() => props.path, () => {
  if (!loading.value) {
    drawRoute();
  }
}, { deep: true });

watch(() => props.selectedRoute, () => {
  if (!loading.value) {
    drawRoute();
  }
});
</script>

<style scoped>
.route-visualizer {
  position: relative;
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.map-container {
  height: 100%;
  width: 100%;
  min-height: 500px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  z-index: 1000;
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
  z-index: 1001;
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

/* Global styles for Leaflet markers */
:deep(.custom-station-marker) {
  background: none !important;
  border: none !important;
}

:deep(.marker-inner) {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 14px;
  border: 3px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s ease;
}

:deep(.marker-inner:hover) {
  transform: scale(1.1);
}

:deep(.custom-popup .leaflet-popup-content-wrapper) {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

:deep(.station-popup) {
  min-width: 200px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
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
</style>