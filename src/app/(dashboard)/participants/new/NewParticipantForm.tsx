'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { createParticipant } from '@/lib/actions/participants'
import { ParticipantFields } from '../ParticipantFields'
import { Button } from '@/components/ui/Button'

interface Props {
  eventId: string | null
}

export function NewParticipantForm({ eventId }: Props) {
  const [state, action, pending] = useActionState(createParticipant, null)

  const cancelHref = eventId ? `/participants?event=${eventId}` : '/participants'

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <form action={action} className="space-y-5">
        {eventId && <input type="hidden" name="event_id" value={eventId} />}
        <ParticipantFields />

        {state?.ok === false && (
          <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
            {state.error}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="submit" disabled={pending}>
            {pending ? 'Creating…' : 'Create participant'}
          </Button>
          <Link href={cancelHref}>
            <Button type="button" variant="ghost">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
