'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Event } from '@/types'
import { formatDate } from '@/lib/utils'

interface AttendanceRow {
  id: string
  participant_id: string
  scanned_at: string
  participant_name: string
  team_name: string | null
}

interface DashboardClientProps {
  event: Event
  total: number
  initialAttendances: AttendanceRow[]
}

export function DashboardClient({ event, total, initialAttendances }: DashboardClientProps) {
  const [attendances, setAttendances] = useState<AttendanceRow[]>(initialAttendances)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`dashboard-${event.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'attendances', filter: `event_id=eq.${event.id}` },
        (payload) => {
          const row = payload.new as { id: string; participant_id: string; scanned_at: string }
          setAttendances((prev) => [
            {
              id: row.id,
              participant_id: row.participant_id,
              scanned_at: row.scanned_at,
              participant_name: 'Loading…',
              team_name: null,
            },
            ...prev,
          ])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [event.id])

  const checkedIn = attendances.length
  const remaining = total - checkedIn

  const recent = [...attendances]
    .sort((a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime())
    .slice(0, 20)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
          <p className="text-sm text-gray-500">{formatDate(event.event_date)}{event.location && ` · ${event.location}`}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-gray-400">Live</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total on roster', value: total, color: 'text-gray-900' },
            { label: 'Attended', value: checkedIn, color: 'text-green-600' },
            { label: 'Remaining', value: remaining, color: 'text-orange-500' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 p-3 md:p-6 text-center">
              <p className={`text-2xl md:text-4xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs md:text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {total > 0 && (
          <div className="mb-6">
            <div className="bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(checkedIn / total) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Recent attendances</h2>
          </div>
          <div className="divide-y divide-gray-100 max-h-96 overflow-auto">
            {recent.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-400">No attendances yet</p>
            ) : (
              recent.map((a) => (
                <div key={a.id} className="px-5 py-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{a.participant_name}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(a.scanned_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
