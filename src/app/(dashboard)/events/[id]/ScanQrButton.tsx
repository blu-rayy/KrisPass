'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { QrCode } from 'lucide-react'

type Session = { id: string; name: string | null }

interface ScanQrButtonProps {
  eventId: string
  sessions: Session[]
  colored?: boolean
}

export function ScanQrButton({ eventId, sessions, colored }: ScanQrButtonProps) {
  const router = useRouter()
  const [showPicker, setShowPicker] = useState(false)

  const baseClass = 'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all'
  const activeClass = colored
    ? `${baseClass} bg-violet-600 text-white hover:bg-violet-700 border border-transparent`
    : `${baseClass} border border-gray-200 bg-white text-gray-700 hover:border-violet-300 hover:text-violet-700`
  const disabledClass = colored
    ? `${baseClass} bg-violet-200 text-white border border-transparent cursor-not-allowed`
    : `${baseClass} border border-gray-200 bg-white text-gray-300 cursor-not-allowed`

  if (sessions.length === 0) {
    return (
      <button disabled title="Add a session first" className={disabledClass}>
        <QrCode size={14} /> Scan QR
      </button>
    )
  }

  if (sessions.length === 1) {
    return (
      <button
        onClick={() => router.push(`/events/${eventId}/sessions/${sessions[0].id}/scan`)}
        className={activeClass}
      >
        <QrCode size={14} /> Scan QR
      </button>
    )
  }

  // Multiple sessions — show dropdown
  return (
    <div className="relative">
      <button onClick={() => setShowPicker((v) => !v)} className={activeClass}>
        <QrCode size={14} /> Scan QR
      </button>
      {showPicker && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowPicker(false)}
          />
          <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-44">
            <p className="px-4 py-1.5 text-xs text-gray-400 font-medium">
              Choose session
            </p>
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => {
                  setShowPicker(false)
                  router.push(`/events/${eventId}/sessions/${session.id}/scan`)
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {session.name ?? 'Session'}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
