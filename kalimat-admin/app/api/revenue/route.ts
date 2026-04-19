import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const [
    { count: plusCount },
    { count: eliteCount },
    { count: totalReferrals },
    { count: confirmedReferrals },
    { data: spins },
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).eq('is_plus', true),
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).eq('is_elite', true),
    supabaseAdmin.from('referrals').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('referrals').select('id', { count: 'exact', head: true }).eq('status', 'confirmed'),
    supabaseAdmin.from('spin_history').select('*').order('created_at', { ascending: false }).limit(20),
  ])

  return NextResponse.json({
    plusCount: plusCount || 0,
    eliteCount: eliteCount || 0,
    totalReferrals: totalReferrals || 0,
    confirmedReferrals: confirmedReferrals || 0,
    recentSpins: spins || [],
  })
}
