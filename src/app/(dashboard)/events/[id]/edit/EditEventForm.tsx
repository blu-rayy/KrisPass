'use client'

import { useActionState, useState } from 'react'
import { updateEvent, deleteEvent } from '@/lib/actions/events'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { CheckCircle, Trash2 } from 'lucide-react'
import type { Event } from '@/types'

interface Props {
  event: Event
  isAdmin: boolean
}

export function EditEventForm({ event, isAdmin }: Props) {
  const boundUpdate = updateEvent.bind(null, event.id)
  const boundDelete = deleteEvent.bind(null, event.id)

  const [updateState, updateAction, updatePending] = useActionState(boundUpdate, null)
  const [deleteState, deleteAction, deletePending] = useActionState(boundDelete, null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="space-y-6">
      {/* Edit form */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <form action={updateAction} className="space-y-4">
          <Input
            id="name"
            name="name"
            label="Event name"
            defaultValue={event.name}
            required
          />
          <div className="space-y-1.5">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={event.description ?? ''}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
            />
          </div>
          <Input
            id="location"
            name="location"
            label="Location"
            defaultValue={event.location ?? ''}
            placeholder="e.g. FEU Tech Auditorium"
          />

          {updateState?.ok === false && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
              {updateState.error}
            </p>
          )}
          {updateState?.ok === true && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
              <CheckCircle size={14} />
              Changes saved.
            </div>
          )}

          <Button type="submit" disabled={updatePending}>
            {updatePending ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </div>

      {/* Danger zone — admin only */}
      {isAdmin && (
        <div className="rounded-xl border border-red-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-red-700 mb-1">Danger zone</h2>
          <p className="text-sm text-gray-500 mb-4">
            Permanently deletes the event, all sessions, roster, and attendance records.
          </p>

          {deleteState?.ok === false && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600 mb-3">
              {deleteState.error}
            </p>
          )}

          {!confirmDelete ? (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={14} />
              Delete event
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-red-700">
                Are you sure? This will permanently delete &ldquo;{event.name}&rdquo; and all its data.
              </p>
              <div className="flex gap-2">
                <form action={deleteAction}>
                  <Button type="submit" variant="danger" size="sm" disabled={deletePending}>
                    {deletePending ? 'Deleting…' : 'Yes, delete'}
                  </Button>
                </form>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
