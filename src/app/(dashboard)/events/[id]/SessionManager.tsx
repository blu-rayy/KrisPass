'use client'

import { useActionState, useState } from 'react'
import { addSession, deleteSession } from '@/lib/actions/events'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Plus, Trash2, CheckCircle, CalendarDays, ChevronDown } from 'lucide-react'

type Session = {
  id: string
  name: string | null
  starts_at: string
  ends_at: string | null
}

interface Props {
  eventId: string
  sessions: Session[]
}

function fmtSessionTime(iso: string): string {
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'UTC',
  })
}

export function SessionManager({ eventId, sessions }: Props) {
  const boundAdd = addSession.bind(null, eventId)
  const [state, addAction, pending] = useActionState(boundAdd, null)
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-4 flex items-center gap-2 hover:bg-gray-50 transition-colors text-left"
      >
        <CalendarDays size={15} className="text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-900">Sessions</h2>
        <span className="ml-auto text-xs text-gray-400 mr-2">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && <div className="border-t border-gray-100">

      {sessions.length > 0 ? (
        <div className="divide-y divide-gray-100">
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center px-5 py-3 gap-4">
              <div className="flex-1 min-w-0">
                {session.name && (
                  <p className="text-sm font-medium text-gray-900">{session.name}</p>
                )}
                <p className="text-xs text-gray-500">
                  {fmtSessionTime(session.starts_at)}
                  {session.ends_at && (
                    <span className="text-gray-400"> → {fmtSessionTime(session.ends_at)}</span>
                  )}
                </p>
              </div>
              <form action={deleteSession}>
                <input type="hidden" name="session_id" value={session.id} />
                <input type="hidden" name="event_id" value={eventId} />
                <button
                  type="submit"
                  className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded"
                  title="Remove session"
                >
                  <Trash2 size={13} />
                </button>
              </form>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-5 py-4 text-sm text-gray-400">No sessions added yet.</p>
      )}

      {/* Add session form */}
      <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
        <p className="text-xs font-medium text-gray-500 mb-3">Add session</p>
        <form action={addAction} className="space-y-3">
          <Input
            id="session-name"
            name="name"
            label="Session name"
            placeholder="e.g. Day 1"
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="starts_at" className="block text-xs font-medium text-gray-700">
                Start <span className="text-red-500">*</span>
              </label>
              <input
                id="starts_at"
                name="starts_at"
                type="datetime-local"
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="ends_at" className="block text-xs font-medium text-gray-700">
                End
              </label>
              <input
                id="ends_at"
                name="ends_at"
                type="datetime-local"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
          </div>

          {state?.ok === false && (
            <p className="text-xs text-red-600">{state.error}</p>
          )}
          {state?.ok === true && (
            <div className="flex items-center gap-1.5 text-xs text-green-700">
              <CheckCircle size={12} />
              Session added.
            </div>
          )}

          <Button type="submit" size="sm" disabled={pending}>
            <Plus size={13} />
            {pending ? 'Adding…' : 'Add session'}
          </Button>
        </form>
      </div>
      </div>}
    </div>
  )
}
