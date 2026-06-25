'use client'

import { useState, useMemo, useEffect } from 'react'
import { Clock, X, Filter } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { clearEventAttendances, deleteAttendance } from '@/lib/actions/attendance'
import { formatDateTime } from '@/lib/utils'

export type CheckInRow = {
  id: string
  participant_id: string
  scanned_at: string
  scanned_by: string | null
  participantName: string
  participantType: string
  sessionName: string | null
  teamName: string | null
  school: string | null
  degreeProgram: string | null
  scannerName: string | null
}

interface Props {
  eventId: string
  checkIns: CheckInRow[]
  isAdmin: boolean
}

type Filters = {
  type: string
  session: string
  team: string
  program: string
}

const PAGE_INITIAL = 25
const PAGE_MORE    = 50

export function CheckInsTable({ eventId, checkIns, isAdmin }: Props) {
  const [filters, setFilters]      = useState<Filters>({ type: '', session: '', team: '', program: '' })
  const [visibleCount, setVisible] = useState(PAGE_INITIAL)

  // Reset pagination when filters change
  useEffect(() => { setVisible(PAGE_INITIAL) }, [filters])

  // Unique option lists derived from data
  const sessions  = useMemo(() => [...new Set(checkIns.map((c) => c.sessionName).filter(Boolean) as string[])].sort(), [checkIns])
  const teams     = useMemo(() => [...new Set(checkIns.map((c) => c.teamName).filter(Boolean) as string[])].sort(), [checkIns])
  const programs  = useMemo(() => [...new Set(checkIns.map((c) => c.degreeProgram).filter(Boolean) as string[])].sort(), [checkIns])

  const filtered = useMemo(() => checkIns.filter((c) => {
    if (filters.type    && c.participantType !== filters.type)    return false
    if (filters.session && c.sessionName     !== filters.session) return false
    if (filters.team    && c.teamName        !== filters.team)    return false
    if (filters.program && c.degreeProgram   !== filters.program) return false
    return true
  }), [checkIns, filters])

  const visible    = filtered.slice(0, visibleCount)
  const remaining  = filtered.length - visibleCount

  const activeFilterCount = Object.values(filters).filter(Boolean).length
  const set = (key: keyof Filters) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    setFilters((f) => ({ ...f, [key]: e.target.value }))

  const selectCls = 'rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent'

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2 flex-wrap">
        <Clock size={15} className="text-gray-400 shrink-0" />
        <h2 className="text-sm font-semibold text-gray-900">Check-ins</h2>
        <span className="text-xs text-gray-400">
          {filtered.length !== checkIns.length
            ? `${filtered.length} of ${checkIns.length}`
            : `${checkIns.length} total`}
        </span>
        {isAdmin && checkIns.length > 0 && (
          <span className="ml-auto">
            <ConfirmDialog
              title="Clear all check-ins?"
              description={`This will permanently delete all ${checkIns.length} attendance records for this event. This cannot be undone.`}
              confirmLabel="Clear All"
              formAction={clearEventAttendances}
              hiddenFields={{ event_id: eventId }}
              trigger={
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-500 hover:border-red-300 hover:text-red-600 cursor-pointer transition-colors">
                  <X size={11} /> Clear All
                </span>
              }
            />
          </span>
        )}
      </div>

      {/* Filter bar */}
      {checkIns.length > 0 && (
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2 flex-wrap">
          <Filter size={12} className="text-gray-400 shrink-0" />
          <span className="text-xs text-gray-500 font-medium shrink-0">Filter</span>

          <select aria-label="Filter by type" value={filters.type} onChange={set('type')} className={selectCls}>
            <option value="">All types</option>
            <option value="attendee">Attendee</option>
            <option value="officer">Officer</option>
          </select>

          {sessions.length > 1 && (
            <select aria-label="Filter by session" value={filters.session} onChange={set('session')} className={selectCls}>
              <option value="">All sessions</option>
              {sessions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}

          {teams.length > 0 && (
            <select aria-label="Filter by team" value={filters.team} onChange={set('team')} className={selectCls}>
              <option value="">All teams</option>
              {teams.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}

          {programs.length > 0 && (
            <select aria-label="Filter by program" value={filters.program} onChange={set('program')} className={selectCls}>
              <option value="">All programs</option>
              {programs.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          )}

          {activeFilterCount > 0 && (
            <button
              onClick={() => setFilters({ type: '', session: '', team: '', program: '' })}
              className="text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Type</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 hidden sm:table-cell">Session</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 hidden md:table-cell">Team</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 hidden lg:table-cell">Program</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Time</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 hidden md:table-cell">Scanned by</th>
                {isAdmin && <th className="px-2 py-2.5" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900 max-w-[160px] truncate" title={c.participantName}>
                    {c.participantName}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                      c.participantType === 'officer'
                        ? 'bg-violet-100 text-violet-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {c.participantType}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs hidden sm:table-cell">
                    {c.sessionName ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs hidden md:table-cell">
                    {c.teamName ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium text-xs">
                        {c.teamName}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs hidden lg:table-cell">
                    {c.degreeProgram ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                    {formatDateTime(c.scanned_at)}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs hidden md:table-cell">
                    {c.scannerName ?? '—'}
                  </td>
                  {isAdmin && (
                    <td className="px-2 py-2.5">
                      <ConfirmDialog
                        title="Delete this check-in?"
                        description="This attendance record will be permanently removed."
                        confirmLabel="Delete"
                        formAction={deleteAttendance}
                        hiddenFields={{ attendance_id: c.id, event_id: eventId }}
                        trigger={
                          <span className="block p-1 text-gray-300 hover:text-red-500 transition-colors cursor-pointer rounded">
                            <X size={14} />
                          </span>
                        }
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Load More */}
      {filtered.length > 0 && remaining > 0 && (
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
          <span className="text-xs text-gray-400">
            Showing {visible.length} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setVisible((v) => v + PAGE_MORE)}
              className="text-xs font-medium text-violet-600 hover:text-violet-800 transition-colors"
            >
              Load {Math.min(remaining, PAGE_MORE)} more
            </button>
            {remaining > PAGE_MORE && (
              <>
                <span className="text-gray-300">·</span>
                <button
                  onClick={() => setVisible(filtered.length)}
                  className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Show all {filtered.length}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="px-5 py-8 text-center">
          {checkIns.length > 0 ? (
            <>
              <p className="text-sm text-gray-400">No check-ins match the current filters.</p>
              <button
                onClick={() => setFilters({ type: '', session: '', team: '', program: '' })}
                className="text-sm text-violet-600 hover:underline mt-1"
              >
                Clear filters
              </button>
            </>
          ) : (
            <p className="text-sm text-gray-400">No check-ins yet. Scans will appear here.</p>
          )}
        </div>
      )}
    </div>
  )
}
