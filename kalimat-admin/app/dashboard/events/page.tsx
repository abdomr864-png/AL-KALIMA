'use client'
import { useState, useEffect } from 'react'

interface Event {
  id: string
  name: string
  icon: string
  start_date: string
  end_date: string
  server: string
  type: string
  description?: string
  active: boolean
}

const OCCASIONS = [
  { name: 'New Year', nameAr: 'رأس السنة', date: '01-01', server: 'both', icon: '🎆' },
  { name: "Valentine's Day", nameAr: 'عيد الحب', date: '02-14', server: 'both', icon: '❤️' },
  { name: 'Ramadan', nameAr: 'رمضان الكريم', date: 'lunar', server: 'ar', icon: '🌙' },
  { name: 'Eid al-Fitr', nameAr: 'عيد الفطر', date: 'lunar', server: 'ar', icon: '🌙' },
  { name: 'April Fool', nameAr: 'كذبة أبريل', date: '04-01', server: 'both', icon: '🃏' },
  { name: 'Eid al-Adha', nameAr: 'عيد الأضحى', date: 'lunar', server: 'ar', icon: '🕋' },
  { name: 'Saudi National Day', nameAr: 'اليوم الوطني', date: '09-23', server: 'ar', icon: '🇸🇦' },
  { name: 'UAE National Day', nameAr: 'اليوم الوطني الإماراتي', date: '12-02', server: 'ar', icon: '🇦🇪' },
  { name: 'Halloween', nameAr: 'هالوين', date: '10-31', server: 'en', icon: '🎃' },
  { name: 'Christmas', nameAr: 'عيد الميلاد', date: '12-25', server: 'en', icon: '🎄' },
  { name: "New Year's Eve", nameAr: 'العد التنازلي', date: '12-31', server: 'both', icon: '🎆' },
]

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '', server: 'both', type: 'theme', icon: '🎉', description: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { loadEvents() }, [])

  async function loadEvents() {
    const res = await fetch('/api/save-event')
    const data = await res.json()
    setEvents(data.events || [])
  }

  async function saveEvent() {
    if (!form.name || !form.start_date) return
    setSaving(true)
    const res = await fetch('/api/save-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (data.success) {
      setMsg('Event saved!')
      setShowForm(false)
      loadEvents()
    } else {
      setMsg('Error: ' + data.error)
    }
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  async function deleteEvent(id: string) {
    if (!confirm('Delete this event?')) return
    await fetch(`/api/save-event?id=${id}`, { method: 'DELETE' })
    loadEvents()
  }

  function useOccasion(occ: typeof OCCASIONS[0]) {
    const year = new Date().getFullYear()
    setForm({
      name: `${occ.name} · ${occ.nameAr}`,
      start_date: occ.date !== 'lunar' ? `${year}-${occ.date}` : '',
      end_date: occ.date !== 'lunar' ? `${year}-${occ.date}` : '',
      server: occ.server,
      type: 'theme',
      icon: occ.icon,
      description: '',
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Events</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-semibold">
          + Create event
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h2 className="font-semibold mb-4 text-sm text-gray-300">New event</h2>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Event name</label>
              <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                placeholder="e.g. Ramadan Mode" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Icon</label>
              <input value={form.icon} onChange={e => setForm(f => ({...f, icon: e.target.value}))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Server</label>
              <select value={form.server} onChange={e => setForm(f => ({...f, server: e.target.value}))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none">
                <option value="both">Both servers</option>
                <option value="ar">Arabic only</option>
                <option value="en">English only</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Start date</label>
              <input type="date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">End date</label>
              <input type="date" value={form.end_date} onChange={e => setForm(f => ({...f, end_date: e.target.value}))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none">
                <option value="theme">Theme change</option>
                <option value="double_coins">Double coins</option>
                <option value="flash_sale">Flash sale</option>
                <option value="special_mode">Special mode</option>
              </select>
            </div>
          </div>
          <div className="mb-3">
            <label className="text-xs text-gray-400 block mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
              placeholder="What does this event do in the app?"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none h-16" />
          </div>
          <div className="flex gap-3">
            <button onClick={saveEvent} disabled={saving}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-2.5 font-semibold text-sm">
              {saving ? 'Saving...' : 'Save event'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 bg-gray-800 text-gray-400 rounded-xl text-sm">Cancel</button>
          </div>
          {msg && <p className={`text-xs mt-2 ${msg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>{msg}</p>}
        </div>
      )}

      {/* Saved events */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
        <h2 className="font-semibold mb-3 text-sm text-gray-300">Scheduled events</h2>
        {events.length === 0 && <p className="text-gray-500 text-sm">No events yet</p>}
        {events.map(e => {
          const isLive = e.start_date <= today && e.end_date >= today
          const isPast = e.end_date < today
          return (
            <div key={e.id} className="flex items-center gap-3 py-2.5 border-b border-gray-800 last:border-0">
              <span className="text-xl w-7 text-center">{e.icon}</span>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">{e.name}</div>
                <div className="text-xs text-gray-500">{e.start_date} &ndash; {e.end_date} &middot; {e.server}</div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${isLive ? 'bg-green-900 text-green-400' : isPast ? 'bg-gray-800 text-gray-500' : 'bg-blue-900 text-blue-400'}`}>
                {isLive ? 'Live' : isPast ? 'Past' : 'Upcoming'}
              </span>
              <button onClick={() => deleteEvent(e.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
            </div>
          )
        })}
      </div>

      {/* Occasions calendar */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="font-semibold mb-3 text-sm text-gray-300">Occasions calendar &mdash; click to create event</h2>
        <div className="grid grid-cols-2 gap-2">
          {OCCASIONS.map((occ, i) => (
            <button key={i} onClick={() => useOccasion(occ)}
              className="flex items-center gap-3 p-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-left transition-colors">
              <span className="text-xl">{occ.icon}</span>
              <div>
                <div className="text-sm font-medium text-white">{occ.name}</div>
                <div className="text-xs text-gray-500">{occ.nameAr} &middot; {occ.server === 'ar' ? 'Arabic' : occ.server === 'en' ? 'English' : 'Both'}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
