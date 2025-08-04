export interface Station {
  id: string
  name: string
  coordinates: {
    lat: number
    lng: number
  }
  capacity: number
  operatingHours?: {
    open: string
    close: string
  }
}

export interface RouteEdge {
  from: string
  to: string
  distance: number
  estimatedTime: number
  trafficMultiplier: number
  lastUpdated: Date
  isBidirectional?: boolean
}