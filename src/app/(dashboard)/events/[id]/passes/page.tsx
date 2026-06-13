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

export default async function PassesPage({ params, searchParams }: Props) {
  const { id } = await params
  const { tab } = await searchParams
  const activeTab: 'attendee' | 'officer' = tab === 'officer' ? 'officer' : 'attendee'

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

  const teamByParticipant = new Map<string, string>()
  teamEntries?.forEach((t) => {
    if (t.teams?.name) teamByParticipant.set(t.participant_id, t.teams.name)
  })

  const allRows = roster ?? []
  const attendees = allRows.filter((r) => r.participants?.participant_type === 'attendee')
  const officers = allRows.filter((r) => r.participants?.participant_type === 'officer')
  const displayed = activeTab === 'officer' ? officers : attendees

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
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">QR Passes</h1>
            {dateRange && <p className="text-sm text-gray-500 mt-0.5">{dateRange}</p>}
          </div>
          {/* Bulk actions */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
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
        {(['attendee', 'officer'] as const).map((t) => {
          const count = t === 'attendee' ? attendees.length : officers.length
          const label = t === 'attendee' ? 'Attendees' : 'Officers'
          return (
            <Link
              key={t}
              href={`/events/${id}/passes?tab=${t}`}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t
                  ? 'border-violet-600 text-violet-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
              <span className="ml-1.5 text-xs text-gray-400">({count})</span>
            </Link>
          )
        })}
      </div>

      {/* Pass grid */}
      {displayed.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayed.map(({ participant_id, participants: p }) => {
            if (!p) return null
            const team = teamByParticipant.get(participant_id)
            return (
              <div
                key={participant_id}
                className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm flex flex-col gap-3"
              >
                {/* Pass preview placeholder */}
                <div className="w-full aspect-[9/16] bg-slate-900 rounded-lg flex flex-col items-center justify-center gap-2 overflow-hidden">
                  <span className="text-[9px] font-bold tracking-widest text-violet-400">KRISPASS</span>
                  <div className="w-12 h-12 bg-white rounded p-1">
                    <div className="w-full h-full bg-slate-900 rounded-sm grid grid-cols-3 gap-0.5">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className={`rounded-sm ${[0,2,6,8,4].includes(i) ? 'bg-white' : ''}`} />
                      ))}
                    </div>
                  </div>
                  <div className="text-center px-2">
                    <p className="text-white text-[10px] font-bold tracking-wide">{p.last_name.toUpperCase()}</p>
                    <p className="text-slate-400 text-[9px]">{p.first_name}</p>
                  </div>
                  {team && (
                    <span className="text-[9px] text-violet-300 bg-violet-950 px-2 py-0.5 rounded-full">{team}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{p.last_name}, {p.first_name}</p>
                  <p className="text-[10px] text-gray-400 font-mono">{p.student_number}</p>
                </div>

                {/* Download */}
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
      )}
    </div>
  )
}
