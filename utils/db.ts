import type { Station, RouteEdge } from '@/types/transport';

export async function fetchStations(): Promise<Station[]> {
  try {
    const response = await $fetch('/api/stations');
    return response.map((station: any) => ({
      id: station.id,
      name: station.name,
      coordinates: station.coordinates,
      capacity: station.capacity,
      operatingHours: station.operating_hours
    }));
  } catch (error) {
    console.error('Failed to fetch stations:', error);
    throw new Error('Failed to load station data');
  }
}

export async function fetchRoutes(): Promise<RouteEdge[]> {
  try {
    const response = await $fetch('/api/routes');
    return response.map((route: any) => ({
      from: route.from_station_id,
      to: route.to_station_id,
      distance: route.distance_km,
      estimatedTime: route.estimated_time_minutes,
      trafficMultiplier: route.traffic_multiplier,
      lastUpdated: new Date(route.last_updated),
      isBidirectional: route.is_bidirectional
    }));
  } catch (error) {
    console.error('Failed to fetch routes:', error);
    throw new Error('Failed to load route data');
  }
}

export async function updateTraffic(
  fromStationId: string,
  toStationId: string,
  multiplier: number
): Promise<void> {
  try {
    await $fetch('/api/routes/traffic', {
      method: 'POST',
      body: {
        from_station_id: fromStationId,
        to_station_id: toStationId,
        multiplier
      }
    });
  } catch (error) {
    console.error('Failed to update traffic:', error);
    throw new Error('Failed to update traffic conditions');
  }
}

export async function fetchStationById(id: string): Promise<Station | null> {
  try {
    const response = await $fetch(`/api/stations/${id}`);
    return {
      id: response.id,
      name: response.name,
      coordinates: response.coordinates,
      capacity: response.capacity,
      operatingHours: response.operating_hours
    };
  } catch (error) {
    console.error(`Failed to fetch station ${id}:`, error);
    return null;
  }
}

export async function fetchRouteBetweenStations(
  fromStationId: string,
  toStationId: string
): Promise<RouteEdge | null> {
  try {
    const response = await $fetch('/api/routes/between', {
      params: {
        from: fromStationId,
        to: toStationId
      }
    });

    if (!response) return null;

    return {
      from: response.from_station_id,
      to: response.to_station_id,
      distance: response.distance_km,
      estimatedTime: response.estimated_time_minutes,
      trafficMultiplier: response.traffic_multiplier,
      lastUpdated: new Date(response.last_updated),
      isBidirectional: response.is_bidirectional
    };
  } catch (error) {
    console.error('Failed to fetch route between stations:', error);
    return null;
  }
}