'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { createEvent } from '@/lib/actions/events'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function NewEventForm() {
  const [state, action, pending] = useActionState(createEvent, null)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <form action={action} className="space-y-4">
        <Input
          id="name"
          name="name"
          label="Event name"
          placeholder="e.g. ACM Dev Camp 2026"
          required
          autoFocus
        />
        <div className="space-y-1.5">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            placeholder="What is this event about?"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
          />
        </div>
        <Input
          id="location"
          name="location"
          label="Location"
          placeholder="e.g. FEU Tech Auditorium"
        />

        {state?.ok === false && (
          <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
            {state.error}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="submit" disabled={pending}>
            {pending ? 'Creating…' : 'Create event'}
          </Button>
          <Link href="/events">
            <Button type="button" variant="ghost">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
