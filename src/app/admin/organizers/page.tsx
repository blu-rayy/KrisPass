import { createServiceClient } from '@/lib/supabase/server'
import { OrganizerList } from './OrganizerList'

export default async function OrganizersPage() {
  const service = createServiceClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  const [{ data: profiles }, { data: events }] = await Promise.all([
    service.from('profiles').select('*').in('role', ['organizer', 'scanner']).order('last_name'),
    service.from('events').select('id, name').order('event_date', { ascending: false }),
  ])

  // For each organizer, find their participant record and event_roster entries
  const organizers = await Promise.all(
    (profiles ?? []).map(async (p) => {
      let assignments: { event_id: string; event_name: string; qr_token: string }[] = []

      if (p.school_email) {
        const { data: participant } = await service
          .from('participants')
          .select('id')
          .eq('school_email', p.school_email)
          .maybeSingle()

        if (participant) {
          const { data: roster } = await service
            .from('event_roster')
            .select('event_id, qr_token, events(name)')
            .eq('participant_id', participant.id)

          assignments = (roster ?? []).map((r) => ({
            event_id: r.event_id,
            event_name: (r.events as unknown as { name: string } | null)?.name ?? '—',
            qr_token: r.qr_token,
          }))
        }
      }

      return {
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        middle_initial: p.middle_initial,
        role: p.role,
        committee: p.committee,
        school_email: p.school_email,
        student_number: p.student_number,
        assignments,
      }
    })
  )

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Organizers</h1>

      {organizers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center text-gray-400">
          <p className="font-medium">No organizers yet</p>
          <p className="text-sm mt-1">Create staff accounts with the Organizer or Scanner role under Users.</p>
        </div>
      ) : (
        <OrganizerList
          organizers={organizers}
          events={events ?? []}
          appUrl={appUrl}
        />
      )}
    </div>
  )
}
