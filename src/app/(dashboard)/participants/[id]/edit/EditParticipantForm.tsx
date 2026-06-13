'use client'

import { useActionState, useState } from 'react'
import { updateParticipant, deleteParticipant } from '@/lib/actions/participants'
import { ParticipantFields } from '../../ParticipantFields'
import { Button } from '@/components/ui/Button'
import { CheckCircle, Trash2 } from 'lucide-react'
import type { Participant } from '@/types'

interface Props {
  participant: Participant
}

export function EditParticipantForm({ participant }: Props) {
  const boundUpdate = updateParticipant.bind(null, participant.id)
  const boundDelete = deleteParticipant.bind(null, participant.id)

  const [updateState, updateAction, updatePending] = useActionState(boundUpdate, null)
  const [deleteState, deleteAction, deletePending] = useActionState(boundDelete, null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="space-y-6">
      {/* Edit form */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <form action={updateAction} className="space-y-5">
          <ParticipantFields defaults={participant} />

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

      {/* Danger zone */}
      <div className="rounded-xl border border-red-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-red-700 mb-1">Danger zone</h2>
        <p className="text-sm text-gray-500 mb-4">
          Permanently removes this participant and all their roster and attendance records.
        </p>

        {deleteState?.ok === false && (
          <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600 mb-3">
            {deleteState.error}
          </p>
        )}

        {!confirmDelete ? (
          <Button type="button" variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={14} />
            Delete participant
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-red-700">
              Are you sure? This will permanently delete {participant.first_name} {participant.last_name}&apos;s record.
            </p>
            <div className="flex gap-2">
              <form action={deleteAction}>
                <Button type="submit" variant="danger" size="sm" disabled={deletePending}>
                  {deletePending ? 'Deleting…' : 'Yes, delete'}
                </Button>
              </form>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
