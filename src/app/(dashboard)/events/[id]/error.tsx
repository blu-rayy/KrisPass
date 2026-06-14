'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react'

export default function EventError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto">
      <Link
        href="/events"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft size={13} /> All events
      </Link>
      <div className="rounded-xl border border-red-100 bg-red-50 p-10 text-center space-y-4">
        <div className="flex justify-center">
          <div className="rounded-full bg-white p-4 shadow-sm">
            <AlertTriangle size={28} className="text-red-500" />
          </div>
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Failed to load event</h2>
          <p className="mt-1 text-sm text-gray-500">
            {error.message || 'An unexpected error occurred while loading this event.'}
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
          >
            <RotateCcw size={14} /> Try again
          </button>
          <Link
            href="/events"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300 transition-colors"
          >
            Back to events
          </Link>
        </div>
      </div>
    </div>
  )
}
