'use client'
import { useState, useEffect } from 'react'

interface SpinStats {
  tier: string
  count: number
}

export default function ShopPage() {
  const [spinStats, setSpinStats] = useState<SpinStats[]>([])
  const [economyStats, setEconomyStats] = useState({
    totalCoins: 0,
    totalGems: 0,
    plusCount: 0,
    eliteCount: 0,
    avgCoins: 0,
    avgGems: 0,
  })
  const [grantForm, setGrantForm] = useState({ username: '', type: 'coins', amount: '' })
  const [grantMsg, setGrantMsg] = useState('')

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    const res = await fetch('/api/shop')
    const data = await res.json()
    if (data.economy) setEconomyStats(data.economy)
    if (data.spinStats) setSpinStats(data.spinStats)
  }

  async function grantReward() {
    if (!grantForm.username || !grantForm.amount) return
    const res = await fetch('/api/shop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: grantForm.username, type: grantForm.type, amount: Number(grantForm.amount) }),
    })
    const data = await res.json()
    if (data.error) { setGrantMsg(data.error); return }
    setGrantMsg(`Granted ${grantForm.amount} ${grantForm.type} to ${grantForm.username}`)
    setGrantForm({ username: '', type: 'coins', amount: '' })
    setTimeout(() => setGrantMsg(''), 3000)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Shop & Economy</h1>

      {/* Economy overview */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total coins in circulation', value: economyStats.totalCoins.toLocaleString(), sub: `Avg ${economyStats.avgCoins}/player` },
          { label: 'Total gems in circulation', value: economyStats.totalGems.toLocaleString(), sub: `Avg ${economyStats.avgGems}/player` },
          { label: 'Subscribers', value: `${economyStats.plusCount} Plus / ${economyStats.eliteCount} Elite`, sub: `${economyStats.plusCount + economyStats.eliteCount} total` },
        ].map((s, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-xl font-bold">{s.value}</p>
            <p className="text-xs text-gray-600 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Grant rewards */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold mb-4 text-sm text-gray-300">Grant reward to player</h2>
          <label className="text-xs text-gray-400 block mb-1">Username</label>
          <input value={grantForm.username} onChange={e => setGrantForm(f => ({...f, username: e.target.value}))}
            placeholder="Enter username"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm mb-3 outline-none focus:border-purple-500" />
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Type</label>
              <select value={grantForm.type} onChange={e => setGrantForm(f => ({...f, type: e.target.value}))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none">
                <option value="coins">Coins</option>
                <option value="gems">Gems</option>
                <option value="golden_tickets">Golden Tickets</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Amount</label>
              <input type="number" value={grantForm.amount} onChange={e => setGrantForm(f => ({...f, amount: e.target.value}))}
                placeholder="100"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none" />
            </div>
          </div>
          <button onClick={grantReward}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-2.5 font-semibold text-sm">
            Grant
          </button>
          {grantMsg && <p className={`text-xs mt-2 ${grantMsg.startsWith('Player') ? 'text-red-400' : 'text-green-400'}`}>{grantMsg}</p>}
        </div>

        {/* Spin stats */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold mb-4 text-sm text-gray-300">Gacha spin history</h2>
          {spinStats.length === 0 && <p className="text-gray-500 text-sm">No spins recorded yet</p>}
          {spinStats.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
              <span className="text-sm capitalize">{s.tier} tier</span>
              <span className="text-sm font-bold">{s.count.toLocaleString()} spins</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
