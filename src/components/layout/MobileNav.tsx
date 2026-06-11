'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Users, QrCode, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const mobileNav = [
  { href: '/events', label: 'Events', icon: CalendarDays },
  { href: '/participants', label: 'People', icon: Users },
  { href: '/scan', label: 'Scan', icon: QrCode },
  { href: '/profile', label: 'Profile', icon: User },
]

export function MobileNav() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/events' ? pathname.startsWith('/events') : pathname === href

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-gray-900 border-t border-gray-800 z-50">
      <div className="flex">
        {mobileNav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 py-2.5 text-xs transition-colors',
              isActive(href) ? 'text-violet-400' : 'text-gray-500 hover:text-gray-300'
            )}
          >
            <Icon size={20} strokeWidth={1.75} />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
