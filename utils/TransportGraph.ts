import type { Station, Edge } from '@/types/transport';

export class TransportGraph {
  private adjacencyList: Map<string, Edge[]>;
  private stations: Map<string, Station>;

  constructor() {
    this.adjacencyList = new Map();
    this.stations = new Map();
  }

  addStation(station: Station): void {
    this.stations.set(station.id, station);
    if (!this.adjacencyList.has(station.id)) {
      this.adjacencyList.set(station.id, []);
    }
  }

  addRoute(edge: Edge): void {
    this.adjacencyList.get(edge.from)?.push(edge);
    if (edge.isBidirectional) {
      this.adjacencyList.get(edge.to)?.push({
        ...edge,
        from: edge.to,
        to: edge.from
      });
    }
  }

  dijkstra(start: string, end: string, considerTime: boolean = false): {
    path: string[];
    totalDistance: number;
    totalTime: number;
  } {
    const distances: Record<string, number> = {};
    const times: Record<string, number> = {};
    const previous: Record<string, string | null> = {};
    const visited = new Set<string>();
    const priorityQueue = new PriorityQueue<{ id: string; distance: number; time: number }>(
      (a, b) => a.distance < b.distance
    );

    // Initialize distances
    for (const stationId of this.adjacencyList.keys()) {
      distances[stationId] = stationId === start ? 0 : Infinity;
      times[stationId] = stationId === start ? 0 : Infinity;
      previous[stationId] = null;
    }

    priorityQueue.enqueue({ id: start, distance: 0, time: 0 });

    while (!priorityQueue.isEmpty()) {
      const { id: currentId } = priorityQueue.dequeue()!;

      if (currentId === end) break;
      if (visited.has(currentId)) continue;

      visited.add(currentId);

      const currentTime = times[currentId];
      const currentStation = this.stations.get(currentId);

      // Skip if station is closed and we're considering time
      if (considerTime && currentStation && !this.isStationOpen(currentStation, currentTime)) {
        continue;
      }

      for (const edge of this.adjacencyList.get(currentId) || []) {
        if (!this.stations.has(edge.to)) continue;

        const timeWithTraffic = edge.estimatedTime * edge.trafficMultiplier;
        const alternativeDistance = distances[currentId] + edge.distance;
        const alternativeTime = times[currentId] + timeWithTraffic;

        if (alternativeDistance < distances[edge.to]) {
          distances[edge.to] = alternativeDistance;
          times[edge.to] = alternativeTime;
          previous[edge.to] = currentId;
          priorityQueue.enqueue({
            id: edge.to,
            distance: alternativeDistance,
            time: alternativeTime
          });
        }
      }
    }

    return {
      path: this.reconstructPath(previous, end),
      totalDistance: distances[end],
      totalTime: times[end]
    };
  }

  private reconstructPath(previous: Record<string, string | null>, end: string): string[] {
    const path: string[] = [];
    let current: string | null = end;

    while (current) {
      path.unshift(current);
      current = previous[current];
    }

    return path.length > 1 ? path : [];
  }

  private isStationOpen(station: Station, currentTimeMinutes: number): boolean {
    const { open, close } = station.operatingHours;
    const [openHours, openMinutes] = open.split(':').map(Number);
    const [closeHours, closeMinutes] = close.split(':').map(Number);

    const openTime = openHours * 60 + openMinutes;
    const closeTime = closeHours * 60 + closeMinutes;

    return currentTimeMinutes >= openTime && currentTimeMinutes <= closeTime;
  }

  getAllPaths(start: string, end: string, maxPaths: number = 3): Array<{
    path: string[];
    distance: number;
    time: number;
  }> {
    const results: Array<{
      path: string[];
      distance: number;
      time: number;
    }> = [];

    // Basic implementation - in production you might want Yen's algorithm
    const mainPath = this.dijkstra(start, end);
    if (mainPath.path.length) results.push(mainPath);

    // Find alternatives by removing one edge at a time
    if (results.length < maxPaths) {
      for (const edge of this.adjacencyList.get(start) || []) {
        const tempGraph = this.clone();
        tempGraph.adjacencyList.get(start)?.splice(
          tempGraph.adjacencyList.get(start)?.indexOf(edge) || 0, 1
        );
        const altPath = tempGraph.dijkstra(start, end);
        if (altPath.path.length && !results.some(p => p.path.join() === altPath.path.join())) {
          results.push(altPath);
          if (results.length >= maxPaths) break;
        }
      }
    }

    return results.slice(0, maxPaths);
  }

  updateTrafficConditions(from: string, to: string, multiplier: number): void {
    const edges = this.adjacencyList.get(from) || [];
    const edge = edges.find(e => e.to === to);
    if (edge) {
      edge.trafficMultiplier = multiplier;
      edge.lastUpdated = new Date();
    }
  }

  private clone(): TransportGraph {
    const newGraph = new TransportGraph();
    newGraph.adjacencyList = new Map(JSON.parse(JSON.stringify(Array.from(this.adjacencyList))));
    newGraph.stations = new Map(JSON.parse(JSON.stringify(Array.from(this.stations))));
    return newGraph;
  }
}

class PriorityQueue<T> {
  private elements: T[] = [];
  constructor(private comparator: (a: T, b: T) => boolean) { }

  enqueue(element: T): void {
    this.elements.push(element);
    this.elements.sort((a, b) => this.comparator(a, b) ? -1 : 1);
  }

  dequeue(): T | undefined {
    return this.elements.shift();
  }

  isEmpty(): boolean {
    return this.elements.length === 0;
  }
}