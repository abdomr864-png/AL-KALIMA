import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const { titleAr, titleEn, bodyAr, bodyEn, audience, screen } = await req.json()

    // First check if push_token column exists by querying without filter
    const { error: colCheck } = await supabaseAdmin
      .from('profiles')
      .select('push_token')
      .limit(1)

    if (colCheck?.message?.includes('does not exist')) {
      return NextResponse.json({
        error: 'push_token column missing. Run this SQL in Supabase SQL Editor:\n\nALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token text;',
      }, { status: 500 })
    }

    let query = supabaseAdmin
      .from('profiles')
      .select('push_token, language')
      .not('push_token', 'is', null)
      .neq('push_token', '')

    if (audience === 'ar') query = query.eq('language', 'ar')
    else if (audience === 'en') query = query.eq('language', 'en')
    else if (audience === 'plus') query = query.eq('is_plus', true)
    else if (audience === 'elite') query = query.eq('is_elite', true)
    else if (audience === 'inactive_3') {
      const d = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0]
      query = query.lt('last_played_date', d)
    } else if (audience === 'inactive_7') {
      const d = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
      query = query.lt('last_played_date', d)
    }

    const { data: players, error } = await query.limit(10000)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (!players || players.length === 0) {
      const { count } = await supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true })
      return NextResponse.json({
        error: `No players with push tokens found. Total profiles in DB: ${count}. Players need to accept notification permission in the app first.`,
        debug: { totalProfiles: count, audience }
      }, { status: 404 })
    }

    const messages = players
      .filter(p => p.push_token?.startsWith('Expo'))
      .map(p => ({
        to: p.push_token,
        title: p.language === 'ar' ? (titleAr || titleEn) : (titleEn || titleAr),
        body: p.language === 'ar' ? (bodyAr || bodyEn) : (bodyEn || bodyAr),
        data: { screen },
        sound: 'default',
        badge: 1,
      }))

    if (messages.length === 0) {
      return NextResponse.json({
        error: `${players.length} players found but no valid Expo push tokens. Players need to grant notification permission in the app.`,
        debug: { playersFound: players.length, validTokens: 0 }
      }, { status: 404 })
    }

    let sent = 0
    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100)
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(batch),
      })
      sent += batch.length
    }

    // Log (ignore if table doesn't exist)
    await supabaseAdmin.from('notification_log').insert({
      title_ar: titleAr, title_en: titleEn,
      body_ar: bodyAr, body_en: bodyEn,
      audience, screen, sent_to: sent,
    }).then(() => {})

    return NextResponse.json({ success: true, sent })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
