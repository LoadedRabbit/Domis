import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase-server'

const BUILDINGS = [
  { name: 'Kinyu Tower A',        address: '1201 Main Street, Los Angeles, CA 90001',      total_units: 20 },
  { name: 'Kinyu Tower B',        address: '1205 Main Street, Los Angeles, CA 90001',      total_units: 15 },
  { name: 'Kinyu Residences',     address: '847 Oak Avenue, Los Angeles, CA 90015',        total_units: 18 },
  { name: 'Kinyu Heights',        address: '321 Pine Road, Pasadena, CA 91101',            total_units: 12 },
  { name: 'Kinyu Gardens',        address: '654 Elm Street, Glendale, CA 91201',           total_units: 10 },
  { name: 'Kinyu Square',         address: '987 Cedar Lane, Burbank, CA 91501',            total_units:  8 },
  { name: 'Kinyu Park View',      address: '111 Willow Way, Culver City, CA 90230',        total_units: 14 },
  { name: 'Kinyu Manor',          address: '222 Birch Boulevard, Santa Monica, CA 90401',  total_units: 16 },
  { name: 'Kinyu Plaza',          address: '333 Walnut Avenue, Long Beach, CA 90802',      total_units: 22 },
  { name: 'Kinyu Suites',         address: '444 Ash Court, Torrance, CA 90501',            total_units: 11 },
  { name: 'Kinyu Terrace',        address: '555 Maple Drive, Compton, CA 90220',           total_units: 13 },
  { name: 'Kinyu Palms',          address: '666 Palm Avenue, Inglewood, CA 90301',         total_units: 17 },
  { name: 'Kinyu Vista',          address: '777 Vista Road, Hawthorne, CA 90250',          total_units: 19 },
  { name: 'Kinyu Commons',        address: '888 Common Lane, Gardena, CA 90247',           total_units:  9 },
  { name: 'Kinyu Court',          address: '999 Court Street, Lawndale, CA 90260',         total_units: 15 },
]

export async function POST() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createServerClient()

    const { count } = await supabase
      .from('buildings')
      .select('*', { count: 'exact', head: true })

    if ((count ?? 0) > 0) {
      return NextResponse.json({ message: `Already seeded — ${count} buildings exist.`, seeded: false })
    }

    const { data, error } = await supabase
      .from('buildings')
      .insert(BUILDINGS)
      .select()

    if (error) throw new Error(error.message)
    return NextResponse.json({ message: `Seeded ${data.length} buildings.`, seeded: true })
  } catch (err) {
    console.error('[/api/seed POST]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Seed failed' },
      { status: 500 }
    )
  }
}
