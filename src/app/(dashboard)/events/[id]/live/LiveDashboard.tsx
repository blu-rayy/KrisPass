'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Sun, Moon, Radio, Users, UserCheck, UserX } from 'lucide-react'
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js'

// ── types ─────────────────────────────────────────────────────────────────────

type Session = {
  id: string
  name: string | null
  starts_at: string
  ends_at: string | null
}

export type FeedEntry = {
  id: string
  participant_id: string
  scanned_at: string
  scanned_by: string | null
  participantName: string
  teamName: string | null
  scannerName: string | null
}

type AttendanceRecord = {
  id: string
  participant_id: string
  scanned_at: string
  scanned_by: string | null
  participants: { first_name: string; last_name: string } | null
}

interface Props {
  event: { id: string; name: string }
  sessions: Session[]
  initialSessionId: string | null
  initialAttendances: FeedEntry[]
  rosterCount: number
  participantTeamMap: Record<string, string>
  profileMap: Record<string, string>
  teamRosterCounts: Record<string, number>
}

// ── component ─────────────────────────────────────────────────────────────────

export function LiveDashboard({
  event,
  sessions,
  initialSessionId,
  initialAttendances,
  rosterCount,
  participantTeamMap,
  profileMap,
  teamRosterCounts,
}: Props) {
  const [selectedSessionId, setSelectedSessionId] = useState(initialSessionId)
  const [attendances, setAttendances] = useState<FeedEntry[]>(initialAttendances)
  const [isDark, setIsDark] = useState(true)
  const [showTeams, setShowTeams] = useState(false)
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const supabaseRef = useRef(createClient())

  const present = attendances.length
  const absent = Math.max(0, rosterCount - present)

  // Per-team stats derived from current session's attendances
  const teamStats = Object.entries(teamRosterCounts)
    .map(([name, total]) => ({
      name,
      total,
      present: attendances.filter((a) => a.teamName === name).length,
    }))
    .sort((a, b) => b.present / b.total - a.present / a.total)

  // Mark an entry as "new" briefly for the highlight animation
  const markNew = useCallback((id: string) => {
    setNewIds((prev) => new Set([...prev, id]))
    setTimeout(() => {
      setNewIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 2000)
  }, [])

  // Realtime subscription — re-runs when session changes
  useEffect(() => {
    if (!selectedSessionId) return

    const supabase = supabaseRef.current
    const channel = supabase
      .channel(`live-attendance-${selectedSessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendances',
          filter: `event_session_id=eq.${selectedSessionId}`,
        },
        async (payload: RealtimePostgresInsertPayload<{
          id: string
          participant_id: string
          scanned_at: string
          scanned_by: string | null
          event_session_id: string
        }>) => {
          const row = payload.new

          // Fetch participant name via a follow-up query
          const { data: full } = await supabase
            .from('attendances')
            .select('id, participant_id, scanned_at, scanned_by, participants(first_name, last_name)')
            .eq('id', row.id)
            .returns<AttendanceRecord[]>()
            .single()

          const rec = full as AttendanceRecord | null
          const participantName = rec?.participants
            ? `${rec.participants.last_name}, ${rec.participants.first_name}`
            : 'Unknown'

          const entry: FeedEntry = {
            id: row.id,
            participant_id: row.participant_id,
            scanned_at: row.scanned_at,
            scanned_by: row.scanned_by,
            participantName,
            teamName: participantTeamMap[row.participant_id] ?? null,
            scannerName: row.scanned_by ? (profileMap[row.scanned_by] ?? null) : null,
          }

          setAttendances((prev) => [entry, ...prev])
          markNew(row.id)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedSessionId, participantTeamMap, profileMap, markNew])

  // Fetch attendance when the user changes the session selector
  async function handleSessionChange(sessionId: string) {
    setSelectedSessionId(sessionId)
    const { data } = await supabaseRef.current
      .from('attendances')
      .select('id, participant_id, scanned_at, scanned_by, participants(first_name, last_name)')
      .eq('event_session_id', sessionId)
      .order('scanned_at', { ascending: false })
      .returns<AttendanceRecord[]>()

    setAttendances(
      (data ?? []).map((a) => ({
        id: a.id,
        participant_id: a.participant_id,
        scanned_at: a.scanned_at,
        scanned_by: a.scanned_by,
        participantName: a.participants
          ? `${a.participants.last_name}, ${a.participants.first_name}`
          : 'Unknown',
        teamName: participantTeamMap[a.participant_id] ?? null,
        scannerName: a.scanned_by ? (profileMap[a.scanned_by] ?? null) : null,
      })),
    )
  }

  // ── theme tokens ───────────────────────────────────────────────────────────
  const bg = isDark ? 'bg-gray-950 text-white' : 'bg-white text-gray-900'
  const cardBg = isDark ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-200'
  const divideColor = isDark ? 'divide-gray-800' : 'divide-gray-200'
  const borderColor = isDark ? 'border-gray-800' : 'border-gray-200'
  const mutedText = isDark ? 'text-gray-400' : 'text-gray-500'
  const controlBg = isDark
    ? 'bg-gray-800 border-gray-700 text-gray-200 hover:text-white'
    : 'bg-white border-gray-300 text-gray-700 hover:text-gray-900'
  const rowHover = isDark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'
  const newHighlight = isDark ? 'bg-violet-900/40' : 'bg-violet-50'

  const selectedSession = sessions.find((s) => s.id === selectedSessionId)

  return (
    <div className={`min-h-full flex flex-col ${bg}`}>

      {/* ── Header bar ── */}
      <div className={`sticky top-0 z-10 px-5 py-3 border-b ${borderColor} ${isDark ? 'bg-gray-950' : 'bg-white'} flex items-center gap-3`}>
        <Link
          href={`/events/${event.id}`}
          className={`${mutedText} hover:text-inherit transition-colors shrink-0`}
        >
          <ArrowLeft size={18} />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Radio size={13} className="text-violet-400 shrink-0" />
            <h1 className="text-base font-semibold truncate">{event.name}</h1>
          </div>
          {selectedSession && (
            <p className={`text-xs ${mutedText} mt-0.5`}>
              {selectedSession.name ?? 'Session'} ·{' '}
              {new Date(selectedSession.starts_at).toLocaleDateString('en-PH', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                timeZone: 'UTC',
              })}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {sessions.length > 1 && (
            <select
              value={selectedSessionId ?? ''}
              onChange={(e) => handleSessionChange(e.target.value)}
              className={`text-sm rounded-lg border px-3 py-1.5 transition-colors ${controlBg}`}
            >
              {sessions.map((s, i) => (
                <option key={s.id} value={s.id}>
                  {s.name ?? `Session ${i + 1}`}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setShowTeams((v) => !v)}
            className={`text-sm rounded-lg border px-3 py-1.5 transition-colors ${
              showTeams
                ? 'bg-violet-600 border-violet-600 text-white'
                : controlBg
            }`}
          >
            Teams
          </button>

          <button
            onClick={() => setIsDark((v) => !v)}
            className={`p-1.5 rounded-lg border transition-colors ${controlBg}`}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 px-5 py-5 space-y-5">

        {/* ── Stat tiles ── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Present', value: present, icon: UserCheck, color: 'text-green-400' },
            { label: 'Absent', value: absent, icon: UserX, color: 'text-red-400' },
            { label: 'Total', value: rosterCount, icon: Users, color: mutedText },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={`rounded-2xl border ${cardBg} px-6 py-5`}>
              <div className={`flex items-center gap-2 mb-2 ${mutedText}`}>
                <Icon size={16} className={color} />
                <span className="text-sm font-medium">{label}</span>
              </div>
              <p className="text-5xl font-bold tracking-tight">{value}</p>
            </div>
          ))}
        </div>

        {showTeams ? (
          /* ── Per-team progress ── */
          <div className={`rounded-2xl border ${cardBg} overflow-hidden`}>
            <div className={`px-5 py-4 border-b ${borderColor} flex items-center gap-2`}>
              <Users size={14} className={mutedText} />
              <h2 className="text-sm font-semibold">Per-team progress</h2>
              <span className={`ml-auto text-xs ${mutedText}`}>{teamStats.length} teams</span>
            </div>
            {teamStats.length > 0 ? (
              <div className={`divide-y ${divideColor}`}>
                {teamStats.map((team) => {
                  const pct = team.total > 0 ? (team.present / team.total) * 100 : 0
                  return (
                    <div key={team.name} className={`px-5 py-4 ${rowHover} transition-colors`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{team.name}</span>
                        <span className={`text-sm tabular-nums ${mutedText}`}>
                          {team.present} / {team.total}
                        </span>
                      </div>
                      <div className={`h-2 rounded-full ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
                        <div
                          className="h-2 rounded-full bg-violet-500 transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className={`px-5 py-8 text-sm text-center ${mutedText}`}>No team data.</p>
            )}
          </div>
        ) : (
          /* ── Live feed ── */
          <div className={`rounded-2xl border ${cardBg} overflow-hidden`}>
            <div className={`px-5 py-4 border-b ${borderColor} flex items-center gap-2`}>
              <Radio size={14} className="text-violet-400" />
              <h2 className="text-sm font-semibold">Live feed</h2>
              <span className="ml-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className={`text-xs ${mutedText}`}>Live</span>
              </span>
              <span className={`ml-auto text-xs ${mutedText}`}>
                {attendances.length} check-in{attendances.length !== 1 ? 's' : ''}
              </span>
            </div>

            {attendances.length > 0 ? (
              <div className={`divide-y ${divideColor} max-h-[calc(100vh-22rem)] overflow-y-auto`}>
                {attendances.map((entry) => (
                  <div
                    key={entry.id}
                    className={`px-5 py-4 flex items-center justify-between gap-4 transition-colors duration-700 ${
                      newIds.has(entry.id) ? newHighlight : rowHover
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-base truncate">{entry.participantName}</p>
                      <p className={`text-sm ${mutedText} truncate`}>
                        {[
                          entry.teamName,
                          entry.scannerName ? `via ${entry.scannerName}` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <span className={`text-sm font-mono tabular-nums ${mutedText} shrink-0`}>
                      {new Date(entry.scanned_at).toLocaleTimeString('en-PH', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-16 text-center">
                <Radio size={32} className={`mx-auto mb-3 ${mutedText} opacity-30`} />
                <p className={`text-sm ${mutedText}`}>No check-ins yet. Scans will appear here.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
