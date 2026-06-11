'use client'

import { useEffect, useRef } from 'react'
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode'

interface QrReaderProps {
  onScan: (result: string) => void
}

export function QrReader({ onScan }: QrReaderProps) {
  const elementId = 'qr-reader'
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      elementId,
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        rememberLastUsedCamera: true,
      },
      false
    )

    scanner.render(
      (decoded) => onScanRef.current(decoded),
      () => {}
    )

    scannerRef.current = scanner

    return () => {
      scannerRef.current?.clear().catch(() => {})
    }
  }, [])

  return <div id={elementId} />
}
