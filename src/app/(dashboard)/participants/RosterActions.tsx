'use client'

import { useState, useTransition } from 'react'
import { RefreshCw, Trash2 } from 'lucide-react'
import { regenerateQrToken, removeFromRoster } from '@/lib/actions/participants'
import { useRouter } from 'next/navigation'

interface Props {
  eventId: string
  participantId: string
  participantName: string
}

export function RosterActions({ eventId, participantId, participantName }: Props) {
  const router = useRouter()
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleRegenerate() {
    startTransition(async () => {
      await regenerateQrToken(eventId, participantId)
      router.refresh()
    })
  }

  function handleRemove() {
    startTransition(async () => {
      await removeFromRoster(eventId, participantId)
      router.refresh()
      setConfirmRemove(false)
    })
  }

  if (confirmRemove) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-600 font-medium">Remove {participantName}?</span>
        <button
          onClick={handleRemove}
          disabled={isPending}
          className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
        >
          {isPending ? 'Removing…' : 'Yes'}
        </button>
        <button
          onClick={() => setConfirmRemove(false)}
          className="text-xs text-gray-400 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleRegenerate}
        disabled={isPending}
        title="Regenerate QR token"
        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-violet-600 transition-colors disabled:opacity-50"
      >
        <RefreshCw size={11} /> QR
      </button>
      <button
        onClick={() => setConfirmRemove(true)}
        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-600 transition-colors"
      >
        <Trash2 size={11} /> Remove
      </button>
    </div>
  )
}
