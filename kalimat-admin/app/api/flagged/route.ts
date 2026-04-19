import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const [{ data: players }, { data: results }] = await Promise.all([
    supabaseAdmin.from('profiles').select('*').eq('is_flagged', true).order('flagged_at', { ascending: false }),
    supabaseAdmin.from('daily_results').select('*, profiles(username)').eq('is_flagged', true).order('created_at', { ascending: false }).limit(50),
  ])
  return NextResponse.json({ players: players || [], results: results || [] })
}

export async function POST(req: NextRequest) {
  const { action, id, type } = await req.json()

  if (type === 'player') {
    if (action === 'unflag') {
      await supabaseAdmin.from('profiles').update({ is_flagged: false, flag_reason: null, flagged_at: null }).eq('id', id)
    } else if (action === 'ban') {
      await supabaseAdmin.from('profiles').delete().eq('id', id)
    }
  } else if (type === 'result') {
    await supabaseAdmin.from('daily_results').update({ is_flagged: false, flag_reason: null }).eq('id', id)
  }

  return NextResponse.json({ success: true })
}
