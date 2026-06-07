'use client'

import { useEffect, useRef, useState } from 'react'

interface QrScannerProps {
  onScan: (token: string) => void
}

export function QrScanner({ onScan }: QrScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scannerRef = useRef<InstanceType<typeof import('html5-qrcode')['Html5Qrcode']> | null>(null)
  const lastScanRef = useRef<string | null>(null)
  const lockRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    let mounted = true

    async function init() {
      const { Html5Qrcode } = await import('html5-qrcode')
      if (!mounted || !containerRef.current) return

      const qr = new Html5Qrcode('qr-reader')
      scannerRef.current = qr

      try {
        await qr.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (lockRef.current || decodedText === lastScanRef.current) return
            lockRef.current = true
            lastScanRef.current = decodedText
            onScan(decodedText)
            setTimeout(() => { lockRef.current = false }, 1500)
          },
          () => {}
        )
        if (mounted) setStarted(true)
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Camera error')
      }
    }

    init()

    return () => {
      mounted = false
      scannerRef.current?.stop().catch(() => {})
    }
  }, [onScan])

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
        Camera error: {error}
      </div>
    )
  }

  return (
    <div className="relative">
      <div id="qr-reader" ref={containerRef} className="w-full rounded-xl overflow-hidden" />
      {!started && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-xl">
          <p className="text-sm text-gray-500">Starting camera…</p>
        </div>
      )}
    </div>
  )
}
