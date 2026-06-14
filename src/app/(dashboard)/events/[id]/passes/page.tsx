import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Download, FileArchive, FileText, ArrowLeft } from 'lucide-react'
import { eventDateRange } from '@/lib/pass/render'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

type RosterRow = {
  participant_id: string
  qr_token: string
  participants: {
    first_name: string
    last_name: string
    student_number: string
    participant_type: string
    blocks: string[]
  } | null
}

type StaffRow = {
  profile_id: string
  profiles: { full_name: string; role: string; committee: string | null } | null
}

export default async function PassesPage({ params, searchParams }: Props) {
  const { id } = await params
  const { tab } = await searchParams
  const activeTab: 'attendee' | 'officer' | 'staff' = tab === 'officer' ? 'officer' : tab === 'staff' ? 'staff' : 'attendee'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: event } = await supabase
    .from('events')
    .select('id, name, event_sessions ( starts_at )')
    .eq('id', id)
    .single<{ id: string; name: string; event_sessions: { starts_at: string }[] }>()

  if (!event) notFound()

  const { data: roster } = await supabase
    .from('event_roster')
    .select('participant_id, qr_token, participants ( first_name, last_name, student_number, participant_type, blocks )')
    .eq('event_id', id)
    .returns<RosterRow[]>()

  const { data: teamEntries } = await supabase
    .from('event_teams')
    .select('participant_id, teams ( name )')
    .eq('event_id', id)
    .returns<{ participant_id: string; teams: { name: string } | null }[]>()

  const { data: eventStaff } = await supabase
    .from('event_staff')
    .select('profile_id, profiles ( full_name, role, committee )')
    .eq('event_id', id)
    .returns<StaffRow[]>()

  const teamByParticipant = new Map<string, string>()
  teamEntries?.forEach((t) => {
    if (t.teams?.name) teamByParticipant.set(t.participant_id, t.teams.name)
  })

  const allRows = roster ?? []
  const attendees = allRows.filter((r) => r.participants?.participant_type === 'attendee')
  const officers = allRows.filter((r) => r.participants?.participant_type === 'officer')
  const staff = eventStaff ?? []
  const displayed = activeTab === 'officer' ? officers : activeTab === 'staff' ? null : attendees

  const dateRange = eventDateRange(event.event_sessions)

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div>
        <Link
          href={`/events/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-3 transition-colors"
        >
          <ArrowLeft size={13} /> {event.name}
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">QR Passes</h1>
            {dateRange && <p className="text-sm text-gray-500 mt-0.5">{dateRange}</p>}
          </div>
          {/* Bulk actions */}
          <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
            <a
              href={`/events/${id}/passes/zip?type=${activeTab}`}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:border-violet-300 hover:text-violet-700 transition-all"
            >
              <FileArchive size={14} />
              ZIP ({activeTab === 'attendee' ? attendees.length : officers.length})
            </a>
            <a
              href={`/events/${id}/passes/zip`}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:border-violet-300 hover:text-violet-700 transition-all"
            >
              <FileArchive size={14} />
              ZIP All
            </a>
            <a
              href={`/events/${id}/passes/print`}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:border-green-300 hover:text-green-700 transition-all"
            >
              <FileText size={14} />
              Print PDF
            </a>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {([
          { key: 'attendee', label: 'Attendees', count: attendees.length },
          { key: 'officer', label: 'Officers', count: officers.length },
          { key: 'staff', label: 'Staff', count: staff.length },
        ] as const).map(({ key, label, count }) => (
          <Link
            key={key}
            href={`/events/${id}/passes?tab=${key}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'border-violet-600 text-violet-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
            <span className="ml-1.5 text-xs text-gray-400">({count})</span>
          </Link>
        ))}
      </div>

      {/* Pass grid — participants */}
      {activeTab !== 'staff' && (
        displayed && displayed.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayed.map(({ participant_id, participants: p }) => {
              if (!p) return null
              const team = teamByParticipant.get(participant_id)
              return (
                <div
                  key={participant_id}
                  className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm flex flex-col gap-3"
                >
                  <div className="w-full aspect-[9/16] bg-[#0f172a] rounded-lg flex flex-col items-center overflow-hidden px-2 pt-3 pb-2 gap-1.5">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[7px] font-bold tracking-[0.2em] text-violet-400">KRISPASS</span>
                      <span className={`text-[6px] font-bold tracking-widest px-1.5 py-0.5 rounded-full border ${
                        p.participant_type === 'officer'
                          ? 'text-violet-300 bg-violet-900/30 border-violet-700/40'
                          : 'text-blue-300 bg-blue-900/30 border-blue-700/40'
                      }`}>
                        {p.participant_type === 'officer' ? 'OFFICER' : 'ATTENDEE'}
                      </span>
                    </div>
                    <div className="flex-1" />
                    <div className="bg-white rounded p-1 w-10 h-10 flex items-center justify-center shrink-0">
                      <div className="w-full h-full grid grid-cols-5 grid-rows-5 gap-px">
                        {[1,1,1,1,1, 1,0,0,0,1, 1,0,1,0,1, 1,0,0,0,1, 1,1,1,1,1].map((v, i) => (
                          <div key={i} className={`${v ? 'bg-[#1e1b4b]' : 'bg-white'}`} />
                        ))}
                      </div>
                    </div>
                    <div className="flex-1" />
                    <div className="text-center w-full px-1">
                      <p className="text-white text-[9px] font-bold tracking-wide truncate">{p.last_name.toUpperCase()}</p>
                      <p className="text-slate-400 text-[8px] truncate">{p.first_name}</p>
                    </div>
                    <p className="text-[7px] text-slate-500 font-mono tracking-widest">{p.student_number}</p>
                    {(team || p.blocks.length > 0) && (
                      <div className="flex flex-wrap justify-center gap-0.5 px-1">
                        {team && (
                          <span className="text-[6px] font-bold text-white bg-violet-700 px-1.5 py-0.5 rounded-full">{team}</span>
                        )}
                        {p.blocks.slice(0, 2).map((b) => (
                          <span key={b} className="text-[6px] text-slate-400 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded-full">{b}</span>
                        ))}
                      </div>
                    )}
                    <div className="w-full border-t border-slate-700/60 pt-1 mt-0.5">
                      <p className="text-[7px] text-slate-400 text-center truncate">{event.name}</p>
                      {dateRange && <p className="text-[6px] text-slate-600 text-center">{dateRange}</p>}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{p.last_name}, {p.first_name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{p.student_number}</p>
                  </div>
                  <a
                    href={`/events/${id}/passes/${participant_id}`}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs font-medium text-gray-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-all"
                  >
                    <Download size={11} /> PNG
                  </a>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center">
            <p className="text-sm text-gray-400">
              No {activeTab === 'attendee' ? 'attendees' : 'officers'} rostered yet.
            </p>
            <Link href={`/events/${id}/import`} className="text-sm text-violet-600 hover:underline mt-2 block">
              Import CSV to add participants →
            </Link>
          </div>
        )
      )}

      {/* Pass grid — staff */}
      {activeTab === 'staff' && (
        staff.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {staff.map(({ profile_id, profiles: p }) => {
              if (!p) return null
              const roleLabel = p.role.charAt(0).toUpperCase() + p.role.slice(1)
              const identifier = p.committee ? `${roleLabel} · ${p.committee}` : roleLabel
              const nameParts = p.full_name.trim().split(/\s+/)
              const displayLast = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0]
              const displayFirst = nameParts.length > 1 ? nameParts[0] : ''
              return (
                <div
                  key={profile_id}
                  className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm flex flex-col gap-3"
                >
                  <div className="w-full aspect-[9/16] bg-[#0f172a] rounded-lg flex flex-col items-center overflow-hidden px-2 pt-3 pb-2 gap-1.5">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[7px] font-bold tracking-[0.2em] text-violet-400">KRISPASS</span>
                      <span className="text-[6px] font-bold tracking-widest px-1.5 py-0.5 rounded-full border text-amber-300 bg-amber-900/30 border-amber-700/40">
                        ORGANIZER
                      </span>
                    </div>
                    <div className="flex-1" />
                    <div className="bg-white rounded p-1 w-10 h-10 flex items-center justify-center shrink-0">
                      <div className="w-full h-full grid grid-cols-5 grid-rows-5 gap-px">
                        {[1,1,1,1,1, 1,0,0,0,1, 1,0,1,0,1, 1,0,0,0,1, 1,1,1,1,1].map((v, i) => (
                          <div key={i} className={`${v ? 'bg-[#1e1b4b]' : 'bg-white'}`} />
                        ))}
                      </div>
                    </div>
                    <div className="flex-1" />
                    <div className="text-center w-full px-1">
                      <p className="text-white text-[9px] font-bold tracking-wide truncate">{displayLast.toUpperCase()}</p>
                      {displayFirst && <p className="text-slate-400 text-[8px] truncate">{displayFirst}</p>}
                    </div>
                    <p className="text-[7px] text-amber-600/80 font-mono tracking-widest truncate px-1 text-center">{identifier}</p>
                    <div className="w-full border-t border-slate-700/60 pt-1 mt-0.5">
                      <p className="text-[7px] text-slate-400 text-center truncate">{event.name}</p>
                      {dateRange && <p className="text-[6px] text-slate-600 text-center">{dateRange}</p>}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{p.full_name}</p>
                    <p className="text-[10px] text-gray-400">{identifier}</p>
                  </div>
                  <a
                    href={`/events/${id}/passes/staff/${profile_id}`}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs font-medium text-gray-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 transition-all"
                  >
                    <Download size={11} /> PNG
                  </a>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center">
            <p className="text-sm text-gray-400">No staff assigned to this event yet.</p>
          </div>
        )
      )}
    </div>
  )
}
