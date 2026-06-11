'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { CheckCircle, XCircle } from 'lucide-react'

const QrReader = dynamic(
  () => import('@/components/scanner/QrReader').then((m) => m.QrReader),
  { ssr: false }
)

export default function TestQrPage() {
  const [lastScan, setLastScan] = useState<string | null>(null)
  const [scanCount, setScanCount] = useState(0)

  const handleScan = useCallback((result: string) => {
    setLastScan(result)
    setScanCount((n) => n + 1)
  }, [])

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-violet-600">QR Scanner Test</h1>
          <p className="mt-1 text-sm text-gray-500">
            Point the camera at a QR code to read its contents.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden">
          <QrReader onScan={handleScan} />
        </div>

        {lastScan !== null && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <CheckCircle size={16} className="text-green-500 shrink-0" />
              Scan #{scanCount}
            </div>
            <p className="font-mono text-sm break-all bg-gray-50 rounded-lg px-3 py-2 text-gray-800 border border-gray-200">
              {lastScan}
            </p>
          </div>
        )}

        {lastScan === null && (
          <div className="flex items-center gap-2 text-sm text-gray-400 justify-center">
            <XCircle size={16} />
            No QR code scanned yet
          </div>
        )}
      </div>
    </main>
  )
}
