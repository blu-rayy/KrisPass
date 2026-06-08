'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TicketIcon } from '@heroicons/react/24/outline'

interface OrganizerRow {
  id: string
  first_name: string
  last_name: string
  middle_initial: string | null
  role: string
  committee: string | null
  school_email: string | null
  student_number: string | null
  assignments: { event_id: string; event_name: string; qr_token: string }[]
}

interface Event {
  id: string
  name: string
}

export function OrganizerList({
  organizers,
  events,
  appUrl,
}: {
  organizers: OrganizerRow[]
  events: Event[]
  appUrl: string
}) {
  const [assigning, setAssigning] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Record<string, string>>({})
  const [rows, setRows] = useState(organizers)

  async function assign(profileId: string) {
    const eventId = selectedEvent[profileId]
    if (!eventId) return
    setAssigning(profileId)
    const res = await fetch('/api/organizers/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: profileId, event_id: eventId }),
    })
    const data = await res.json()
    if (res.ok && !data.already_assigned) {
      const eventName = events.find((e) => e.id === eventId)?.name ?? ''
      setRows((prev) =>
        prev.map((o) =>
          o.id === profileId
            ? { ...o, assignments: [...o.assignments, { event_id: eventId, event_name: eventName, qr_token: data.qr_token }] }
            : o
        )
      )
    }
    setAssigning(null)
  }

  async function remove(profileId: string, eventId: string) {
    setRemoving(`${profileId}-${eventId}`)
    await fetch('/api/organizers/assign', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: profileId, event_id: eventId }),
    })
    setRows((prev) =>
      prev.map((o) =>
        o.id === profileId
          ? { ...o, assignments: o.assignments.filter((a) => a.event_id !== eventId) }
          : o
      )
    )
    setRemoving(null)
  }

  const roleBadge: Record<string, string> = {
    organizer: 'bg-violet-100 text-violet-700',
    scanner: 'bg-blue-100 text-blue-700',
    admin: 'bg-gray-100 text-gray-700',
  }

  return (
    <div className="space-y-3">
      {rows.map((o) => {
        const name = `${o.last_name}, ${o.first_name}${o.middle_initial ? ` ${o.middle_initial}.` : ''}`
        const unassignedEvents = events.filter((e) => !o.assignments.find((a) => a.event_id === e.id))

        return (
          <div key={o.id} className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              {/* Info */}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900">{name}</p>
                  <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${roleBadge[o.role] ?? 'bg-gray-100 text-gray-700'}`}>
                    {o.role}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                  {o.school_email && <p className="text-xs text-gray-400">{o.school_email}</p>}
                  {o.student_number && <p className="text-xs text-gray-400">{o.student_number}</p>}
                  {o.committee && <p className="text-xs text-gray-400">{o.committee}</p>}
                </div>
              </div>

              {/* Assign to event */}
              {unassignedEvents.length > 0 && (
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={selectedEvent[o.id] ?? ''}
                    onChange={(e) => setSelectedEvent((p) => ({ ...p, [o.id]: e.target.value }))}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="">Select event…</option>
                    {unassignedEvents.map((e) => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => assign(o.id)}
                    disabled={!selectedEvent[o.id] || assigning === o.id}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 transition-colors"
                  >
                    {assigning === o.id ? 'Assigning…' : 'Assign'}
                  </button>
                </div>
              )}
            </div>

            {/* Event assignments */}
            {o.assignments.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Event passes</p>
                <div className="flex flex-wrap gap-2">
                  {o.assignments.map((a) => (
                    <div key={a.event_id} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                      <TicketIcon className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                      <span className="text-xs text-gray-700 font-medium">{a.event_name}</span>
                      <Link
                        href={`${appUrl}/pass/${a.qr_token}`}
                        target="_blank"
                        className="text-[10px] text-violet-600 hover:text-violet-800 font-medium ml-1"
                      >
                        View pass
                      </Link>
                      <button
                        onClick={() => remove(o.id, a.event_id)}
                        disabled={removing === `${o.id}-${a.event_id}`}
                        className="text-[10px] text-red-400 hover:text-red-600 ml-1 disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
