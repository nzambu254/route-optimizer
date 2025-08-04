import type { Station, RouteEdge } from '@/types/transport';

export class TransportGraph {
  private adjacencyList: Map<string, RouteEdge[]>;
  private stations: Map<string, Station>;

  constructor() {
    this.adjacencyList = new Map();
    this.stations = new Map();
  }

  addStation(station: Station): void {
    const stationWithDefaults = {
      ...station,
      operatingHours: station.operatingHours || {
        open: "06:00",
        close: "22:00"
      }
    };
    this.stations.set(stationWithDefaults.id, stationWithDefaults);
    if (!this.adjacencyList.has(stationWithDefaults.id)) {
      this.adjacencyList.set(stationWithDefaults.id, []);
    }
  }

  addRoute(edge: RouteEdge): void {
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

    // Initialize distances and times
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

      // Explore neighbors
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

  aStar(start: string, end: string, considerTime: boolean = false): {
    path: string[];
    totalDistance: number;
    totalTime: number;
  } {
    const openSet = new PriorityQueue<{ id: string; fScore: number }>(
      (a, b) => a.fScore < b.fScore
    );
    const cameFrom: Record<string, string | null> = {};
    const gScore: Record<string, number> = {};
    const fScore: Record<string, number> = {};

    // Initialize scores
    for (const stationId of this.adjacencyList.keys()) {
      gScore[stationId] = Infinity;
      fScore[stationId] = Infinity;
    }
    gScore[start] = 0;
    fScore[start] = this.heuristic(start, end);

    openSet.enqueue({ id: start, fScore: fScore[start] });

    while (!openSet.isEmpty()) {
      const { id: current } = openSet.dequeue()!;

      if (current === end) {
        return {
          path: this.reconstructPath(cameFrom, end),
          totalDistance: gScore[end],
          totalTime: this.calculateTime(this.reconstructPath(cameFrom, end))
        };
      }

      const currentTime = gScore[current];
      const currentStation = this.stations.get(current);

      if (considerTime && currentStation && !this.isStationOpen(currentStation, currentTime)) {
        continue;
      }

      for (const edge of this.adjacencyList.get(current) || []) {
        if (!this.stations.has(edge.to)) continue;

        const tentativeGScore = gScore[current] + edge.distance;
        if (tentativeGScore < gScore[edge.to]) {
          cameFrom[edge.to] = current;
          gScore[edge.to] = tentativeGScore;
          fScore[edge.to] = tentativeGScore + this.heuristic(edge.to, end);
          if (!openSet.some(item => item.id === edge.to)) {
            openSet.enqueue({ id: edge.to, fScore: fScore[edge.to] });
          }
        }
      }
    }

    return { path: [], totalDistance: Infinity, totalTime: Infinity };
  }

  private heuristic(from: string, to: string): number {
    const fromStation = this.stations.get(from);
    const toStation = this.stations.get(to);
    if (!fromStation || !toStation) return 0;

    // Simple Euclidean distance as heuristic
    const latDiff = fromStation.coordinates.lat - toStation.coordinates.lat;
    const lngDiff = fromStation.coordinates.lng - toStation.coordinates.lng;
    return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
  }

  private calculateTime(path: string[]): number {
    let totalTime = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const edge = this.adjacencyList.get(path[i])?.find(e => e.to === path[i + 1]);
      if (edge) {
        totalTime += edge.estimatedTime * edge.trafficMultiplier;
      }
    }
    return totalTime;
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

  private isStationOpen(station: Station | undefined, currentTimeMinutes: number): boolean {
    if (!station?.operatingHours) return true;

    const { open = "06:00", close = "22:00" } = station.operatingHours;
    const [openHours = 6, openMinutes = 0] = open.split(':').map(Number);
    const [closeHours = 22, closeMinutes = 0] = close.split(':').map(Number);

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

    const mainPath = this.dijkstra(start, end);
    if (mainPath.path.length) results.push(mainPath);

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

    // Update reverse edge if bidirectional
    if (this.adjacencyList.get(to)) {
      const reverseEdge = this.adjacencyList.get(to)?.find(e => e.to === from);
      if (reverseEdge && reverseEdge.isBidirectional) {
        reverseEdge.trafficMultiplier = multiplier;
        reverseEdge.lastUpdated = new Date();
      }
    }
  }

  private clone(): TransportGraph {
    const newGraph = new TransportGraph();
    newGraph.adjacencyList = new Map(JSON.parse(JSON.stringify(Array.from(this.adjacencyList))));
    newGraph.stations = new Map(JSON.parse(JSON.stringify(Array.from(this.stations))));
    return newGraph;
  }

  getStation(id: string): Station | undefined {
    return this.stations.get(id);
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

  some(predicate: (item: T) => boolean): boolean {
    return this.elements.some(predicate);
  }
}