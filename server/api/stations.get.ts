import { defineEventHandler } from 'h3'
import { supabase } from '../../utils/supabase'

export default defineEventHandler(async () => {
  try {
    const { data, error } = await supabase
      .from('stations')
      .select('*')

    if (error) throw error

    return data.map(station => ({
      id: station.id,
      name: station.name,
      coordinates: station.coordinates,
      capacity: station.capacity,
      operatingHours: station.operating_hours
    }))
  } catch (error) {
    console.error('Error fetching stations:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch stations'
    })
  }
})