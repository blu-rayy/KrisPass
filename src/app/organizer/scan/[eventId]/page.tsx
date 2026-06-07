'use client'

import dynamic from 'next/dynamic'
import { useState, useCallback } from 'react'
import { CheckInFeedItem } from '@/components/scanner/CheckInFeedItem'
import { CheckInResponse } from '@/types'

const QrScanner = dynamic(
  () => import('@/components/scanner/QrScanner').then((m) => m.QrScanner),
  { ssr: false, loading: () => <div className="bg-gray-100 rounded-xl h-64 flex items-center justify-center text-sm text-gray-400">Loading camera…</div> }
)

interface FeedEntry {
  id: string
  result: CheckInResponse
  timestamp: string
}

export default function ScanPage({ params }: { params: { eventId: string } }) {
  const [feed, setFeed] = useState<FeedEntry[]>([])
  const [lastResult, setLastResult] = useState<CheckInResponse | null>(null)

  const handleScan = useCallback(async (token: string) => {
    const res = await fetch(`/api/participants/${params.eventId}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })

    const data: CheckInResponse = await res.json()
    setLastResult(data)

    const entry: FeedEntry = {
      id: crypto.randomUUID(),
      result: data,
      timestamp: new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    }

    setFeed((prev) => [entry, ...prev].slice(0, 20))
  }, [params.eventId])

  const resultColors = {
    success: 'bg-green-50 border-green-300 text-green-800',
    duplicate: 'bg-yellow-50 border-yellow-300 text-yellow-800',
    not_found: 'bg-red-50 border-red-300 text-red-800',
  }

  const resultMessages = {
    success: `✓ Checked in — ${lastResult?.participant?.full_name}`,
    duplicate: `Already checked in — ${lastResult?.participant?.full_name}`,
    not_found: 'QR code not recognized',
  }

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 mb-4">Scan QR codes</h1>
        <QrScanner onScan={handleScan} />
        {lastResult && (
          <div className={`mt-4 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${resultColors[lastResult.result]}`}>
            {resultMessages[lastResult.result]}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent check-ins</h2>
        {feed.length === 0 ? (
          <p className="text-sm text-gray-400">Scans will appear here…</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 px-4 divide-y divide-gray-100">
            {feed.map((entry) => (
              <CheckInFeedItem key={entry.id} result={entry.result} timestamp={entry.timestamp} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
