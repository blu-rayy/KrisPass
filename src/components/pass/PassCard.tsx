'use client'

import QRCode from 'react-qr-code'
import { formatDate } from '@/lib/utils'

interface PassCardProps {
  fullName: string
  qrToken: string
  event: {
    name: string
    event_date: string
    location: string | null
  } | null
}

export function PassCard({ fullName, qrToken, event }: PassCardProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-blue-600 px-6 py-5 text-white text-center">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-1">FEU Tech ACM</p>
          <h1 className="text-xl font-bold">{event?.name ?? 'Event'}</h1>
          {event?.event_date && (
            <p className="text-sm opacity-80 mt-1">{formatDate(event.event_date)}</p>
          )}
          {event?.location && (
            <p className="text-xs opacity-70 mt-0.5">{event.location}</p>
          )}
        </div>

        <div className="px-6 py-8 flex flex-col items-center gap-5">
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
            <QRCode value={qrToken} size={200} />
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Participant</p>
            <p className="text-xl font-bold text-gray-900">{fullName}</p>
          </div>

          <p className="text-xs text-gray-300 font-mono break-all text-center">{qrToken}</p>
        </div>

        <div className="px-6 pb-6 text-center">
          <p className="text-xs text-gray-400">Present this QR code at check-in. Do not share with others.</p>
        </div>
      </div>
    </div>
  )
}
