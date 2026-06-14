'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Users, QrCode, User, UserCog } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Role } from '@/types'

interface Props {
  role: Role
}

export function MobileNav({ role }: Props) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)

  const nav = [
    { href: '/events', label: 'Events', icon: CalendarDays },
    { href: '/participants', label: 'People', icon: Users },
    { href: '/scan', label: 'Scan', icon: QrCode },
    { href: '/users', label: 'Users', icon: UserCog },
    { href: '/profile', label: 'Profile', icon: User },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-gray-900 border-t border-gray-800 z-50">
      <div className="flex">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 py-2.5 text-xs transition-colors',
              isActive(href) ? 'text-violet-400' : 'text-gray-500 hover:text-gray-300'
            )}
          >
            <Icon size={18} strokeWidth={1.75} />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
