import { defineEventHandler } from 'h3'
import { supabase } from '../../utils/supabase'

export default defineEventHandler(async () => {
  try {
    const { data, error } = await supabase
      .from('routes_graph')
      .select('*')

    if (error) throw error

    return data.map(route => ({
      from_station_id: route.from_station_id,
      to_station_id: route.to_station_id,
      distance_km: route.distance_km,
      estimated_time_minutes: route.estimated_time_minutes,
      traffic_multiplier: route.traffic_multiplier,
      last_updated: route.last_updated,
      is_bidirectional: route.is_bidirectional
    }))
  } catch (error) {
    console.error('Error fetching routes:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch routes'
    })
  }
})