import type { Plugin } from '#app'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export default defineNuxtPlugin((nuxtApp) => {
  // Make Leaflet available globally
  return {
    provide: {
      leaflet: L
    }
  }
})