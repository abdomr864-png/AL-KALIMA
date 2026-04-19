'use client'
import { useState, useEffect } from 'react'

export default function RevenuePage() {
  const [stats, setStats] = useState({
    plusCount: 0,
    eliteCount: 0,
    totalReferrals: 0,
    confirmedReferrals: 0,
  })
  const [recentSpins, setRecentSpins] = useState<Array<{
    id: string; prize_name: string; prize_rarity: string; spin_tier: string; created_at: string;
    player_id: string
  }>>([])

  useEffect(() => { loadRevenue() }, [])

  async function loadRevenue() {
    const res = await fetch('/api/revenue')
    const data = await res.json()

    setStats({
      plusCount: data.plusCount || 0,
      eliteCount: data.eliteCount || 0,
      totalReferrals: data.totalReferrals || 0,
      confirmedReferrals: data.confirmedReferrals || 0,
    })
    setRecentSpins(data.recentSpins || [])
  }

  // Estimated revenue (placeholder prices)
  const PLUS_PRICE = 4.99
  const ELITE_PRICE = 9.99

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Revenue</h1>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Plus subscribers', value: stats.plusCount, sub: `~$${(stats.plusCount * PLUS_PRICE).toFixed(0)}/mo` },
          { label: 'Elite subscribers', value: stats.eliteCount, sub: `~$${(stats.eliteCount * ELITE_PRICE).toFixed(0)}/mo` },
          { label: 'Est. MRR', value: `$${(stats.plusCount * PLUS_PRICE + stats.eliteCount * ELITE_PRICE).toFixed(0)}`, sub: 'Monthly recurring' },
          { label: 'Referrals', value: `${stats.confirmedReferrals}/${stats.totalReferrals}`, sub: 'Confirmed / Total' },
        ].map((s, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-gray-600 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Recent spins */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="font-semibold mb-3 text-sm text-gray-300">Recent gacha spins</h2>
        {recentSpins.length === 0 && <p className="text-gray-500 text-sm">No spins yet</p>}
        <div className="space-y-1">
          {recentSpins.map(s => (
            <div key={s.id} className="flex items-center gap-3 py-2 border-b border-gray-800 last:border-0">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                s.prize_rarity === 'legendary' ? 'bg-yellow-900/50 text-yellow-400' :
                s.prize_rarity === 'epic' ? 'bg-purple-900/50 text-purple-400' :
                s.prize_rarity === 'rare' ? 'bg-blue-900/50 text-blue-400' :
                'bg-gray-800 text-gray-400'
              }`}>
                {s.prize_rarity}
              </span>
              <span className="text-sm flex-1">{s.prize_name}</span>
              <span className="text-xs text-gray-500 capitalize">{s.spin_tier}</span>
              <span className="text-xs text-gray-600">{new Date(s.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
