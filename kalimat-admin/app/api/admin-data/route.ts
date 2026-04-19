import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const today = new Date().toISOString().split('T')[0]

  const [
    { count: totalPlayers },
    { count: dauAr },
    { count: dauEn },
    { data: todayResults },
    { data: todayWords },
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('daily_results').select('id', { count: 'exact', head: true }).eq('word_date', today).eq('language', 'ar'),
    supabaseAdmin.from('daily_results').select('id', { count: 'exact', head: true }).eq('word_date', today).eq('language', 'en'),
    supabaseAdmin.from('daily_results').select('attempts, success').eq('word_date', today),
    supabaseAdmin.from('daily_words').select('*').eq('word_date', today),
  ])

  const successCount = todayResults?.filter(r => r.success).length || 0
  const totalCount = todayResults?.length || 0
  const successRate = totalCount > 0 ? Math.round(successCount / totalCount * 100) : 0
  const avgAttempts = successCount > 0
    ? (todayResults!.filter(r => r.success).reduce((a, r) => a + r.attempts, 0) / successCount).toFixed(1)
    : '0'

  return NextResponse.json({
    totalPlayers: totalPlayers || 0,
    dauAr: dauAr || 0,
    dauEn: dauEn || 0,
    successRate,
    avgAttempts,
    todayWords: todayWords || [],
  })
}
