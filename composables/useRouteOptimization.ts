import { ref } from 'vue';
import { TransportGraph } from '@/utils/TransportGraph';
import type { Station, RouteEdge } from '@/types/transport';

export default function useRouteOptimization() {
  const graph = ref<TransportGraph | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastUpdated = ref<Date | null>(null);

  const initializeGraph = async () => {
    loading.value = true;
    error.value = null;

    try {
      const transportGraph = new TransportGraph();

      const [stationsResponse, routesResponse] = await Promise.all([
        $fetch('/api/stations'),
        $fetch('/api/routes')
      ]);

      stationsResponse.forEach((station: any) => {
        transportGraph.addStation({
          id: station.id,
          name: station.name,
          coordinates: station.coordinates,
          capacity: station.capacity,
          operatingHours: station.operating_hours
        });
      });

      routesResponse.forEach((route: any) => {
        transportGraph.addRoute({
          from: route.from_station_id,
          to: route.to_station_id,
          distance: route.distance_km,
          estimatedTime: route.estimated_time_minutes,
          trafficMultiplier: route.traffic_multiplier,
          lastUpdated: new Date(route.last_updated),
          isBidirectional: route.is_bidirectional
        });
      });

      graph.value = transportGraph;
      lastUpdated.value = new Date();
    } catch (err) {
      error.value = 'Failed to initialize route graph';
      console.error(err);
    } finally {
      loading.value = false;
    }
  };

  const findOptimalRoute = (
    start: string,
    end: string,
    considerTime: boolean = false,
    useAStar: boolean = true
  ) => {
    if (!graph.value) return null;

    return useAStar
      ? graph.value.aStar(start, end, considerTime)
      : graph.value.dijkstra(start, end, considerTime);
  };

  const findAlternativeRoutes = (
    start: string,
    end: string,
    maxRoutes: number = 3,
    considerTime: boolean = false
  ) => {
    if (!graph.value) return [];

    const mainRoute = findOptimalRoute(start, end, considerTime);
    const allRoutes = graph.value.getAllPaths(start, end, maxRoutes + 1);

    return allRoutes
      .filter(route =>
        route.path.length > 0 &&
        (!mainRoute || route.path.join() !== mainRoute.path.join())
      )
      .slice(0, maxRoutes);
  };

  const updateTrafficConditions = async (
    from: string,
    to: string,
    multiplier: number
  ) => {
    if (!graph.value) return;

    try {
      // Update in database first
      await $fetch('/api/routes/traffic', {
        method: 'POST',
        body: {
          from_station_id: from,
          to_station_id: to,
          multiplier
        }
      });

      // Then update in-memory graph
      graph.value.updateTrafficConditions(from, to, multiplier);
      lastUpdated.value = new Date();
    } catch (err) {
      console.error('Failed to update traffic conditions:', err);
      error.value = 'Failed to update traffic conditions';
    }
  };

  const getStation = (id: string) => {
    return graph.value?.getStation(id);
  };

  return {
    graph,
    loading,
    error,
    lastUpdated,
    initializeGraph,
    findOptimalRoute,
    findAlternativeRoutes,
    updateTrafficConditions,
    getStation
  };
}