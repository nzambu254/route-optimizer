<template>
  <div class="route-optimizer">
    <div class="header">
      <h1>Route Optimizer</h1>
      <div class="header-actions">
        <button @click="refreshGraph" :disabled="loading">
          <span v-if="loading">Loading...</span>
          <span v-else>Refresh Data</span>
        </button>
        <div class="last-updated" v-if="lastUpdated">
          Last updated: {{ formatDate(lastUpdated) }}
        </div>
      </div>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <div class="content">
      <div class="controls">
        <div class="station-selectors">
          <div class="select-group">
            <label>Start Station:</label>
            <select v-model="startStationId" :disabled="loading">
              <option value="">Select start station</option>
              <option 
                v-for="station in stations" 
                :key="station.id" 
                :value="station.id"
                :disabled="endStationId === station.id"
              >
                {{ station.name }}
              </option>
            </select>
          </div>

          <div class="select-group">
            <label>End Station:</label>
            <select v-model="endStationId" :disabled="loading">
              <option value="">Select end station</option>
              <option 
                v-for="station in stations" 
                :key="station.id" 
                :value="station.id"
                :disabled="startStationId === station.id"
              >
                {{ station.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="options">
          <div class="option-group">
            <label>
              <input 
                type="checkbox" 
                v-model="considerTime" 
                :disabled="loading"
              />
              Consider current time for station availability
            </label>
          </div>

          <div class="option-group">
            <label>
              <input 
                type="checkbox" 
                v-model="useAStar" 
                :disabled="loading"
              />
              Use A* algorithm (faster)
            </label>
          </div>

          <button 
            @click="findRoute" 
            :disabled="!startStationId || !endStationId || loading"
            class="find-route-btn"
          >
            <span v-if="loading">Calculating...</span>
            <span v-else>Find Optimal Route</span>
          </button>
        </div>
      </div>

      <div class="results-container">
        <div v-if="optimalRoute" class="results">
          <div class="map-view">
            <RouteVisualizer 
              :path="optimalRoute.path" 
              :stations="stationsMap" 
              :key="visualizerKey"
              class="visualizer"
            />
          </div>

          <div class="route-details">
            <div class="route-summary">
              <h3>Optimal Path</h3>
              <div class="path-details">
                <div class="metrics">
                  <div class="metric">
                    <span class="label">Total Distance:</span>
                    <span class="value">
                      {{ optimalRoute.totalDistance?.toFixed(2) || 'N/A' }} km
                    </span>
                  </div>
                  <div class="metric">
                    <span class="label">Total Time:</span>
                    <span class="value">
                      {{ optimalRoute.totalTime?.toFixed(2) || 'N/A' }} minutes
                    </span>
                  </div>
                </div>

                <div class="path-stations">
                  <div 
                    v-for="(stationId, index) in optimalRoute.path" 
                    :key="stationId" 
                    class="station"
                  >
                    <div class="station-marker">{{ index + 1 }}</div>
                    <div class="station-info">
                      <div class="station-name">
                        {{ stationsMap[stationId]?.name || stationId }}
                      </div>
                      <div 
                        v-if="stationsMap[stationId]?.operatingHours" 
                        class="station-hours"
                      >
                        Open: {{ stationsMap[stationId]?.operatingHours.open }} - 
                        {{ stationsMap[stationId]?.operatingHours.close }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="alternativeRoutes.length" class="alternatives">
              <h3>Alternative Routes</h3>
              <div class="alternative-options">
                <div 
                  v-for="(route, index) in alternativeRoutes" 
                  :key="index"
                  class="option-card"
                  :class="{ 'selected': selectedAlternative === index }"
                  @click="selectAlternative(index)"
                >
                  <div class="option-header">
                    Option {{ index + 1 }}
                    <span class="badge" v-if="selectedAlternative === index">Selected</span>
                  </div>
                  <div class="option-metrics">
                    <div class="metric">
                      <span class="label">Distance:</span>
                      <span class="value">
                        {{ route.distance?.toFixed(2) || 'N/A' }} km
                      </span>
                    </div>
                    <div class="metric">
                      <span class="label">Time:</span>
                      <span class="value">
                        {{ route.time?.toFixed(2) || 'N/A' }} min
                      </span>
                    </div>
                    <div class="metric">
                      <span class="label">Stations:</span>
                      <span class="value">
                        {{ route.path.length }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <div class="empty-content">
            <div class="placeholder-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#95a5a6" stroke-width="1.5">
                <circle cx="12" cy="10" r="3" />
                <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z" />
              </svg>
            </div>
            <h3>No Route Selected</h3>
            <p>Select start and end stations to calculate optimal route</p>
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

const stations = ref<Station[]>([]);
const stationsMap = computed(() => {
  const map: Record<string, Station> = {};
  stations.value.forEach(station => {
    map[station.id] = station;
  });
  return map;
});

const startStationId = ref<string>('');
const endStationId = ref<string>('');
const considerTime = ref(false);
const useAStar = ref(true);
const optimalRoute = ref<{
  path: string[];
  totalDistance?: number;
  totalTime?: number;
} | null>(null);
const alternativeRoutes = ref<Array<{
  path: string[];
  distance?: number;
  time?: number;
}>>([]);
const selectedAlternative = ref<number | null>(null);
const visualizerKey = ref(0);

const formatDate = (date: Date) => {
  return format(date, 'MMM dd, yyyy HH:mm');
};

const refreshGraph = async () => {
  await initializeGraph();
  const response = await $fetch('/api/stations');
  stations.value = response;
  if (response.length) {
    startStationId.value = response[0].id;
    endStationId.value = response[1]?.id || '';
  }
  visualizerKey.value++;
  optimalRoute.value = null;
  alternativeRoutes.value = [];
  selectedAlternative.value = null;
};

const findRoute = async () => {
  if (!startStationId.value || !endStationId.value) return;
  
  try {
    optimalRoute.value = findOptimalRoute(
      startStationId.value, 
      endStationId.value, 
      considerTime.value,
      useAStar.value
    ) || {
      path: [],
      totalDistance: undefined,
      totalTime: undefined
    };
    
    alternativeRoutes.value = findAlternativeRoutes(
      startStationId.value, 
      endStationId.value,
      3,
      considerTime.value
    ) || [];
    
    selectedAlternative.value = null;
    visualizerKey.value++;
  } catch (err) {
    console.error('Error finding route:', err);
    error.value = 'Failed to calculate route';
  }
};

const selectAlternative = (index: number) => {
  selectedAlternative.value = index;
  optimalRoute.value = alternativeRoutes.value[index];
  visualizerKey.value++;
};

onMounted(async () => {
  await refreshGraph();
});
</script>

<style scoped>
.route-optimizer {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.header h1 {
  margin: 0;
  font-size: 28px;
  color: #2c3e50;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

button {
  padding: 8px 16px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

button:hover {
  background-color: #2980b9;
}

button:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

.last-updated {
  font-size: 12px;
  color: #7f8c8d;
}

.error-message {
  padding: 12px;
  background-color: #f8d7da;
  color: #721c24;
  border-radius: 4px;
  margin-bottom: 20px;
  border: 1px solid #f5c6cb;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.controls {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.station-selectors {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.select-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.select-group label {
  font-weight: 500;
  font-size: 14px;
  color: #34495e;
}

select {
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  background-color: white;
}

select:disabled {
  background-color: #e9ecef;
}

.options {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
}

.option-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.option-group label {
  font-size: 14px;
  color: #34495e;
  cursor: pointer;
}

.find-route-btn {
  padding: 10px 20px;
  font-weight: 500;
  margin-left: auto;
}

.results-container {
  min-height: 500px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow: hidden;
}

.results {
  display: grid;
  grid-template-columns: 2fr 1fr;
  min-height: 600px;
}

.map-view {
  position: relative;
}

.visualizer {
  height: 100%;
  width: 100%;
}

.route-details {
  padding: 20px;
  border-left: 1px solid #e0e0e0;
  overflow-y: auto;
  max-height: 600px;
}

.route-summary h3, .alternatives h3 {
  margin-top: 0;
  margin-bottom: 16px;
  color: #2c3e50;
  font-size: 18px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}

.path-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.metric {
  background-color: #f8f9fa;
  padding: 12px;
  border-radius: 4px;
}

.metric .label {
  display: block;
  font-size: 12px;
  color: #7f8c8d;
  margin-bottom: 4px;
}

.metric .value {
  font-weight: 500;
  font-size: 16px;
  color: #2c3e50;
}

.path-stations {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.station {
  display: flex;
  gap: 12px;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.station:hover {
  background-color: #f8f9fa;
}

.station-marker {
  width: 24px;
  height: 24px;
  background-color: #3498db;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
}

.station-info {
  flex-grow: 1;
}

.station-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.station-hours {
  font-size: 12px;
  color: #7f8c8d;
}

.alternatives {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.alternative-options {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.option-card {
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.option-card:hover {
  border-color: #3498db;
  box-shadow: 0 2px 8px rgba(52, 152, 219, 0.1);
}

.option-card.selected {
  border-color: #3498db;
  background-color: #f0f7fd;
}

.option-header {
  font-weight: 500;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.badge {
  font-size: 11px;
  background-color: #3498db;
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
}

.option-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.option-metrics .metric {
  background: none;
  padding: 0;
}

.option-metrics .label {
  font-size: 11px;
}

.option-metrics .value {
  font-size: 14px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 500px;
  color: #7f8c8d;
}

.empty-content {
  text-align: center;
  max-width: 300px;
}

.placeholder-icon {
  width: 100px;
  height: 100px;
  margin: 0 auto 20px;
}

.empty-content h3 {
  margin: 0 0 8px 0;
  color: #34495e;
}

.empty-content p {
  margin: 0;
  font-size: 14px;
}

@media (max-width: 1024px) {
  .results {
    grid-template-columns: 1fr;
  }
  
  .route-details {
    border-left: none;
    border-top: 1px solid #e0e0e0;
  }
}

@media (max-width: 768px) {
  .station-selectors {
    grid-template-columns: 1fr;
  }
  
  .options {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .find-route-btn {
    margin-left: 0;
    width: 100%;
  }
}
</style>