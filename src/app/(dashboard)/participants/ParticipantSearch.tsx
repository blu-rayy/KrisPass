'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useTransition, useRef, useCallback } from 'react'
import { Search } from 'lucide-react'

interface Props {
  defaultValue?: string
}

export function ParticipantSearch({ defaultValue }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const handleChange = useCallback(
    (value: string) => {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        startTransition(() => {
          const params = new URLSearchParams()
          if (value.trim()) params.set('q', value.trim())
          router.replace(`${pathname}?${params.toString()}`)
        })
      }, 300)
    },
    [router, pathname]
  )

  return (
    <div className="relative">
      <Search
        size={14}
        className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
          isPending ? 'text-violet-400' : 'text-gray-400'
        }`}
      />
      <input
        type="search"
        defaultValue={defaultValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Search by name, student number, or email…"
        className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
      />
    </div>
  )
}
