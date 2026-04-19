'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/dashboard/analytics', label: 'Analytics', icon: '📈' },
  { href: '/dashboard/words', label: 'Daily Words', icon: '📝' },
  { href: '/dashboard/events', label: 'Events', icon: '🎉' },
  { href: '/dashboard/notifications', label: 'Notifications', icon: '🔔' },
  { href: '/dashboard/players', label: 'Players', icon: '👥' },
  { href: '/dashboard/flagged', label: 'Flagged', icon: '🚩' },
  { href: '/dashboard/shop', label: 'Shop', icon: '💎' },
  { href: '/dashboard/revenue', label: 'Revenue', icon: '💰' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = localStorage.getItem('kalimat_admin_auth')
      if (!auth) router.push('/login')
    }
  }, [router])

  return (
    <div className="flex h-screen bg-black">
      {/* Sidebar */}
      <aside className="w-56 border-r border-gray-800 flex flex-col p-4 shrink-0">
        <div className="mb-8">
          <h1 className="text-lg font-bold text-purple-400">كلمات</h1>
          <p className="text-xs text-gray-500">Admin Dashboard</p>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV.map(item => (
            <Link key={item.href} href={item.href}>
              <div className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname === item.href
                  ? 'bg-purple-600/20 text-purple-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-900'
              }`}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            </Link>
          ))}
        </nav>
        <div className="pt-4 border-t border-gray-800">
          <button
            onClick={() => { localStorage.removeItem('kalimat_admin_auth'); router.push('/login') }}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
