'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AttendanceRow {
  id: string
  participant_id: string
  scanned_at: string
  scanned_by: string | null
  participant_name: string
  scanner_name: string | null
}

interface LivePanelProps {
  eventId: string
  total: number
  totalOrganizers: number
  initialAttendances: AttendanceRow[]
  scannerMap: Record<string, string>
  orgParticipantIds: string[]
}

export function LivePanel({ eventId, total, totalOrganizers, initialAttendances, scannerMap, orgParticipantIds }: LivePanelProps) {
  const [attendances, setAttendances] = useState<AttendanceRow[]>(initialAttendances)
  const orgSet = new Set(orgParticipantIds)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`live-${eventId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'attendances', filter: `event_id=eq.${eventId}` },
        (payload) => {
          const row = payload.new as { id: string; participant_id: string; scanned_at: string; scanned_by: string | null }
          setAttendances((prev) => [
            {
              id: row.id,
              participant_id: row.participant_id,
              scanned_at: row.scanned_at,
              scanned_by: row.scanned_by,
              participant_name: 'Loading…',
              scanner_name: row.scanned_by ? (scannerMap[row.scanned_by] ?? null) : null,
            },
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
  }, [eventId, scannerMap])

  // Organizers don't count toward Attended
  const participantAttendances = attendances.filter((a) => !orgSet.has(a.participant_id))
  const checkedIn = participantAttendances.length

  const recent = [...attendances]
    .sort((a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime())

  const stats = [
    { label: 'Participants', value: total, color: 'text-gray-900' },
    { label: 'Attended', value: checkedIn, color: 'text-green-600' },
    { label: 'Organizers', value: totalOrganizers, color: 'text-violet-600' },
  ]

  return (
    <div className="mt-4 flex flex-col sm:flex-row gap-4 items-stretch">
      {/* Stats */}
      {stats.map((s) => (
        <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center sm:w-36 shrink-0 flex flex-col items-center justify-center">
          <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
        </div>
      ))}

      {/* Recent check-ins */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <h3 className="text-sm font-semibold text-gray-700">Recent check-ins</h3>
          <span className="ml-auto text-xs text-gray-400">{attendances.length} total</span>
        </div>
        <div className="divide-y divide-gray-100 overflow-auto flex-1">
          {recent.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-400">No check-ins yet</p>
          ) : (
            recent.map((a) => (
              <div key={a.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{a.participant_name}</p>
                    {orgSet.has(a.participant_id) && (
                      <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 shrink-0">Organizer</span>
                    )}
                  </div>
                  {a.scanner_name && (
                    <p className="text-xs text-gray-400 mt-0.5">Scanned by {a.scanner_name}</p>
                  )}
                </div>
                <p className="text-xs text-gray-400 shrink-0 tabular-nums">
                  {new Date(a.scanned_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
