'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  function login() {
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      localStorage.setItem('kalimat_admin_auth', 'true')
      router.push('/dashboard')
    } else {
      setError('Wrong password')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-full max-w-sm p-8">
        <h1 className="text-2xl font-bold text-center mb-1 text-white">كلمات</h1>
        <p className="text-center text-gray-500 text-sm mb-8">Admin Dashboard</p>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          placeholder="Admin password"
          className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm mb-3 outline-none focus:border-purple-500"
        />
        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
        <button
          onClick={login}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-3 font-semibold text-sm"
        >
          Login
        </button>
      </div>
    </div>
  )
}
