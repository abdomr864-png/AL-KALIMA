import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Runs all missing column additions and table creations
// Safe to run multiple times — all use IF NOT EXISTS / IF NOT EXISTS
export async function POST() {
  const results: string[] = []

  // Helper: run SQL via supabase rpc or raw
  async function addColumn(table: string, column: string, type: string, defaultVal?: string) {
    const def = defaultVal ? ` DEFAULT ${defaultVal}` : ''
    const { error } = await supabaseAdmin.rpc('exec_sql', {
      query: `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${type}${def}`
    })
    if (error) {
      // rpc might not exist, track it
      results.push(`${table}.${column}: ${error.message}`)
    } else {
      results.push(`${table}.${column}: OK`)
    }
  }

  // Missing profile columns
  await addColumn('profiles', 'push_token', 'text')
  await addColumn('profiles', 'language', "text", "'ar'")
  await addColumn('profiles', 'last_played_date', 'date')
  await addColumn('profiles', 'streak_freezes', 'int', '0')
  await addColumn('profiles', 'notifications_enabled', 'boolean', 'false')
  await addColumn('profiles', 'is_elite', 'boolean', 'false')
  await addColumn('profiles', 'elite_since', 'timestamptz')
  await addColumn('profiles', 'is_flagged', 'boolean', 'false')
  await addColumn('profiles', 'flag_reason', 'text')
  await addColumn('profiles', 'flagged_at', 'timestamptz')
  await addColumn('profiles', 'device_id', 'text')
  await addColumn('profiles', 'gems', 'int', '0')
  await addColumn('profiles', 'referral_code', 'text')
  await addColumn('profiles', 'referred_by', 'uuid')
  await addColumn('profiles', 'referral_count', 'int', '0')

  // Missing daily_results columns
  await addColumn('daily_results', 'language', "text", "'ar'")
  await addColumn('daily_results', 'is_flagged', 'boolean', 'false')
  await addColumn('daily_results', 'flag_reason', 'text')

  // Events table
  const { error: evErr } = await supabaseAdmin.rpc('exec_sql', {
    query: `CREATE TABLE IF NOT EXISTS events (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      name text NOT NULL, icon text DEFAULT '🎉',
      start_date date NOT NULL, end_date date NOT NULL,
      server text DEFAULT 'both', type text DEFAULT 'theme',
      description text, active boolean DEFAULT true,
      created_at timestamptz DEFAULT now()
    )`
  })
  results.push(`events table: ${evErr?.message || 'OK'}`)

  // Notification log table
  const { error: nlErr } = await supabaseAdmin.rpc('exec_sql', {
    query: `CREATE TABLE IF NOT EXISTS notification_log (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      title_ar text, title_en text, body_ar text, body_en text,
      audience text, screen text, sent_to int DEFAULT 0,
      sent_at timestamptz DEFAULT now()
    )`
  })
  results.push(`notification_log table: ${nlErr?.message || 'OK'}`)

  return NextResponse.json({ results })
}
