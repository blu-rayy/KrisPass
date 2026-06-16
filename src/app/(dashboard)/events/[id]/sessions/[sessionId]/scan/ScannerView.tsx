'use client'

import { useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  QrCode,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Users,
} from 'lucide-react'
import dynamic from 'next/dynamic'

const QrReader = dynamic(
  () => import('@/components/scanner/QrReader').then((m) => m.QrReader),
  { ssr: false },
)
import { checkIn } from '@/lib/actions/attendance'

type ToastState = {
  id: number
  type: 'success' | 'warning' | 'error'
  message: string
}

type RecentScan = {
  id: number
  name: string
  team: string | null
  time: string
}

interface ScannerViewProps {
  eventId: string
  sessionId: string
  sessionName: string
  eventName: string
  scannerName: string
}

function beep(type: 'success' | 'warning' | 'error') {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = type === 'success' ? 880 : type === 'warning' ? 660 : 220
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)
  } catch {
    // AudioContext not available
  }
}

export function ScannerView({
  eventId,
  sessionId,
  sessionName,
  eventName,
  scannerName,
}: ScannerViewProps) {
  const [toasts, setToasts] = useState<ToastState[]>([])
  const [recentScans, setRecentScans] = useState<RecentScan[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const toastIdRef = useRef(0)
  const scanIdRef = useRef(0)
  const processingRef = useRef(false)
  const debounceRef = useRef<Map<string, number>>(new Map())

  function addToast(type: ToastState['type'], message: string) {
    const id = ++toastIdRef.current
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }

  const handleScan = useCallback(
    async (token: string) => {
      // Same-token debounce: ignore within 3s
      const now = Date.now()
      const last = debounceRef.current.get(token)
      if (last && now - last < 3000) return

      // Prevent concurrent processing
      if (processingRef.current) return
      processingRef.current = true
      debounceRef.current.set(token, now)
      setIsProcessing(true)

      try {
        const result = await checkIn(token, sessionId)

        if (!result.ok) {
          beep('error')
          addToast('error', result.error)
          return
        }

        const { data } = result

        if (data.result === 'not_found') {
          beep('error')
          navigator.vibrate?.(100)
          addToast('error', 'Invalid QR code')
          return
        }

        const name = data.participant
          ? `${data.participant.last_name}, ${data.participant.first_name}`
          : 'Unknown'

        if (data.result === 'already_scanned') {
          beep('warning')
          const time = data.scanned_at
            ? new Date(data.scanned_at).toLocaleTimeString('en-PH', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Manila',
              })
            : '—'
          addToast('warning', `Already checked in at ${time} · ${name}`)
          return
        }

        // success
        beep('success')
        navigator.vibrate?.(200)
        addToast(
          'success',
          `Checked in: ${name}${data.team_name ? ` · ${data.team_name}` : ''}`,
        )

        const scanId = ++scanIdRef.current
        setRecentScans((prev) =>
          [
            {
              id: scanId,
              name,
              team: data.team_name ?? null,
              time: new Date().toLocaleTimeString('en-PH', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZone: 'Asia/Manila',
              }),
            },
            ...prev,
          ].slice(0, 10),
        )
      } finally {
        processingRef.current = false
        setIsProcessing(false)
      }
    },
    [sessionId],
  )

  return (
    <div className="space-y-4">
      {/* Breadcrumb + header */}
      <div>
        <p className="text-sm text-gray-400 mb-1">
          <Link
            href={`/events/${eventId}`}
            className="hover:text-gray-700 transition-colors"
          >
            {eventName}
          </Link>
          <span className="mx-1">/</span>
          <span className="text-gray-600">{sessionName}</span>
        </p>
        <h1 className="text-xl font-semibold text-gray-900">Scan QR</h1>
      </div>

      {/* Camera */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <QrCode size={15} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-900">Camera</span>
          {isProcessing && (
            <span className="ml-auto text-xs text-violet-600 animate-pulse">
              Processing…
            </span>
          )}
        </div>
        <div className="p-4">
          <QrReader onScan={handleScan} />
        </div>
      </div>

      {/* Recent check-ins */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Clock size={15} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-900">Recent check-ins</span>
          <span className="ml-auto flex items-center gap-1 text-xs text-gray-400">
            <Users size={11} /> {scannerName}
          </span>
        </div>
        {recentScans.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {recentScans.map((scan) => (
              <li key={scan.id} className="px-5 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{scan.name}</p>
                  {scan.team && (
                    <p className="text-xs text-gray-400">{scan.team}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 font-mono ml-4 shrink-0">
                  {scan.time}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-6 text-sm text-gray-400 text-center">
            Scans will appear here.
          </p>
        )}
      </div>

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 max-w-xs w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-2 rounded-xl px-4 py-3 shadow-lg text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-green-600 text-white'
                : toast.type === 'warning'
                  ? 'bg-amber-500 text-white'
                  : 'bg-red-600 text-white'
            }`}
          >
            {toast.type === 'success' && (
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            )}
            {toast.type === 'warning' && (
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
            )}
            {toast.type === 'error' && (
              <XCircle size={16} className="shrink-0 mt-0.5" />
            )}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
