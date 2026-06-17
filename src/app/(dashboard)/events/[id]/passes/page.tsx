import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Download, ArrowLeft } from 'lucide-react'
import { eventDateRange } from '@/lib/pass/render'
import { PassesDropdown } from './PassesDropdown'
import QRCode from 'qrcode'

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

  const { data: eventStaff } = await supabase
    .from('event_staff')
    .select('profile_id, profiles ( full_name, role, committee )')
    .eq('event_id', id)
    .returns<StaffRow[]>()

  const allRows = roster ?? []
  const attendees = allRows.filter((r) => r.participants?.participant_type === 'attendee')
  const officers = allRows.filter((r) => r.participants?.participant_type === 'officer')
  const staff = eventStaff ?? []
  const displayed = activeTab === 'officer' ? officers : activeTab === 'staff' ? null : attendees

  const dateRange = eventDateRange(event.event_sessions)

  // Generate real QR codes for the active tab only
  const qrByParticipant = new Map<string, string>()
  if (displayed) {
    await Promise.all(
      displayed.map(async ({ participant_id, qr_token }) => {
        const url = await QRCode.toDataURL(qr_token, {
          width: 80,
          margin: 1,
          color: { dark: '#1e1b4b', light: '#ffffff' },
        })
        qrByParticipant.set(participant_id, url)
      })
    )
  }

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
          <PassesDropdown
            eventId={id}
            activeTab={activeTab}
            tabCount={activeTab === 'attendee' ? attendees.length : officers.length}
          />
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
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {displayed.map(({ participant_id, participants: p }) => {
              if (!p) return null
              return (
                <div
                  key={participant_id}
                  className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm flex flex-col items-center gap-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrByParticipant.get(participant_id)} width={80} height={80} alt="QR" className="w-full rounded" />
                  <div className="w-full min-w-0 text-center">
                    <p className="text-xs font-medium text-gray-900 truncate">{p.last_name}, {p.first_name}</p>
                    <p className="text-[10px] text-gray-400 font-mono truncate">{p.student_number}</p>
                  </div>
                  <div className="w-full grid grid-cols-2 gap-1">
                    <a
                      href={`/events/${id}/passes/${participant_id}`}
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-gray-200 bg-gray-50 py-1.5 text-[10px] font-medium text-gray-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-all"
                    >
                      <Download size={10} /> PNG
                    </a>
                    <a
                      href={`/events/${id}/passes/${participant_id}?format=pdf`}
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-gray-200 bg-gray-50 py-1.5 text-[10px] font-medium text-gray-600 hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition-all"
                    >
                      <Download size={10} /> PDF
                    </a>
                  </div>
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

      {/* Pass grid — staff (no QR tokens, just download links) */}
      {activeTab === 'staff' && (
        staff.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {staff.map(({ profile_id, profiles: p }) => {
              if (!p) return null
              const roleLabel = p.role.charAt(0).toUpperCase() + p.role.slice(1)
              const identifier = p.committee ? `${roleLabel} · ${p.committee}` : roleLabel
              return (
                <div
                  key={profile_id}
                  className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm flex flex-col items-center gap-2"
                >
                  <div className="w-full aspect-square bg-gray-50 rounded flex items-center justify-center">
                    <Download size={20} className="text-gray-300" />
                  </div>
                  <div className="w-full min-w-0 text-center">
                    <p className="text-xs font-medium text-gray-900 truncate">{p.full_name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{identifier}</p>
                  </div>
                  <div className="w-full grid grid-cols-2 gap-1">
                    <a
                      href={`/events/${id}/passes/staff/${profile_id}`}
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-gray-200 bg-gray-50 py-1.5 text-[10px] font-medium text-gray-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 transition-all"
                    >
                      <Download size={10} /> PNG
                    </a>
                    <a
                      href={`/events/${id}/passes/staff/${profile_id}?format=pdf`}
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-gray-200 bg-gray-50 py-1.5 text-[10px] font-medium text-gray-600 hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition-all"
                    >
                      <Download size={10} /> PDF
                    </a>
                  </div>
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
