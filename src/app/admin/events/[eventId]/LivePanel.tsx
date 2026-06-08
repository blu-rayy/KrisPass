'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AttendanceRow {
  id: string
  participant_id: string
  scanned_at: string
  participant_name: string
}

interface LivePanelProps {
  eventId: string
  total: number
  initialAttendances: AttendanceRow[]
}

export function LivePanel({ eventId, total, initialAttendances }: LivePanelProps) {
  const [attendances, setAttendances] = useState<AttendanceRow[]>(initialAttendances)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`live-${eventId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'attendances', filter: `event_id=eq.${eventId}` },
        (payload) => {
          const row = payload.new as { id: string; participant_id: string; scanned_at: string }
          setAttendances((prev) => [
            { id: row.id, participant_id: row.participant_id, scanned_at: row.scanned_at, participant_name: 'Loading…' },
            ...prev,
          ])
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'attendances', filter: `event_id=eq.${eventId}` },
        (payload) => {
          const row = payload.old as { id: string }
          setAttendances((prev) => prev.filter((a) => a.id !== row.id))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [eventId])

  const checkedIn = attendances.length
  const remaining = total - checkedIn
  const pct = total > 0 ? Math.round((checkedIn / total) * 100) : 0
  const recent = [...attendances]
    .sort((a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime())
    .slice(0, 10)

  return (
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Stats + progress */}
      <div className="lg:col-span-2 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Participants', value: total, color: 'text-gray-900' },
            { label: 'Attended', value: checkedIn, color: 'text-green-600' },
            { label: 'Remaining', value: remaining, color: 'text-orange-500' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-3 md:p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {total > 0 && (
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Check-in progress</span>
              <span>{pct}%</span>
            </div>
            <div className="bg-gray-200 rounded-full h-2">
              <div
                className="bg-violet-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Recent check-ins */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <h3 className="text-sm font-semibold text-gray-700">Recent check-ins</h3>
        </div>
        <div className="divide-y divide-gray-100 max-h-48 overflow-auto">
          {recent.length === 0 ? (
            <p className="px-4 py-4 text-sm text-gray-400">No check-ins yet</p>
          ) : (
            recent.map((a) => (
              <div key={a.id} className="px-4 py-2.5 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 truncate">{a.participant_name}</p>
                <p className="text-xs text-gray-400 shrink-0 ml-3">
                  {new Date(a.scanned_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
