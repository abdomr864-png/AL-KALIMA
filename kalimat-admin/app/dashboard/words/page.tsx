'use client'
import { useState, useEffect } from 'react'

interface Word {
  id: string
  word: string
  word_date: string
  language: string
  category?: string
}

const CATEGORIES_AR = ['طعام', 'حيوانات', 'طبيعة', 'جسم', 'منزل', 'مشاعر', 'أفعال', 'ألوان', 'رياضة']
const CATEGORIES_EN = ['food', 'animals', 'nature', 'body', 'home', 'emotions', 'actions', 'sports', 'space']

export default function WordsPage() {
  const [words, setWords] = useState<Word[]>([])
  const [form, setForm] = useState({ word: '', word_date: '', category: '', language: 'ar' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { loadWords() }, [])

  async function loadWords() {
    const res = await fetch('/api/save-word')
    const data = await res.json()
    setWords(data.words || [])
  }

  async function saveWord() {
    if (!form.word || !form.word_date) return
    setSaving(true)
    const res = await fetch('/api/save-word', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()

    if (data.success) {
      setMsg('Word saved!')
      setForm({ word: '', word_date: '', category: '', language: 'ar' })
      loadWords()
    } else {
      setMsg('Error: ' + data.error)
    }
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  async function deleteWord(id: string) {
    if (!confirm('Delete this word?')) return
    await fetch(`/api/save-word?id=${id}`, { method: 'DELETE' })
    loadWords()
  }

  const categories = form.language === 'ar' ? CATEGORIES_AR : CATEGORIES_EN

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Daily Words</h1>
      <div className="grid grid-cols-2 gap-6">
        {/* Word schedule */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="font-semibold mb-3 text-sm text-gray-300">Upcoming schedule</h2>
          <div className="space-y-1">
            {words.length === 0 && <p className="text-gray-500 text-sm">No upcoming words scheduled</p>}
            {words.map(w => (
              <div key={w.id} className="flex items-center gap-3 py-2 border-b border-gray-800 last:border-0">
                <span className="text-xs text-gray-500 w-24">{w.word_date}</span>
                <span className="font-medium flex-1">{w.word}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${w.language === 'ar' ? 'bg-purple-900/50 text-purple-400' : 'bg-blue-900/50 text-blue-400'}`}>
                  {w.language === 'ar' ? 'AR' : 'EN'}
                </span>
                <span className="text-xs text-gray-500 w-16">{w.category}</span>
                <button onClick={() => deleteWord(w.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
              </div>
            ))}
          </div>
        </div>

        {/* Add word form */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold mb-4 text-sm text-gray-300">Add / edit word</h2>

          <label className="text-xs text-gray-400 block mb-1">Word</label>
          <input
            value={form.word}
            onChange={e => setForm(f => ({ ...f, word: e.target.value }))}
            placeholder="e.g. كتاب or TIGER"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm mb-3 outline-none focus:border-purple-500"
          />

          <label className="text-xs text-gray-400 block mb-1">Date</label>
          <input
            type="date"
            value={form.word_date}
            onChange={e => setForm(f => ({ ...f, word_date: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm mb-3 outline-none focus:border-purple-500"
          />

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Server</label>
              <select
                value={form.language}
                onChange={e => setForm(f => ({ ...f, language: e.target.value, category: '' }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none"
              >
                <option value="ar">Arabic</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none"
              >
                <option value="">None</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={saveWord}
            disabled={saving}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-xl py-2.5 font-semibold text-sm"
          >
            {saving ? 'Saving...' : 'Save word'}
          </button>
          {msg && (
            <p className={`text-xs mt-2 ${msg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>{msg}</p>
          )}
        </div>
      </div>
    </div>
  )
}
