export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

const RENAMES: { from: string; to: string }[] = [
  { from: 'Kinyu Tower A',    to: 'Tower A'    },
  { from: 'Kinyu Tower B',    to: 'Tower B'    },
  { from: 'Kinyu Residences', to: 'Residences' },
  { from: 'Kinyu Heights',    to: 'Heights'    },
  { from: 'Kinyu Gardens',    to: 'Gardens'    },
  { from: 'Kinyu Square',     to: 'Square'     },
  { from: 'Kinyu Park View',  to: 'Park View'  },
  { from: 'Kinyu Manor',      to: 'Manor'      },
  { from: 'Kinyu Plaza',      to: 'Plaza'      },
  { from: 'Kinyu Suites',     to: 'Suites'     },
  { from: 'Kinyu Terrace',    to: 'Terrace'    },
  { from: 'Kinyu Palms',      to: 'Palms'      },
  { from: 'Kinyu Vista',      to: 'Vista'      },
  { from: 'Kinyu Commons',    to: 'Commons'    },
  { from: 'Kinyu Court',      to: 'Court'      },
]

export async function POST() {
  const supabase = createServerClient()
  const results: { name: string; status: string }[] = []

  for (const { from, to } of RENAMES) {
    const { error } = await supabase
      .from('buildings')
      .update({ name: to })
      .eq('name', from)

    results.push({ name: `${from} → ${to}`, status: error ? `error: ${error.message}` : 'ok' })
  }

  const errors = results.filter(r => r.status !== 'ok')
  return NextResponse.json({ success: errors.length === 0, results })
}
