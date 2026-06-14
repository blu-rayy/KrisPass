'use client'

import { useRouter } from 'next/navigation'
import { Calendar } from 'lucide-react'

type EventOption = { id: string; name: string; starts_at: string | null }

interface Props {
  events: EventOption[]
  selectedId: string | null
}

export function EventPicker({ events, selectedId }: Props) {
  const router = useRouter()

  return (
    <div className="flex items-center gap-2">
      <Calendar size={14} className="text-gray-400 shrink-0" />
      <select
        value={selectedId ?? ''}
        onChange={(e) => {
          const id = e.target.value
          if (id) router.push(`/participants?event=${id}`)
          else router.push('/participants')
        }}
        className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
      >
        <option value="">— Select an event —</option>
        {events.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>
    </div>
  )
}
