<template>
  <div class="route-optimizer">
    <div class="header">
      <div class="header-left">
        <h1>
          <svg class="header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
          </svg>
          Route Optimizer
        </h1>
        <p class="header-subtitle">Find optimal routes with real-time optimization</p>
      </div>
      <div class="header-actions">
        <button @click="refreshGraph" :disabled="loading" class="refresh-btn">
          <svg class="btn-icon" :class="{ 'animate-spin': loading }" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
          </svg>
          <span v-if="loading">Loading...</span>
          <span v-else>Refresh Data</span>
        </button>
        <div class="last-updated" v-if="lastUpdated">
          <svg class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
          Last updated: {{ formatDate(lastUpdated) }}
        </div>
      </div>
    </div>

    <div v-if="error" class="error-message">
      <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
      {{ error }}
    </div>

    <div class="content">
      <div class="controls">
        <div class="controls-header">
          <h2>Route Configuration</h2>
          <div class="database-status" :class="{ 'loading': loading, 'ready': !loading && !error }">
            <div class="status-indicator"></div>
            <span v-if="loading">Loading Database...</span>
            <span v-else-if="error">Database Error</span>
            <span v-else>Database Ready</span>
          </div>
        </div>

        <div class="station-selectors">
          <div class="select-group">
            <label>
              <svg class="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="10" r="3"/>
                <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"/>
              </svg>
              Start Station:
            </label>
            <select v-model="startStationId" :disabled="loading">
              <option value="">Select start station</option>
              <option 
                v-for="station in stations" 
                :key="station.id" 
                :value="station.id"
                :disabled="endStationId === station.id"
              >
                {{ station.name }} (Capacity: {{ station.capacity }})
              </option>
            </select>
          </div>

          <div class="select-group">
            <label>
              <svg class="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              End Station:
            </label>
            <select v-model="endStationId" :disabled="loading">
              <option value="">Select end station</option>
              <option 
                v-for="station in stations" 
                :key="station.id" 
                :value="station.id"
                :disabled="startStationId === station.id"
              >
                {{ station.name }} (Capacity: {{ station.capacity }})
              </option>
            </select>
          </div>
        </div>

        <div class="advanced-options">
          <div class="options-grid">
            <div class="option-group">
              <label>
                <svg class="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Vehicle Capacity:
              </label>
              <input 
                type="number" 
                v-model="vehicleCapacity" 
                :disabled="loading"
                min="1"
                max="500"
                placeholder="Enter capacity"
                class="capacity-input"
              />
            </div>

            <div class="option-group checkbox-group">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="considerTime" 
                  :disabled="loading"
                  class="checkbox-input"
                />
                <div class="checkbox-custom">
                  <svg class="checkbox-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <polyline points="20,6 9,17 4,12"/>
                  </svg>
                </div>
                <span class="checkbox-text">
                  <svg class="option-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12,6 12,12 16,14"/>
                  </svg>
                  Consider current time for station availability
                </span>
              </label>
            </div>

            <div class="option-group checkbox-group">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="useAStar" 
                  :disabled="loading"
                  class="checkbox-input"
                />
                <div class="checkbox-custom">
                  <svg class="checkbox-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <polyline points="20,6 9,17 4,12"/>
                  </svg>
                </div>
                <span class="checkbox-text">
                  <svg class="option-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                  Use A* algorithm (faster optimization)
                </span>
              </label>
            </div>
          </div>

          <button 
            @click="findRoute" 
            :disabled="!startStationId || !endStationId || loading || calculating"
            class="find-route-btn"
          >
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M3 11l19-9-9 19-2-8-8-2z"/>
            </svg>
            <span v-if="calculating">Calculating Optimal Route...</span>
            <span v-else>Find Optimal Route</span>
          </button>
        </div>
      </div>

      <div class="results-container">
        <div v-if="optimalRoute" class="results">
          <div class="map-view">
            <ClientOnly>
              <RouteVisualizer 
                :path="displayRoute.path" 
                :stations="stationsMap" 
                :selected-route="displayRoute"
                :key="visualizerKey"
                class="visualizer"
              />
            </ClientOnly>
          </div>

          <div class="route-details">
            <div class="route-summary">
              <div class="summary-header">
                <h3>
                  <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M3 11l19-9-9 19-2-8-8-2z"/>
                  </svg>
                  Optimal Route
                </h3>
                <div class="route-badge" v-if="selectedAlternative === null">
                  Primary
                </div>
                <div class="route-badge alternative" v-else>
                  Alternative {{ selectedAlternative + 1 }}
                </div>
              </div>
              
              <div class="path-details">
                <div class="metrics-grid">
                  <div class="metric-card">
                    <div class="metric-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M9 11H1l6-6 6 6"/>
                        <path d="M9 17l3 3 3-3"/>
                        <path d="M22 18h-7"/>
                        <path d="M22 6h-7"/>
                      </svg>
                    </div>
                    <div class="metric-content">
                      <span class="metric-label">Total Distance</span>
                      <span class="metric-value">
                        {{ displayRoute.totalDistance?.toFixed(2) || 'N/A' }} km
                      </span>
                    </div>
                  </div>

                  <div class="metric-card">
                    <div class="metric-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12,6 12,12 16,14"/>
                      </svg>
                    </div>
                    <div class="metric-content">
                      <span class="metric-label">Total Time</span>
                      <span class="metric-value">
                        {{ displayRoute.totalTime?.toFixed(0) || 'N/A' }} min
                      </span>
                    </div>
                  </div>

                  <div class="metric-card">
                    <div class="metric-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                    </div>
                    <div class="metric-content">
                      <span class="metric-label">Vehicle Capacity</span>
                      <span class="metric-value">
                        {{ vehicleCapacity || 'N/A' }}
                      </span>
                    </div>
                  </div>

                  <div class="metric-card">
                    <div class="metric-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
                      </svg>
                    </div>
                    <div class="metric-content">
                      <span class="metric-label">Efficiency</span>
                      <span class="metric-value">
                        {{ ((displayRoute.efficiency || 0.85) * 100).toFixed(0) }}%
                      </span>
                    </div>
                  </div>
                </div>

                <div class="path-stations">
                  <h4 class="stations-header">
                    <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                      <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                      <line x1="12" y1="22.08" x2="12" y2="12"/>
                    </svg>
                    Route Stations ({{ displayRoute.path.length }})
                  </h4>
                  
                  <div class="stations-list">
                    <div 
                      v-for="(stationId, index) in displayRoute.path" 
                      :key="stationId" 
                      class="station-item"
                      :class="{ 
                        'start': index === 0, 
                        'end': index === displayRoute.path.length - 1 
                      }"
                    >
                      <div class="station-marker">
                        <span v-if="index === 0">S</span>
                        <span v-else-if="index === displayRoute.path.length - 1">E</span>
                        <span v-else>{{ index + 1 }}</span>
                      </div>
                      
                      <div class="station-info">
                        <div class="station-name">
                          {{ stationsMap[stationId]?.name || stationId }}
                        </div>
                        <div class="station-details">
                          <span class="detail-item">
                            <svg class="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                              <circle cx="9" cy="7" r="4"/>
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                            {{ stationsMap[stationId]?.capacity || 'N/A' }} capacity
                          </span>
                          <span 
                            v-if="stationsMap[stationId]?.operatingHours" 
                            class="detail-item"
                          >
                            <svg class="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <circle cx="12" cy="12" r="10"/>
                              <polyline points="12,6 12,12 16,14"/>
                            </svg>
                            {{ stationsMap[stationId]?.operatingHours.open }} - 
                            {{ stationsMap[stationId]?.operatingHours.close }}
                          </span>
                        </div>
                      </div>

                      <div 
                        v-if="index < displayRoute.path.length - 1" 
                        class="route-connector"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <line x1="12" y1="5" x2="12" y2="19"/>
                          <polyline points="19,12 12,19 5,12"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="alternativeRoutes.length" class="alternatives">
              <div class="alternatives-header">
                <h3>
                  <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M8 3L4 7l4 4"/>
                    <path d="M04 7h16"/>
                    <path d="M16 21l4-4-4-4"/>
                    <path d="M20 17H4"/>
                  </svg>
                  Alternative Routes
                </h3>
                <span class="alternatives-count">{{ alternativeRoutes.length }} options</span>
              </div>
              
              <div class="alternative-options">
                <div 
                  v-for="(route, index) in alternativeRoutes" 
                  :key="index"
                  class="option-card"
                  :class="{ 'selected': selectedAlternative === index }"
                  @click="selectAlternative(index)"
                >
                  <div class="option-header">
                    <div class="option-title">
                      <svg class="option-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M3 11l19-9-9 19-2-8-8-2z"/>
                      </svg>
                      Route Option {{ index + 1 }}
                    </div>
                    <div class="option-badges">
                      <span class="efficiency-badge" :class="getEfficiencyClass(route.efficiency)">
                        {{ ((route.efficiency || 0.75) * 100).toFixed(0) }}% efficient
                      </span>
                    </div>
                  </div>
                  
                  <div class="option-metrics">
                    <div class="option-metric">
                      <svg class="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M9 11H1l6-6 6 6"/>
                        <path d="M9 17l3 3 3-3"/>
                      </svg>
                      <span class="metric-label">Distance</span>
                      <span class="metric-value">{{ route.distance?.toFixed(1) || 'N/A' }} km</span>
                    </div>
                    
                    <div class="option-metric">
                      <svg class="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12,6 12,12 16,14"/>
                      </svg>
                      <span class="metric-label">Time</span>
                      <span class="metric-value">{{ route.time?.toFixed(0) || 'N/A' }} min</span>
                    </div>
                    
                    <div class="option-metric">
                      <svg class="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                      </svg>
                      <span class="metric-label">Stations</span>
                      <span class="metric-value">{{ route.path.length }}</span>
                    </div>
                  </div>
                  
                  <div class="option-actions">
                    <button 
                      class="select-route-btn"
                      :class="{ 'selected': selectedAlternative === index }"
                      @click.stop="selectAlternative(index)"
                    >
                      <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="20,6 9,17 4,12"/>
                      </svg>
                      <span v-if="selectedAlternative === index">Selected</span>
                      <span v-else>Select Route</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <div class="empty-content">
            <div class="placeholder-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="10" r="3" />
                <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z" />
              </svg>
            </div>
            <h3>No Route Selected</h3>
            <p>Configure your route parameters and click "Find Optimal Route" to get started</p>
            <div class="empty-actions">
              <button 
                @click="loadSampleRoute" 
                class="sample-btn"
                :disabled="loading"
              >
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
                Load Sample Route
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { format } from 'date-fns';
import type { Station } from '~/types/transport';
import useRouteOptimization from '~/composables/useRouteOptimization';
import RouteVisualizer from "~/components/routes/RouteVisualizer.client.vue";

// Mock data for demonstration
const mockStations = [
  {
    id: 'station-1',
    name: 'Central Station',
    coordinates: { lat: -1.2921, lng: 36.8219 },
    capacity: 150,
    operatingHours: { open: '06:00', close: '22:00' }
  },
  {
    id: 'station-2',
    name: 'East Park Terminal',
    coordinates: { lat: -1.2841, lng: 36.8341 },
    capacity: 120,
    operatingHours: { open: '05:30', close: '23:00' }
  },
  {
    id: 'station-3',
    name: 'West Gate Hub',
    coordinates: { lat: -1.3021, lng: 36.8119 },
    capacity: 200,
    operatingHours: { open: '06:30', close: '21:30' }
  },
  {
    id: 'station-4',
    name: 'North Point',
    coordinates: { lat: -1.2721, lng: 36.8219 },
    capacity: 80,
    operatingHours: { open: '07:00', close: '20:00' }
  },
  {
    id: 'station-5',
    name: 'South Junction',
    coordinates: { lat: -1.3121, lng: 36.8219 },
    capacity: 100,
    operatingHours: { open: '06:00', close: '22:30' }
  }
];

const mockAlternativeRoutes = [
  {
    path: ['station-1', 'station-2', 'station-3'],
    distance: 15.2,
    time: 28,
    efficiency: 0.85,
    totalDistance: 15.2,
    totalTime: 28
  },
  {
    path: ['station-1', 'station-4', 'station-3'],
    distance: 18.7,
    time: 35,
    efficiency: 0.78,
    totalDistance: 18.7,
    totalTime: 35
  },
  {
    path: ['station-1', 'station-5', 'station-2', 'station-3'],
    distance: 22.1,
    time: 42,
    efficiency: 0.72,
    totalDistance: 22.1,
    totalTime: 42
  }
];

const {
  graph,
  loading,
  error,
  lastUpdated,
  initializeGraph,
  findOptimalRoute,
  findAlternativeRoutes,
  getStation
} = useRouteOptimization();

const stations = ref<Station[]>(mockStations);
const stationsMap = computed(() => {
  const map: Record<string, Station> = {};
  stations.value.forEach(station => {
    map[station.id] = station;
  });
  return map;
});

const startStationId = ref<string>('');
const endStationId = ref<string>('');
const vehicleCapacity = ref<number>(50);
const considerTime = ref(false);
const useAStar = ref(true);
const calculating = ref(false);

const optimalRoute = ref<{
  path: string[];
  totalDistance?: number;
  totalTime?: number;
  efficiency?: number;
} | null>(null);

const alternativeRoutes = ref<Array<{
  path: string[];
  distance?: number;
  time?: number;
  efficiency?: number;
  totalDistance?: number;
  totalTime?: number;
}>>([]);

const selectedAlternative = ref<number | null>(null);
const visualizerKey = ref(0);

const displayRoute = computed(() => {
  if (selectedAlternative.value !== null) {
    return alternativeRoutes.value[selectedAlternative.value];
  }
  return optimalRoute.value || { path: [] };
});

const formatDate = (date: Date) => {
  return format(date, 'MMM dd, yyyy HH:mm');
};

const getEfficiencyClass = (efficiency: number = 0.75) => {
  if (efficiency >= 0.85) return 'excellent';
  if (efficiency >= 0.75) return 'good';
  if (efficiency >= 0.65) return 'fair';
  return 'poor';
};

const refreshGraph = async () => {
  try {
    // Simulate API calls
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Reset form
    startStationId.value = '';
    endStationId.value = '';
    vehicleCapacity.value = 50;
    
    // Clear results
    optimalRoute.value = null;
    alternativeRoutes.value = [];
    selectedAlternative.value = null;
    visualizerKey.value++;
    
    // Update last updated time
    lastUpdated.value = new Date();
  } catch (err) {
    console.error('Error refreshing graph:', err);
    error.value = 'Failed to refresh data';
  }
};

const findRoute = async () => {
  if (!startStationId.value || !endStationId.value) return;
  
  try {
    calculating.value = true;
    error.value = null;
    
    // Simulate route calculation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate mock optimal route
    const samplePath = [startStationId.value];
    
    // Add intermediate stations if different start/end
    if (startStationId.value !== endStationId.value) {
      const availableStations = stations.value.filter(s => 
        s.id !== startStationId.value && s.id !== endStationId.value
      );
      
      if (availableStations.length > 0) {
        samplePath.push(availableStations[0].id);
      }
    }
    
    samplePath.push(endStationId.value);
    
    optimalRoute.value = {
      path: samplePath,
      totalDistance: 12.5 + Math.random() * 10,
      totalTime: 20 + Math.random() * 15,
      efficiency: 0.82 + Math.random() * 0.15
    };
    
    // Generate alternative routes
    alternativeRoutes.value = mockAlternativeRoutes.map(route => ({
      ...route,
      path: [startStationId.value, ...route.path.slice(1, -1), endStationId.value]
    })).filter(route => 
      route.path[0] === startStationId.value && 
      route.path[route.path.length - 1] === endStationId.value
    );
    
    selectedAlternative.value = null;
    visualizerKey.value++;
    
  } catch (err) {
    console.error('Error finding route:', err);
    error.value = 'Failed to calculate route';
  } finally {
    calculating.value = false;
  }
};

const selectAlternative = (index: number) => {
  if (selectedAlternative.value === index) {
    selectedAlternative.value = null;
  } else {
    selectedAlternative.value = index;
  }
  visualizerKey.value++;
};

const loadSampleRoute = () => {
  if (stations.value.length >= 2) {
    startStationId.value = stations.value[0].id;
    endStationId.value = stations.value[2]?.id || stations.value[1].id;
    vehicleCapacity.value = 75;
    considerTime.value = true;
    
    setTimeout(() => {
      findRoute();
    }, 500);
  }
};

onMounted(async () => {
  await refreshGraph();
});
</script>

<style scoped>
.route-optimizer {
  max-width: 1600px;
  margin: 0 auto;
  padding: 1.5rem;
  font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.header-left h1 {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: #1a202c;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-icon {
  width: 2rem;
  height: 2rem;
  color: #3182ce;
}

.header-subtitle {
  margin: 0.5rem 0 0 0;
  color: #718096;
  font-size: 0.875rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-direction: column;
  align-items: flex-end;
}

.refresh-btn {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.refresh-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.refresh-btn:disabled {
  background: #a0aec0;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-icon {
  width: 1rem;
  height: 1rem;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.last-updated {
  font-size: 0.75rem;
  color: #718096;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.status-icon {
  width: 0.875rem;
  height: 0.875rem;
}

.error-message {
  padding: 1rem;
  background: #fed7d7;
  color: #c53030;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  border: 1px solid #feb2b2;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.error-icon {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.controls {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.controls-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.controls-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #2d3748;
}

.database-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #68d391;
}

.database-status.loading .status-indicator {
  background: #fbb040;
  animation: pulse 2s infinite;
}

.database-status.loading {
  color: #d69e2e;
}

.database-status.ready {
  color: #38a169;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.station-selectors {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.select-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.select-group label {
  font-weight: 500;
  font-size: 0.875rem;
  color: #4a5568;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.label-icon {
  width: 1rem;
  height: 1rem;
}

select {
  padding: 0.75rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  transition: border-color 0.2s ease;
}

select:focus {
  outline: none;
  border-color: #3182ce;
  box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
}

select:disabled {
  background: #f7fafc;
  color: #a0aec0;
}

.advanced-options {
  border-top: 1px solid #e2e8f0;
  padding-top: 1.5rem;
}

.options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.capacity-input {
  padding: 0.75rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.875rem;
  transition: border-color 0.2s ease;
}

.capacity-input:focus {
  outline: none;
  border-color: #3182ce;
  box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
}

.checkbox-group {
  margin-top: 1.5rem;
}

.checkbox-label {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
  color: #4a5568;
  padding: 0.75rem;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.checkbox-label:hover {
  background: #f7fafc;
}

.checkbox-input {
  display: none;
}

.checkbox-custom {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid #e2e8f0;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.checkbox-input:checked + .checkbox-custom {
  background: #3182ce;
  border-color: #3182ce;
}

.checkbox-icon {
  width: 0.75rem;
  height: 0.75rem;
  color: white;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.checkbox-input:checked + .checkbox-custom .checkbox-icon {
  opacity: 1;
}

.checkbox-text {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.option-icon {
  width: 1rem;
  height: 1rem;
  color: #718096;
}

.find-route-btn {
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin: 0 auto;
  min-width: 250px;
}

.find-route-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(72, 187, 120, 0.4);
}

.find-route-btn:disabled {
  background: #a0aec0;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.results-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  min-height: 600px;
}

.results {
  display: grid;
  grid-template-columns: 2fr 1fr;
  min-height: 600px;
}

.map-view {
  position: relative;
  border-right: 1px solid #e2e8f0;
}

.visualizer {
  height: 100%;
  width: 100%;
}

.route-details {
  padding: 1.5rem;
  overflow-y: auto;
  max-height: 600px;
}

.route-summary {
  margin-bottom: 2rem;
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.summary-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #2d3748;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: #3182ce;
}

.route-badge {
  padding: 0.25rem 0.75rem;
  background: #3182ce;
  color: white;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.route-badge.alternative {
  background: #805ad5;
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.metric-card {
  background: #f7fafc;
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.metric-icon {
  width: 2rem;
  height: 2rem;
  color: #3182ce;
  background: white;
  padding: 0.5rem;
  border-radius: 8px;
  flex-shrink: 0;
}

.metric-content {
  flex: 1;
}

.metric-label {
  display: block;
  font-size: 0.75rem;
  color: #718096;
  margin-bottom: 0.25rem;
  font-weight: 500;
}

.metric-value {
  font-weight: 600;
  font-size: 1.125rem;
  color: #2d3748;
}

.stations-header {
  font-size: 1rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stations-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.station-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  transition: background-color 0.2s ease;
  position: relative;
}

.station-item:hover {
  background: #f7fafc;
}

.station-item.start {
  background: #fed7d7;
}

.station-item.end {
  background: #c6f6d5;
}

.station-marker {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: bold;
  color: white;
  flex-shrink: 0;
  background: #3182ce;
}

.station-item.start .station-marker {
  background: #e53e3e;
}

.station-item.end .station-marker {
  background: #38a169;
}

.station-info {
  flex: 1;
}

.station-name {
  font-weight: 500;
  color: #2d3748;
  margin-bottom: 0.5rem;
}

.station-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-item {
  font-size: 0.75rem;
  color: #718096;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.detail-icon {
  width: 0.875rem;
  height: 0.875rem;
}

.route-connector {
  position: absolute;
  left: 2.75rem;
  bottom: -0.375rem;
  width: 1.5rem;
  height: 1.5rem;
  color: #cbd5e0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.alternatives {
  border-top: 1px solid #e2e8f0;
  padding-top: 1.5rem;
}

.alternatives-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.alternatives-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #2d3748;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.alternatives-count {
  font-size: 0.75rem;
  color: #718096;
  background: #edf2f7;
  padding: 0.25rem 0.5rem;
  border-radius: 1rem;
}

.alternative-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.option-card {
  padding: 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.option-card:hover {
  border-color: #3182ce;
  box-shadow: 0 4px 12px rgba(49, 130, 206, 0.1);
}

.option-card.selected {
  border-color: #3182ce;
  background: #ebf8ff;
}

.option-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.option-title {
  font-weight: 500;
  color: #2d3748;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.option-badges {
  display: flex;
  gap: 0.5rem;
}

.efficiency-badge {
  padding: 0.125rem 0.5rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.efficiency-badge.excellent {
  background: #c6f6d5;
  color: #22543d;
}

.efficiency-badge.good {
  background: #fbb040;
  color: #744210;
}

.efficiency-badge.fair {
  background: #fed7d7;
  color: #742a2a;
}

.efficiency-badge.poor {
  background: #e2e8f0;
  color: #4a5568;
}

.option-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.option-metric {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.metric-icon {
  width: 1rem;
  height: 1rem;
  color: #718096;
}

.metric-label {
  font-size: 0.75rem;
  color: #718096;
}

.metric-value {
  font-weight: 500;
  font-size: 0.875rem;
  color: #2d3748;
}

.option-actions {
  display: flex;
  justify-content: flex-end;
}

.select-route-btn {
  padding: 0.5rem 1rem;
  background: #edf2f7;
  color: #4a5568;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.select-route-btn:hover {
  background: #e2e8f0;
}

.select-route-btn.selected {
  background: #3182ce;
  color: white;
  border-color: #3182ce;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 600px;
  color: #718096;
  padding: 2rem;
}

.empty-content {
  text-align: center;
  max-width: 400px;
}

.placeholder-icon {
  width: 5rem;
  height: 5rem;
  margin: 0 auto 1.5rem;
  color: #cbd5e0;
}

.empty-content h3 {
  margin: 0 0 0.75rem 0;
  color: #4a5568;
  font-size: 1.25rem;
  font-weight: 600;
}

.empty-content p {
  margin: 0 0 1.5rem 0;
  font-size: 0.875rem;
  line-height: 1.5;
}

.empty-actions {
  display: flex;
  justify-content: center;
}

.sample-btn {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sample-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.sample-btn:disabled {
  background: #a0aec0;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .results {
    grid-template-columns: 1fr;
  }
  
  .route-details {
    border-right: none;
    border-top: 1px solid #e2e8f0;
    max-height: none;
  }
}

@media (max-width: 768px) {
  .route-optimizer {
    padding: 1rem;
  }
  
  .header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
  
  .header-actions {
    flex-direction: row;
    align-items: center;
  }
  
  .station-selectors {
    grid-template-columns: 1fr;
  }
  
  .options-grid {
    grid-template-columns: 1fr;
  }
  
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .option-metrics {
    grid-template-columns: 1fr;
  }
  
  .controls-header {
    flex-direction: column;
    gap: 0.75rem;
    text-align: center;
  }
}

@media (max-width: 480px) {
  .header-left h1 {
    font-size: 1.5rem;
  }
  
  .find-route-btn {
    min-width: 200px;
    font-size: 0.875rem;
  }
  
  .empty-content {
    padding: 1rem;
  }
  
  .placeholder-icon {
    width: 4rem;
    height: 4rem;
  }
}
</style>~/components/routes/RouteVisualizer.client.vue