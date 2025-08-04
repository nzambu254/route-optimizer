import type L from 'leaflet'

export default function useLeaflet() {
  const initMap = (container: HTMLElement, coords: [number, number], zoom: number): L.Map | null => {
    if (process.client) {
      const L = require('leaflet') as typeof import('leaflet')
      return L.map(container).setView(coords, zoom)
    }
    return null
  }

  const addTileLayer = (map: L.Map): void => {
    if (process.client) {
      const L = require('leaflet') as typeof import('leaflet')
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map)
    }
  }

  // Add other Leaflet methods you need
  return {
    initMap,
    addTileLayer
  }
}