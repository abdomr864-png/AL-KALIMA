import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const search = params.get('search') || ''
  const filter = params.get('filter') || 'all'
  const page = Number(params.get('page') || '0')
  const pageSize = 50

  let query = supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (search) query = query.ilike('username', `%${search}%`)
  if (filter === 'plus') query = query.eq('is_plus', true)
  else if (filter === 'elite') query = query.eq('is_elite', true)
  else if (filter === 'flagged') query = query.eq('is_flagged', true)
  else if (filter === 'online') query = query.eq('is_online', true)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ players: data, total: count })
}

export async function POST(req: NextRequest) {
  const { action, playerId, amount } = await req.json()

  if (action === 'give_coins') {
    const { data: current } = await supabaseAdmin.from('profiles').select('coins').eq('id', playerId).single()
    await supabaseAdmin.from('profiles').update({ coins: (current?.coins || 0) + amount }).eq('id', playerId)
  } else if (action === 'give_gems') {
    await supabaseAdmin.rpc('add_gems', { p_user_id: playerId, p_amount: amount })
  } else if (action === 'flag') {
    await supabaseAdmin.from('profiles').update({
      is_flagged: true, flag_reason: 'Manually flagged by admin', flagged_at: new Date().toISOString(),
    }).eq('id', playerId)
  } else if (action === 'unflag') {
    await supabaseAdmin.from('profiles').update({
      is_flagged: false, flag_reason: null, flagged_at: null,
    }).eq('id', playerId)
  }

  return NextResponse.json({ success: true })
}
