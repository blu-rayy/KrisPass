'use server'

import { createClient } from '@/lib/supabase/server'
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

  // Check for existing attendance
  const { data: existing } = await supabase
    .from('attendances')
    .select('scanned_at')
    .eq('event_session_id', sessionId)
    .eq('participant_id', roster.participant_id)
    .maybeSingle()

  if (existing) {
    return {
      ok: true,
      data: {
        result: 'already_scanned',
        participant: roster.participants as unknown as CheckInResponse['participant'],
        team_name,
        scanned_at: existing.scanned_at,
      },
    }
  }

  // Record attendance
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
