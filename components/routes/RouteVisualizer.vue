<template>
  <div class="route-visualizer">
    <div ref="mapContainer" class="map-container"></div>
    <div v-if="path.length === 0" class="no-route">
      <div class="no-route-content">
        <img src="@/assets/images/no-route.svg" alt="No route to display">
        <p>No route to display</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Station } from '~/types/transport';

const props = defineProps({
  path: {
    type: Array as () => string[],
    required: true
  },
  stations: {
    type: Object as () => Record<string, Station>,
    required: true
  }
});

const mapContainer = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
let routeLayer: L.Polyline | null = null;
let markers: L.Marker[] = [];

const initMap = () => {
  if (!mapContainer.value) return;

  // Find center of all stations if path exists
  let center: L.LatLngExpression = [0, 0];
  if (props.path.length > 0) {
    const firstStation = props.stations[props.path[0]];
    if (firstStation) {
      center = [firstStation.coordinates.lat, firstStation.coordinates.lng];
    }
  }

  map = L.map(mapContainer.value, {
    center,
    zoom: 13,
    zoomControl: false
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  L.control.zoom({ position: 'topright' }).addTo(map);
};

const drawRoute = () => {
  // Clear existing layers
  if (routeLayer) {
    map?.removeLayer(routeLayer);
    routeLayer = null;
  }
  
  markers.forEach(marker => {
    map?.removeLayer(marker);
  });
  markers = [];

  if (props.path.length === 0 || !map) return;

  const coordinates: L.LatLngExpression[] = [];
  const bounds = L.latLngBounds([]);

  props.path.forEach(stationId => {
    const station = props.stations[stationId];
    if (station) {
      const coord: L.LatLngExpression = [station.coordinates.lat, station.coordinates.lng];
      coordinates.push(coord);
      bounds.extend(coord);

      const marker = L.marker(coord, {
        icon: L.divIcon({
          className: 'station-marker',
          html: `<div class="marker-inner">${station.name.charAt(0)}</div>`,
          iconSize: [30, 30]
        }),
        title: station.name
      }).addTo(map!);
      
      marker.bindPopup(`
        <div class="station-popup">
          <h4>${station.name}</h4>
          <p>Capacity: ${station.capacity}</p>
          ${station.operatingHours ? `
            <p>Hours: ${station.operatingHours.open} - ${station.operatingHours.close}</p>
          ` : ''}
        </div>
      `);
      
      markers.push(marker);
    }
  });

  if (coordinates.length > 1) {
    routeLayer = L.polyline(coordinates, {
      color: '#3498db',
      weight: 5,
      opacity: 0.7,
      dashArray: '5, 5',
      lineJoin: 'round'
    }).addTo(map!);
    
    map.fitBounds(bounds, { padding: [50, 50] });
  } else if (coordinates.length === 1) {
    map.setView(coordinates[0], 15);
  }
};

onMounted(() => {
  initMap();
  drawRoute();
});

watch(() => props.path, () => {
  drawRoute();
}, { deep: true });
</script>

<style scoped>
.map-container {
  height: 100%;
  width: 100%;
  min-height: 500px;
  background-color: #f5f5f5;
}

.route-visualizer {
  position: relative;
  height: 100%;
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
  background-color: rgba(255, 255, 255, 0.8);
  z-index: 1000;
}

.no-route-content {
  text-align: center;
  color: #7f8c8d;
}

.no-route-content img {
  width: 100px;
  opacity: 0.6;
  margin-bottom: 10px;
}

:deep(.station-marker) {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #3498db;
  color: white;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

:deep(.station-popup) {
  min-width: 200px;
}

:deep(.station-popup h4) {
  margin: 0 0 8px 0;
  color: #2c3e50;
}

:deep(.station-popup p) {
  margin: 4px 0;
  font-size: 13px;
  color: #7f8c8d;
}
</style>