'use client'
import { useState, useEffect } from 'react'

interface Stats {
  totalPlayers: number
  dauAr: number
  dauEn: number
  successRate: number
  avgAttempts: string
  todayWords: Array<{ id: string; word: string; language: string; category?: string }>
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/admin-data').then(r => r.json()).then(setStats)
  }, [])

  if (!stats) return <div className="text-gray-500">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <span className="text-xs text-green-400 flex items-center gap-1.5">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Live &middot; {stats.dauAr + stats.dauEn} players today
        </span>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total players', value: stats.totalPlayers.toLocaleString(), sub: 'All time' },
          { label: 'Arabic DAU', value: stats.dauAr.toLocaleString(), sub: 'Today' },
          { label: 'English DAU', value: stats.dauEn.toLocaleString(), sub: 'Today' },
          { label: 'Success rate', value: `${stats.successRate}%`, sub: `Avg ${stats.avgAttempts} attempts` },
        ].map((s, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-gray-600 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <h2 className="font-semibold mb-3 text-sm text-gray-300">Today&apos;s daily words</h2>
        {stats.todayWords.length === 0 && (
          <p className="text-yellow-400 text-sm">No word set for today!</p>
        )}
        {stats.todayWords.map(w => (
          <div key={w.id} className="flex items-center gap-4 py-2">
            <span className="text-lg font-bold">{w.word}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${w.language === 'ar' ? 'bg-purple-900/50 text-purple-400' : 'bg-blue-900/50 text-blue-400'}`}>
              {w.language === 'ar' ? 'Arabic' : 'English'}
            </span>
            {w.category && <span className="text-xs text-gray-500">{w.category}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
