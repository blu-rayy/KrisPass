import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import { RosterTable } from './RosterTable'
import { LivePanel } from './LivePanel'
import {
  ArrowUpTrayIcon,
  TicketIcon,
  QrCodeIcon,
} from '@heroicons/react/24/outline'

export default async function EventDetailPage({ params }: { params: { eventId: string } }) {
  const service = createServiceClient()

  const { data: event } = await service
    .from('events')
    .select('*')
    .eq('id', params.eventId)
    .single()

  if (!event) notFound()

  const { data: roster } = await service
    .from('event_roster')
    .select(`
      qr_token,
      participant_id,
      participants (
        id, last_name, first_name, middle_name, suffix,
        school_email, student_number, degree_program
      )
    `)
    .eq('event_id', params.eventId)

  const [{ data: attendances }, { data: eventTeams }, { data: participantBlocks }, { data: profiles }] = await Promise.all([
    service.from('attendances').select('id, participant_id, scanned_at, scanned_by, participants(last_name, first_name)').eq('event_id', params.eventId).order('scanned_at', { ascending: false }),
    service.from('event_teams').select('participant_id, teams(name)').eq('event_id', params.eventId),
    service.from('participant_blocks').select('participant_id, blocks(code)'),
    service.from('profiles').select('id, first_name, last_name'),
  ])

  const attendanceMap = new Map((attendances ?? []).map((a) => [a.participant_id, a.scanned_at]))
  const teamMap = new Map((eventTeams ?? []).map((et) => [et.participant_id, (et.teams as unknown as { name: string } | null)?.name ?? null]))
  const blockMap = new Map((participantBlocks ?? []).map((pb) => [pb.participant_id, (pb.blocks as unknown as { code: string } | null)?.code ?? null]))

  const total = roster?.length ?? 0

  const rows = (roster ?? [])
    .map((r) => {
      const p = r.participants as unknown as {
        id: string; last_name: string | null; first_name: string | null
        middle_name: string | null; suffix: string | null
        school_email: string | null; student_number: string | null
        degree_program: string | null
      }
      return {
        id: p.id,
        last_name: p.last_name,
        first_name: p.first_name,
        middle_name: p.middle_name,
        suffix: p.suffix,
        school_email: p.school_email,
        student_number: p.student_number,
        degree_program: p.degree_program,
        block: blockMap.get(p.id) ?? null,
        team_name: teamMap.get(p.id) ?? null,
        qr_token: r.qr_token,
        attended: attendanceMap.has(p.id),
        scanned_at: attendanceMap.get(p.id) ?? null,
      }
    })
    .sort((a, b) => (a.last_name ?? '').localeCompare(b.last_name ?? ''))

  const scannerMap: Record<string, string> = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, `${p.first_name} ${p.last_name}`])
  )

  const initialAttendances = (attendances ?? []).map((a) => {
    const p = a.participants as unknown as { last_name: string; first_name: string } | null
    return {
      id: a.id,
      participant_id: a.participant_id,
      scanned_at: a.scanned_at,
      scanned_by: a.scanned_by as string | null,
      participant_name: p ? `${p.last_name}, ${p.first_name}` : 'Unknown',
      scanner_name: a.scanned_by ? (scannerMap[a.scanned_by] ?? null) : null,
    }
  })

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <nav className="text-sm text-gray-400 mb-1">
          <Link href="/admin/events" className="hover:text-gray-600">Events</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-600">{event.name}</span>
        </nav>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {formatDate(event.event_date)}{event.location && ` · ${event.location}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/events/${params.eventId}/upload`}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <ArrowUpTrayIcon className="w-4 h-4" />
              Import CSV
            </Link>
            <Link
              href={`/admin/events/${params.eventId}/passes`}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <TicketIcon className="w-4 h-4" />
              View passes
            </Link>
            <Link
              href={`/organizer/scan/${params.eventId}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors"
            >
              <QrCodeIcon className="w-4 h-4" />
              Scan QR
            </Link>
          </div>
        </div>
      </div>

      {/* Live stats + recent check-ins */}
      <LivePanel eventId={params.eventId} total={total} initialAttendances={initialAttendances} scannerMap={scannerMap} />

      {/* Roster table */}
      <div className="mt-6">
        {total === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center text-gray-400">
            <p className="font-medium">No participants on roster yet</p>
            <p className="text-sm mt-1">
              <Link href={`/admin/events/${params.eventId}/upload`} className="text-violet-600 hover:underline">
                Import a CSV roster
              </Link>{' '}
              to add participants.
            </p>
          </div>
        ) : (
          <RosterTable rows={rows} eventId={params.eventId} />
        )}
      </div>
    </div>
  )
}
