'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Event, Participant } from '@/types'
import { formatDate } from '@/lib/utils'

interface DashboardClientProps {
  event: Event
  initialParticipants: Participant[]
}

export function DashboardClient({ event, initialParticipants }: DashboardClientProps) {
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`dashboard-${event.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'participants', filter: `event_id=eq.${event.id}` },
        (payload) => {
          setParticipants((prev) =>
            prev.map((p) => (p.id === payload.new.id ? { ...p, ...payload.new } as Participant : p))
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [event.id])

  const total = participants.length
  const checkedIn = participants.filter((p) => p.checked_in).length
  const remaining = total - checkedIn

  const byTeam = participants.reduce<Record<string, { total: number; checkedIn: number }>>((acc, p) => {
    const team = p.team ?? 'No team'
    if (!acc[team]) acc[team] = { total: 0, checkedIn: 0 }
    acc[team].total++
    if (p.checked_in) acc[team].checkedIn++
    return acc
  }, {})

  const recentCheckIns = [...participants]
    .filter((p) => p.checked_in && p.checked_in_at)
    .sort((a, b) => new Date(b.checked_in_at!).getTime() - new Date(a.checked_in_at!).getTime())
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

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total registered', value: total, color: 'text-gray-900' },
            { label: 'Checked in', value: checkedIn, color: 'text-green-600' },
            { label: 'Remaining', value: remaining, color: 'text-orange-500' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
              <p className={`text-4xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              {stat.label === 'Checked in' && total > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">{Math.round((checkedIn / total) * 100)}%</p>
              )}
            </div>
          ))}
        </div>

        {total > 0 && (
          <div className="mb-4">
            <div className="bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(checkedIn / total) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.keys(byTeam).length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">By team</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-5 py-2 text-xs font-medium text-gray-500">Team</th>
                    <th className="text-right px-5 py-2 text-xs font-medium text-gray-500">In</th>
                    <th className="text-right px-5 py-2 text-xs font-medium text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(byTeam)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([team, counts]) => (
                      <tr key={team}>
                        <td className="px-5 py-2.5 font-medium text-gray-900">{team}</td>
                        <td className="px-5 py-2.5 text-right text-green-600 font-medium">{counts.checkedIn}</td>
                        <td className="px-5 py-2.5 text-right text-gray-500">{counts.total}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Recent check-ins</h2>
            </div>
            <div className="divide-y divide-gray-100 max-h-72 overflow-auto">
              {recentCheckIns.length === 0 ? (
                <p className="px-5 py-4 text-sm text-gray-400">No check-ins yet</p>
              ) : (
                recentCheckIns.map((p) => (
                  <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.full_name}</p>
                      {p.team && <p className="text-xs text-gray-400">{p.team}</p>}
                    </div>
                    {p.checked_in_at && (
                      <p className="text-xs text-gray-400">
                        {new Date(p.checked_in_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
