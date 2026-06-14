'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  Users,
  UserCog,
  User,
  QrCode,
  LogOut,
} from 'lucide-react'
import { logout } from '@/lib/actions/auth'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'

const coreNav = [
  { href: '/events', label: 'Events', icon: CalendarDays },
  { href: '/participants', label: 'Participants', icon: Users },
  { href: '/scan', label: 'Scan', icon: QrCode },
]

interface SidebarProps {
  profile: Profile
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)

  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col bg-gray-900 text-white h-screen sticky top-0">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-gray-800">
        <p className="font-semibold text-violet-400 tracking-wide text-sm">KrisPass</p>
        <p className="text-xs text-gray-500 mt-0.5">FEU Tech ACM</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {coreNav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
              isActive(href)
                ? 'bg-violet-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            )}
          >
            <Icon size={16} strokeWidth={1.75} />
            {label}
          </Link>
        ))}

        <Link
          href="/users"
          className={cn(
            'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
            isActive('/users')
              ? 'bg-violet-600 text-white'
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          )}
        >
          <UserCog size={16} strokeWidth={1.75} />
          Users
        </Link>
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-gray-800 space-y-0.5">
        <Link
          href="/profile"
          className={cn(
            'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
            pathname === '/profile'
              ? 'bg-violet-600 text-white'
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          )}
        >
          <User size={16} strokeWidth={1.75} />
          <span className="flex-1 truncate">{profile.full_name}</span>
        </Link>

        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors text-left"
          >
            <LogOut size={16} strokeWidth={1.75} />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
