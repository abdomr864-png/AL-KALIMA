'use client'
import { useState, useEffect } from 'react'

interface Player {
  id: string
  username: string
  language: string
  total_games: number
  total_wins: number
  current_streak: number
  coins: number
  gems: number
  is_plus: boolean
  is_elite: boolean
  is_flagged: boolean
  is_online: boolean
  created_at: string
  last_played_date: string | null
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  useEffect(() => { loadPlayers() }, [search, filter, page])

  async function loadPlayers() {
    const params = new URLSearchParams({ search, filter, page: String(page) })
    const res = await fetch(`/api/players?${params}`)
    const data = await res.json()
    setPlayers(data.players || [])
    setTotal(data.total || 0)
  }

  async function giveCoins(playerId: string) {
    const amount = prompt('How many coins to give?')
    if (!amount || isNaN(Number(amount))) return
    await fetch('/api/players', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'give_coins', playerId, amount: Number(amount) }) })
    loadPlayers()
  }

  async function giveGems(playerId: string) {
    const amount = prompt('How many gems to give?')
    if (!amount || isNaN(Number(amount))) return
    await fetch('/api/players', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'give_gems', playerId, amount: Number(amount) }) })
    loadPlayers()
  }

  async function toggleFlag(playerId: string, currentlyFlagged: boolean) {
    await fetch('/api/players', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: currentlyFlagged ? 'unflag' : 'flag', playerId }) })
    loadPlayers()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Players</h1>
        <span className="text-sm text-gray-500">{total.toLocaleString()} total</span>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          placeholder="Search by username..."
          className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-purple-500"
        />
        <select value={filter} onChange={e => { setFilter(e.target.value); setPage(0) }}
          className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm outline-none">
          <option value="all">All</option>
          <option value="plus">Plus</option>
          <option value="elite">Elite</option>
          <option value="flagged">Flagged</option>
          <option value="online">Online</option>
        </select>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-xs">
              <th className="text-left px-4 py-3">Player</th>
              <th className="text-left px-4 py-3">Lang</th>
              <th className="text-left px-4 py-3">Games</th>
              <th className="text-left px-4 py-3">Streak</th>
              <th className="text-left px-4 py-3">Coins</th>
              <th className="text-left px-4 py-3">Gems</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {players.map(p => (
              <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3">
                  <div className="font-medium">{p.username}</div>
                  <div className="text-xs text-gray-600">{p.id.slice(0, 8)}...</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.language === 'ar' ? 'bg-purple-900/50 text-purple-400' : 'bg-blue-900/50 text-blue-400'}`}>
                    {p.language?.toUpperCase() || 'AR'}
                  </span>
                </td>
                <td className="px-4 py-3">{p.total_games}</td>
                <td className="px-4 py-3">{p.current_streak}</td>
                <td className="px-4 py-3">{p.coins}</td>
                <td className="px-4 py-3">{p.gems}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {p.is_plus && <span className="text-xs bg-yellow-900/50 text-yellow-400 px-1.5 py-0.5 rounded">Plus</span>}
                    {p.is_elite && <span className="text-xs bg-purple-900/50 text-purple-400 px-1.5 py-0.5 rounded">Elite</span>}
                    {p.is_flagged && <span className="text-xs bg-red-900/50 text-red-400 px-1.5 py-0.5 rounded">Flagged</span>}
                    {p.is_online && <span className="text-xs bg-green-900/50 text-green-400 px-1.5 py-0.5 rounded">Online</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => giveCoins(p.id)} className="text-xs text-yellow-400 hover:text-yellow-300">+Coins</button>
                    <button onClick={() => giveGems(p.id)} className="text-xs text-purple-400 hover:text-purple-300">+Gems</button>
                    <button onClick={() => toggleFlag(p.id, p.is_flagged)}
                      className={`text-xs ${p.is_flagged ? 'text-green-400 hover:text-green-300' : 'text-red-400 hover:text-red-300'}`}>
                      {p.is_flagged ? 'Unflag' : 'Flag'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
          className="text-sm text-gray-400 hover:text-white disabled:text-gray-700">Previous</button>
        <span className="text-xs text-gray-500">Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= total}
          className="text-sm text-gray-400 hover:text-white disabled:text-gray-700">Next</button>
      </div>
    </div>
  )
}
