<template>
  <div class="route-visualizer">
    <div ref="mapContainer" class="map-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { Station } from '~/types/transport'

const props = defineProps({
  path: {
    type: Array as () => string[],
    required: true
  },
  stations: {
    type: Object as () => Record<string, Station>,
    required: true
  }
})

const { initMap, addTileLayer } = useLeaflet()
const mapContainer = ref<HTMLElement | null>(null)
let map: any = null
let routeLayer: any = null
let markers: any[] = []

const drawRoute = () => {
  if (!process.client) return
  
  // Clear previous layers
  if (routeLayer) {
    map?.removeLayer(routeLayer)
    routeLayer = null
  }
  
  markers.forEach(marker => {
    map?.removeLayer(marker)
  })
  markers = []

  if (!props.path.length || !map) return

  const coordinates: [number, number][] = []
  
  props.path.forEach(stationId => {
    const station = props.stations[stationId]
    if (station) {
      const coord: [number, number] = [station.coordinates.lat, station.coordinates.lng]
      coordinates.push(coord)
      
      const L = require('leaflet') as typeof import('leaflet')
      const marker = L.marker(coord, {
        title: station.name
      }).addTo(map)
      
      marker.bindPopup(`<b>${station.name}</b><br>Capacity: ${station.capacity}`)
      markers.push(marker)
    }
  })

  if (coordinates.length > 1) {
    const L = require('leaflet') as typeof import('leaflet')
    routeLayer = L.polyline(coordinates, {
      color: '#3498db',
      weight: 5,
      opacity: 0.7,
      dashArray: '10, 10'
    }).addTo(map)
    
    map.fitBounds(routeLayer.getBounds(), { padding: [50, 50] })
  }
}

onMounted(async () => {
  if (process.client) {
    await import('leaflet/dist/leaflet.css')
    if (mapContainer.value) {
      map = initMap(mapContainer.value, [-1.286389, 36.817223], 13)
      if (map) {
        addTileLayer(map)
        drawRoute()
      }
    }
  }
})

watch(() => props.path, () => {
  if (process.client) {
    drawRoute()
  }
}, { deep: true })
</script>

<style scoped>
.map-container {
  height: 500px;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
}
</style>