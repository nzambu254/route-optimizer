<template>
  <div class="route-optimizer">
    <div class="header">
      <h1>Route Optimizer</h1>
      <button @click="refreshGraph" :disabled="loading">
        {{ loading ? 'Loading...' : 'Refresh Data' }}
      </button>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <div class="content">
      <div class="controls">
        <div class="station-selectors">
          <label>
            Start Station:
            <select v-model="startStationId">
              <option v-for="station in stations" :key="station.id" :value="station.id">
                {{ station.name }}
              </option>
            </select>
          </label>

          <label>
            End Station:
            <select v-model="endStationId">
              <option v-for="station in stations" :key="station.id" :value="station.id">
                {{ station.name }}
              </option>
            </select>
          </label>
        </div>

        <div class="options">
          <label>
            <input type="checkbox" v-model="considerTime" />
            Consider current time for station availability
          </label>

          <button @click="findRoute" :disabled="!startStationId || !endStationId || loading">
            Find Optimal Route
          </button>
        </div>
      </div>

      <div v-if="optimalRoute" class="results">
        <RouteVisualizer 
          :path="optimalRoute.path" 
          :stations="stationsMap" 
          :key="visualizerKey"
        />

        <div class="route-summary">
          <h3>Optimal Path</h3>
          <div class="path">
            <div v-for="(stationId, index) in optimalRoute.path" :key="stationId" class="station">
              {{ index + 1 }}. {{ stationsMap[stationId]?.name || stationId }}
            </div>
          </div>
          <div class="metrics">
            <div>Total Distance: {{ optimalRoute.totalDistance.toFixed(2) }} km</div>
            <div>Total Time: {{ optimalRoute.totalTime.toFixed(2) }} minutes</div>
          </div>
        </div>

        <div v-if="alternativeRoutes.length" class="alternatives">
          <h3>Alternative Routes</h3>
          <div class="route-options">
            <div 
              v-for="(route, index) in alternativeRoutes" 
              :key="index"
              class="route-option"
              @click="selectAlternative(route)"
            >
              <div class="option-header">Option {{ index + 1 }}</div>
              <div>Distance: {{ route.distance.toFixed(2) }} km</div>
              <div>Time: {{ route.time.toFixed(2) }} min</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import useRouteOptimization from '@/composables/useRouteOptimization';
import RouteVisualizer from '@/components/routes/RouteVisualizer.vue';

const {
  graph,
  loading,
  error,
  initializeGraph,
  findOptimalRoute,
  findAlternativeRoutes
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
const optimalRoute = ref<{
  path: string[];
  totalDistance: number;
  totalTime: number;
} | null>(null);
const alternativeRoutes = ref<Array<{
  path: string[];
  distance: number;
  time: number;
}>>([]);
const visualizerKey = ref(0);

const refreshGraph = async () => {
  await initializeGraph();
  // Refresh stations list
  const response = await $fetch('/api/stations');
  stations.value = response;
  if (response.length) {
    startStationId.value = response[0].id;
    endStationId.value = response[1]?.id || '';
  }
  visualizerKey.value++;
};

const findRoute = () => {
  if (!startStationId.value || !endStationId.value) return;
  
  optimalRoute.value = findOptimalRoute(startStationId.value, endStationId.value, considerTime.value);
  alternativeRoutes.value = findAlternativeRoutes(startStationId.value, endStationId.value);
  visualizerKey.value++;
};

const selectAlternative = (route: {
  path: string[];
  distance: number;
  time: number;
}) => {
  optimalRoute.value = route;
  visualizerKey.value++;
};

onMounted(async () => {
  await refreshGraph();
});
</script>

<style scoped>
.route-optimizer {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.content {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 20px;
}

.controls {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
}

.station-selectors {
  display: grid;
  gap: 15px;
  margin-bottom: 20px;
}

.options {
  display: grid;
  gap: 15px;
}

.results {
  display: grid;
  gap: 20px;
}

.route-summary, .alternatives {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
}

.path {
  margin: 15px 0;
}

.station {
  padding: 5px 0;
  border-bottom: 1px solid #ddd;
}

.metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 10px;
}

.route-options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.route-option {
  background: white;
  padding: 15px;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.2s;
}

.route-option:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.option-header {
  font-weight: bold;
  margin-bottom: 5px;
}

.error-message {
  color: red;
  padding: 10px;
  background: #ffeeee;
  border-radius: 5px;
  margin-bottom: 20px;
}
</style>