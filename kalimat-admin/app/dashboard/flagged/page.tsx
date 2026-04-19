'use client'
import { useState, useEffect } from 'react'

interface FlaggedPlayer {
  id: string
  username: string
  is_flagged: boolean
  flag_reason: string | null
  flagged_at: string | null
  total_games: number
  total_wins: number
  current_streak: number
  device_id: string | null
}

interface FlaggedResult {
  id: string
  player_id: string
  word_date: string
  attempts: number
  duration_seconds: number | null
  flag_reason: string | null
  profiles: { username: string } | null
}

export default function FlaggedPage() {
  const [players, setPlayers] = useState<FlaggedPlayer[]>([])
  const [results, setResults] = useState<FlaggedResult[]>([])

  useEffect(() => {
    loadFlagged()
  }, [])

  async function loadFlagged() {
    const res = await fetch('/api/flagged')
    const data = await res.json()
    setPlayers(data.players || [])
    setResults(data.results || [])
  }

  async function unflagPlayer(id: string) {
    await fetch('/api/flagged', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unflag', id, type: 'player' }) })
    loadFlagged()
  }

  async function banPlayer(id: string) {
    if (!confirm('Ban this player? This will delete their profile.')) return
    await fetch('/api/flagged', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ban', id, type: 'player' }) })
    loadFlagged()
  }

  async function unflagResult(id: string) {
    await fetch('/api/flagged', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unflag', id, type: 'result' }) })
    loadFlagged()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Flagged / Anti-Cheat</h1>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
        <h2 className="font-semibold mb-3 text-sm text-gray-300">Flagged players ({players.length})</h2>
        {players.length === 0 && <p className="text-gray-500 text-sm">No flagged players</p>}
        {players.map(p => (
          <div key={p.id} className="flex items-center gap-4 py-3 border-b border-gray-800 last:border-0">
            <div className="flex-1">
              <div className="font-medium">{p.username}</div>
              <div className="text-xs text-gray-500">
                {p.flag_reason} &middot; {p.flagged_at ? new Date(p.flagged_at).toLocaleDateString() : ''}
              </div>
              <div className="text-xs text-gray-600">
                Games: {p.total_games} &middot; Wins: {p.total_wins} &middot; Streak: {p.current_streak}
                {p.device_id && <> &middot; Device: {p.device_id.slice(0, 12)}...</>}
              </div>
            </div>
            <button onClick={() => unflagPlayer(p.id)} className="text-xs bg-green-900/50 text-green-400 px-3 py-1.5 rounded-lg hover:bg-green-900">
              Unflag
            </button>
            <button onClick={() => banPlayer(p.id)} className="text-xs bg-red-900/50 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-900">
              Ban
            </button>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="font-semibold mb-3 text-sm text-gray-300">Flagged results ({results.length})</h2>
        {results.length === 0 && <p className="text-gray-500 text-sm">No flagged results</p>}
        {results.map(r => (
          <div key={r.id} className="flex items-center gap-4 py-2.5 border-b border-gray-800 last:border-0">
            <div className="flex-1">
              <div className="text-sm">
                <span className="font-medium">{(r.profiles as { username: string } | null)?.username}</span>
                <span className="text-gray-500"> &middot; {r.word_date}</span>
              </div>
              <div className="text-xs text-gray-500">
                {r.attempts} attempts &middot; {r.duration_seconds}s &middot; {r.flag_reason}
              </div>
            </div>
            <button onClick={() => unflagResult(r.id)} className="text-xs text-green-400 hover:text-green-300">
              Clear flag
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
