'use client'
import { useState } from 'react'

export default function NotificationsPage() {
  const [form, setForm] = useState({
    titleAr: '', titleEn: '', bodyAr: '', bodyEn: '',
    audience: 'all', screen: '/daily',
  })
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState('')

  async function sendNotification() {
    if (!form.titleAr && !form.titleEn) { setResult('Please enter a title'); return }
    setSending(true)
    setResult('')

    try {
      const res = await fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (data.success) {
        setResult(`Sent to ${data.sent} players successfully`)
      } else {
        setResult(data.error || 'Unknown error')
      }
    } catch (err: any) {
      setResult(`Network error: ${err.message}`)
    }

    setSending(false)
  }

  const TEMPLATES = [
    { label: 'Daily word ready', ar: 'كلمة اليوم جاهزة ☀️', en: "Today's word is ready ☀️", screen: '/daily' },
    { label: 'Streak danger', ar: '⚠️ سلسلتك على وشك الانكسار', en: '⚠️ Your streak is about to break!', screen: '/daily' },
    { label: 'Flash sale', ar: '⚡ تخفيضات لساعتين فقط!', en: '⚡ Flash sale — 2 hours only!', screen: '/shop' },
    { label: 'Double coins', ar: '🪙 عملات مضاعفة الآن!', en: '🪙 Double coins this weekend!', screen: '/' },
    { label: 'Welcome back', ar: '👋 افتقدناك! هدية تنتظرك', en: '👋 We missed you! A gift awaits', screen: '/' },
    { label: 'New event live', ar: '🎉 حدث جديد بدأ الآن!', en: '🎉 New event is live now!', screen: '/' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Push Notifications</h1>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold mb-4 text-sm text-gray-300">Send notification</h2>

          <label className="text-xs text-gray-400 block mb-1">Audience</label>
          <select value={form.audience} onChange={e => setForm(f => ({...f, audience: e.target.value}))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm mb-3 outline-none">
            <option value="all">All players</option>
            <option value="ar">Arabic server only</option>
            <option value="en">English server only</option>
            <option value="plus">Plus subscribers</option>
            <option value="elite">Elite subscribers</option>
            <option value="inactive_3">Inactive 3+ days</option>
            <option value="inactive_7">Inactive 7+ days</option>
          </select>

          <label className="text-xs text-gray-400 block mb-1">Title (Arabic)</label>
          <input value={form.titleAr} onChange={e => setForm(f => ({...f, titleAr: e.target.value}))}
            placeholder="كلمة اليوم جاهزة ☀️"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm mb-3 outline-none focus:border-purple-500" />

          <label className="text-xs text-gray-400 block mb-1">Title (English)</label>
          <input value={form.titleEn} onChange={e => setForm(f => ({...f, titleEn: e.target.value}))}
            placeholder="Today's word is ready ☀️"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm mb-3 outline-none focus:border-purple-500" />

          <label className="text-xs text-gray-400 block mb-1">Body (Arabic)</label>
          <textarea value={form.bodyAr} onChange={e => setForm(f => ({...f, bodyAr: e.target.value}))}
            placeholder="افتح التطبيق وحاول أن تكون الأول..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm mb-3 outline-none resize-none h-16" />

          <label className="text-xs text-gray-400 block mb-1">Body (English)</label>
          <textarea value={form.bodyEn} onChange={e => setForm(f => ({...f, bodyEn: e.target.value}))}
            placeholder="Open the app and be the first to solve it..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm mb-3 outline-none resize-none h-16" />

          <label className="text-xs text-gray-400 block mb-1">Navigate to</label>
          <select value={form.screen} onChange={e => setForm(f => ({...f, screen: e.target.value}))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm mb-4 outline-none">
            <option value="/daily">Daily word</option>
            <option value="/duel">Speed duel</option>
            <option value="/shop">Shop</option>
            <option value="/leaderboard">Leaderboard</option>
            <option value="/spin">Spin wheel</option>
            <option value="/">Home</option>
          </select>

          <button onClick={sendNotification} disabled={sending}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-xl py-2.5 font-semibold text-sm">
            {sending ? 'Sending...' : 'Send notification'}
          </button>
          {result && <p className="text-xs mt-2 text-green-400">{result}</p>}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="font-semibold mb-3 text-sm text-gray-300">Quick templates</h2>
          {TEMPLATES.map((t, i) => (
            <button key={i}
              onClick={() => setForm(f => ({...f, titleAr: t.ar, titleEn: t.en, screen: t.screen}))}
              className="flex items-center gap-3 w-full p-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl mb-2 text-left">
              <span className="text-xs text-gray-400 flex-1">{t.label}</span>
              <span className="text-xs text-purple-400">Use</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
