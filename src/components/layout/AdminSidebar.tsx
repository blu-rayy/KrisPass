'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  CalendarDaysIcon,
  QrCodeIcon,
  UsersIcon,
  IdentificationIcon,
  ArrowRightStartOnRectangleIcon,
} from '@heroicons/react/24/outline'

const navItems = [
  { href: '/admin/events', label: 'Events', icon: CalendarDaysIcon },
  { href: '/organizer', label: 'Scanner', icon: QrCodeIcon },
  { href: '/admin/organizers', label: 'Organizers', icon: IdentificationIcon },
  { href: '/admin/users', label: 'Users', icon: UsersIcon },
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
    <>
      {/* Desktop sidebar — always visible */}
      <aside className="hidden md:flex w-56 shrink-0 bg-white border-r border-gray-200 flex-col min-h-screen sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-gray-200">
          <span className="text-lg font-bold text-gray-900">KrisPass</span>
          <span className="ml-2 text-xs text-gray-400 font-medium uppercase tracking-wide">Admin</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors',
                  active
                    ? 'bg-violet-50 text-violet-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <ArrowRightStartOnRectangleIcon className="w-4 h-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav — always visible */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors',
                active ? 'text-violet-700 font-medium' : 'text-gray-500'
              )}
            >
              <item.icon className={cn('w-5 h-5', active ? 'text-violet-700' : 'text-gray-400')} />
              {item.label}
            </Link>
          )
        })}
        <button
          onClick={handleSignOut}
          className="flex-1 flex flex-col items-center gap-1 py-2 text-xs text-gray-500"
        >
          <ArrowRightStartOnRectangleIcon className="w-5 h-5 text-gray-400" />
          Sign out
        </button>
      </nav>
    </>
  )
}
