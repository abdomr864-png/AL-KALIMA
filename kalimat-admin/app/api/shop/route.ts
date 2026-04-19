import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const [{ data: profiles }, { data: spins }] = await Promise.all([
    supabaseAdmin.from('profiles').select('coins, gems, is_plus, is_elite'),
    supabaseAdmin.from('spin_history').select('spin_tier'),
  ])

  const totalCoins = profiles?.reduce((a, p) => a + (p.coins || 0), 0) || 0
  const totalGems = profiles?.reduce((a, p) => a + (p.gems || 0), 0) || 0
  const count = profiles?.length || 1

  const tierMap: Record<string, number> = {}
  spins?.forEach(s => { tierMap[s.spin_tier] = (tierMap[s.spin_tier] || 0) + 1 })

  return NextResponse.json({
    economy: {
      totalCoins,
      totalGems,
      plusCount: profiles?.filter(p => p.is_plus).length || 0,
      eliteCount: profiles?.filter(p => p.is_elite).length || 0,
      avgCoins: Math.round(totalCoins / count),
      avgGems: Math.round(totalGems / count),
    },
    spinStats: Object.entries(tierMap).map(([tier, c]) => ({ tier, count: c })),
  })
}

export async function POST(req: NextRequest) {
  const { username, type, amount } = await req.json()
  const { data: player } = await supabaseAdmin.from('profiles').select('id').eq('username', username).single()
  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

  if (type === 'coins') {
    const { data: current } = await supabaseAdmin.from('profiles').select('coins').eq('id', player.id).single()
    await supabaseAdmin.from('profiles').update({ coins: (current?.coins || 0) + amount }).eq('id', player.id)
  } else if (type === 'gems') {
    await supabaseAdmin.rpc('add_gems', { p_user_id: player.id, p_amount: amount })
  } else if (type === 'golden_tickets') {
    await supabaseAdmin.rpc('add_golden_tickets', { p_user_id: player.id, p_amount: amount })
  }

  return NextResponse.json({ success: true })
}
