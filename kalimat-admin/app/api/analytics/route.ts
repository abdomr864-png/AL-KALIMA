import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const period = Number(req.nextUrl.searchParams.get('period') || '14')
  const startDate = new Date(Date.now() - period * 86400000).toISOString().split('T')[0]

  const [
    { data: dailyResults },
    { count: dailyCount },
    { count: duelCount },
    { count: rushCount },
    { count: blitzCount },
    { count: chainCount },
    { count: blindCount },
    { data: profiles },
  ] = await Promise.all([
    supabaseAdmin.from('daily_results').select('word_date, language, player_id').gte('word_date', startDate),
    supabaseAdmin.from('daily_results').select('id', { count: 'exact', head: true }).gte('created_at', startDate),
    supabaseAdmin.from('duels').select('id', { count: 'exact', head: true }).gte('created_at', startDate),
    supabaseAdmin.from('rush_results').select('id', { count: 'exact', head: true }).gte('created_at', startDate),
    supabaseAdmin.from('blitz_scores').select('id', { count: 'exact', head: true }).gte('created_at', startDate),
    supabaseAdmin.from('chain_results').select('id', { count: 'exact', head: true }).gte('created_at', startDate),
    supabaseAdmin.from('blind_results').select('id', { count: 'exact', head: true }).gte('created_at', startDate),
    supabaseAdmin.from('profiles').select('current_streak'),
  ])

  // DAU
  const dauMap: Record<string, { ar: Set<string>; en: Set<string> }> = {}
  dailyResults?.forEach(r => {
    if (!dauMap[r.word_date]) dauMap[r.word_date] = { ar: new Set(), en: new Set() }
    dauMap[r.word_date][r.language === 'en' ? 'en' : 'ar'].add(r.player_id)
  })
  const dau = Object.entries(dauMap)
    .map(([date, langs]) => ({ date: date.slice(5), ar: langs.ar.size, en: langs.en.size }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Modes
  const modes = [
    { name: 'Daily', count: dailyCount || 0 },
    { name: 'Duels', count: duelCount || 0 },
    { name: 'Rush', count: rushCount || 0 },
    { name: 'Blitz', count: blitzCount || 0 },
    { name: 'Chain', count: chainCount || 0 },
    { name: 'Blind', count: blindCount || 0 },
  ]

  // Streaks
  const buckets: Record<string, number> = { '0': 0, '1-3': 0, '4-7': 0, '8-14': 0, '15-30': 0, '30+': 0 }
  profiles?.forEach(p => {
    const s = p.current_streak || 0
    if (s === 0) buckets['0']++
    else if (s <= 3) buckets['1-3']++
    else if (s <= 7) buckets['4-7']++
    else if (s <= 14) buckets['8-14']++
    else if (s <= 30) buckets['15-30']++
    else buckets['30+']++
  })

  return NextResponse.json({
    dau,
    modes,
    streaks: Object.entries(buckets).map(([bucket, count]) => ({ bucket, count })),
  })
}
