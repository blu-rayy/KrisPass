'use client'

import dynamic from 'next/dynamic'
import { useState, useCallback } from 'react'
import { CheckInFeedItem } from '@/components/scanner/CheckInFeedItem'
import { CheckInResponse } from '@/types'

const QrScanner = dynamic(
  () => import('@/components/scanner/QrScanner').then((m) => m.QrScanner),
  { ssr: false, loading: () => <div className="bg-gray-900 rounded-2xl h-64 flex items-center justify-center text-sm text-gray-400">Loading camera…</div> }
)

interface FeedEntry {
  id: string
  result: CheckInResponse
  timestamp: string
}

const resultConfig = {
  success: {
    bg: 'bg-green-500',
    text: 'text-white',
    label: 'ATTENDED',
    icon: '✓',
  },
  timeout: {
    bg: 'bg-amber-400',
    text: 'text-amber-900',
    label: 'TIMED OUT',
    icon: '↩',
  },
  not_found: {
    bg: 'bg-red-500',
    text: 'text-white',
    label: 'NOT FOUND',
    icon: '✕',
  },
}

export default function ScanPage({ params }: { params: { eventId: string } }) {
  const [feed, setFeed] = useState<FeedEntry[]>([])
  const [lastResult, setLastResult] = useState<CheckInResponse | null>(null)
  const [flash, setFlash] = useState(false)

  const handleScan = useCallback(async (token: string) => {
    const res = await fetch(`/api/participants/${params.eventId}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })

    const data: CheckInResponse = await res.json()
    setLastResult(data)
    setFlash(true)
    setTimeout(() => setFlash(false), 800)

    setFeed((prev) => [
      {
        id: crypto.randomUUID(),
        result: data,
        timestamp: new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      },
      ...prev,
    ].slice(0, 20))
  }, [params.eventId])

  const cfg = lastResult ? resultConfig[lastResult.result] : null
  const pName = lastResult?.participant
    ? `${lastResult.participant.last_name}, ${lastResult.participant.first_name}`
    : ''

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Scanner column */}
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-bold text-gray-900">Scan QR codes</h1>
        <QrScanner onScan={handleScan} />

        {/* Big bold result banner */}
        {cfg && (
          <div
            className={`rounded-2xl px-5 py-5 transition-all duration-300 ${cfg.bg} ${flash ? 'scale-[1.02]' : 'scale-100'}`}
          >
            <div className={`flex items-center gap-3 ${cfg.text}`}>
              <span className="text-4xl font-black leading-none">{cfg.icon}</span>
              <div>
                <p className="text-2xl font-black tracking-wide leading-none">{cfg.label}</p>
                {pName && (
                  <p className="text-sm font-semibold opacity-80 mt-1">{pName}</p>
                )}
                {lastResult?.result === 'not_found' && (
                  <p className="text-sm opacity-70 mt-1">QR code not recognized</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Feed column */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent scans</h2>
        {feed.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 px-5 py-10 text-center text-gray-400 text-sm">
            Scans will appear here…
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 px-4 divide-y divide-gray-100">
            {feed.map((entry) => (
              <CheckInFeedItem key={entry.id} result={entry.result} timestamp={entry.timestamp} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
