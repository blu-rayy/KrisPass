'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/admin/events', label: 'Events' },
  { href: '/admin/users', label: 'Users' },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col min-h-screen">
      <div className="px-5 py-5 border-b border-gray-200">
        <span className="text-lg font-bold text-gray-900">KrisPass</span>
        <span className="ml-2 text-xs text-gray-400 font-medium uppercase tracking-wide">Admin</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center px-3 py-2 text-sm rounded-lg transition-colors',
              pathname.startsWith(item.href)
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-200">
        <button
          onClick={handleSignOut}
          className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
