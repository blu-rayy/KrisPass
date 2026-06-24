'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ActionResult, CheckInResponse } from '@/types'

export async function checkIn(
  qrToken: string,
  sessionId: string,
): Promise<ActionResult<CheckInResponse>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Unauthorized.' }

  // Look up QR token in roster
  const { data: roster } = await supabase
    .from('event_roster')
    .select('event_id, participant_id, participants ( id, first_name, last_name )')
    .eq('qr_token', qrToken)
    .maybeSingle()

  if (!roster) {
    return { ok: true, data: { result: 'not_found' } }
  }

  // Verify session belongs to same event
  const { data: session } = await supabase
    .from('event_sessions')
    .select('event_id')
    .eq('id', sessionId)
    .maybeSingle()

  if (!session || session.event_id !== roster.event_id) {
    return { ok: true, data: { result: 'not_found' } }
  }

  // Get team name for this participant in this event
  const { data: teamData } = await supabase
    .from('event_teams')
    .select('teams ( name )')
    .eq('event_id', roster.event_id)
    .eq('participant_id', roster.participant_id)
    .maybeSingle()

  const team_name =
    (teamData?.teams as unknown as { name: string } | null)?.name ?? null

  // Always insert — duplicate check-ins are allowed
  const { error } = await supabase.from('attendances').insert({
    event_session_id: sessionId,
    participant_id: roster.participant_id,
    scanned_by: user.id,
  })

  if (error) return { ok: false, error: error.message }

  return {
    ok: true,
    data: {
      result: 'success',
      participant: roster.participants as unknown as CheckInResponse['participant'],
      team_name,
    },
  }
}

// Direct form action — no useActionState
export async function deleteAttendance(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const attendanceId = formData.get('attendance_id') as string
  const eventId = formData.get('event_id') as string

  const admin = createAdminClient()
  await admin.from('attendances').delete().eq('id', attendanceId)

  revalidatePath(`/events/${eventId}`)
}

// Direct form action — no useActionState
export async function clearEventAttendances(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const eventId = formData.get('event_id') as string

  const admin = createAdminClient()

  const { data: sessions } = await admin
    .from('event_sessions')
    .select('id')
    .eq('event_id', eventId)

  const sessionIds = (sessions ?? []).map((s) => s.id as string)
  if (sessionIds.length > 0) {
    await admin.from('attendances').delete().in('event_session_id', sessionIds)
  }

  revalidatePath(`/events/${eventId}`)
}
