'use client'
import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'

export default function AnalyticsPage() {
  const [dauData, setDauData] = useState<Array<{ date: string; ar: number; en: number }>>([])
  const [modeData, setModeData] = useState<Array<{ name: string; count: number }>>([])
  const [streakDistribution, setStreakDistribution] = useState<Array<{ bucket: string; count: number }>>([])
  const [period, setPeriod] = useState(14)

  useEffect(() => { loadAnalytics() }, [period])

  async function loadAnalytics() {
    const res = await fetch(`/api/analytics?period=${period}`)
    const data = await res.json()
    setDauData(data.dau || [])
    setModeData(data.modes || [])
    setStreakDistribution(data.streaks || [])
  }

  const COLORS = ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899']

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <select value={period} onChange={e => setPeriod(Number(e.target.value))}
          className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-white text-sm outline-none">
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {/* DAU chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <h2 className="font-semibold mb-4 text-sm text-gray-300">Daily Active Users</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dauData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 8 }} />
            <Line type="monotone" dataKey="ar" stroke="#7C3AED" strokeWidth={2} name="Arabic" dot={false} />
            <Line type="monotone" dataKey="en" stroke="#3B82F6" strokeWidth={2} name="English" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Mode popularity */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold mb-4 text-sm text-gray-300">Game Mode Popularity</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={modeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 8 }} />
              <Bar dataKey="count" fill="#7C3AED" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Streak distribution */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold mb-4 text-sm text-gray-300">Streak Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={streakDistribution} dataKey="count" nameKey="bucket" cx="50%" cy="50%" outerRadius={90} label={((props: any) => `${props.name || ''}: ${props.value || 0}`) as any}>
                {streakDistribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
