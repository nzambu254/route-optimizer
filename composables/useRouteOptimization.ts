import { TransportGraph } from '@/utils/TransportGraph';
import type { Station, Edge } from '@/types/transport';

export default function useRouteOptimization() {
  const graph = ref<TransportGraph | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const initializeGraph = async () => {
    loading.value = true;
    error.value = null;

    try {
      const transportGraph = new TransportGraph();

      // Fetch stations and routes from your backend API
      const [stationsResponse, routesResponse] = await Promise.all([
        $fetch('/api/stations'),
        $fetch('/api/routes')
      ]);

      // Add stations to graph
      stationsResponse.forEach((station: Station) => {
        transportGraph.addStation({
          id: station.id,
          name: station.name,
          coordinates: station.coordinates,
          capacity: station.capacity,
          operatingHours: station.operating_hours
        });
      });

      // Add routes to graph
      routesResponse.forEach((route: Edge) => {
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
    } catch (err) {
      error.value = 'Failed to initialize route graph';
      console.error(err);
    } finally {
      loading.value = false;
    }
  };

  const findOptimalRoute = (start: string, end: string, considerTime: boolean = false) => {
    if (!graph.value) return null;
    return graph.value.dijkstra(start, end, considerTime);
  };

  const findAlternativeRoutes = (start: string, end: string, maxRoutes: number = 3) => {
    if (!graph.value) return [];
    return graph.value.getAllPaths(start, end, maxRoutes);
  };

  const updateTrafficConditions = (from: string, to: string, multiplier: number) => {
    if (!graph.value) return;
    graph.value.updateTrafficConditions(from, to, multiplier);
  };

  return {
    graph,
    loading,
    error,
    initializeGraph,
    findOptimalRoute,
    findAlternativeRoutes,
    updateTrafficConditions
  };
}