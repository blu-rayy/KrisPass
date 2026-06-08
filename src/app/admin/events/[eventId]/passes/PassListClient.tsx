'use client'

import Link from 'next/link'
import QRCode from 'react-qr-code'
import { useState } from 'react'

interface PassRow {
  id: string
  last_name: string
  first_name: string
  middle_name: string | null
  suffix: string | null
  school_email: string
  student_number: string | null
  qr_token: string
}

interface PassListClientProps {
  rows: PassRow[]
  appUrl: string
  eventName: string
}

export function PassListClient({ rows, appUrl, eventName }: PassListClientProps) {
  const [copied, setCopied] = useState<string | null>(null)

  async function copyLink(token: string) {
    await navigator.clipboard.writeText(`${appUrl}/pass/${token}`)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="font-medium">No participants on roster yet</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {rows.map((p) => {
        const passUrl = `${appUrl}/pass/${p.qr_token}`
        const fullName = `${p.first_name}${p.middle_name ? ` ${p.middle_name}` : ''} ${p.last_name}`

        return (
          <div key={p.id} className="group flex flex-col rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
            {/* Mini ticket header */}
            <div className="bg-gradient-to-br from-violet-700 to-violet-900 px-3 py-2.5">
              <p className="text-violet-300 text-[8px] uppercase tracking-widest font-semibold truncate">FEU Tech ACM</p>
              <p className="text-white text-xs font-bold truncate mt-0.5">{eventName}</p>
            </div>

            {/* Tear line */}
            <div className="bg-gray-100 flex items-center relative h-3">
              <div className="absolute -left-2 w-4 h-4 rounded-full bg-white border border-gray-200" />
              <div className="flex-1 border-t border-dashed border-gray-300 mx-2" />
              <div className="absolute -right-2 w-4 h-4 rounded-full bg-white border border-gray-200" />
            </div>

            {/* QR + info */}
            <div className="bg-gray-50 px-3 pb-3 flex flex-col items-center gap-2 flex-1">
              <div className="bg-white p-2 rounded-xl shadow-sm mt-1">
                <QRCode value={p.qr_token} size={80} />
              </div>
              <div className="text-center">
                <p className="text-gray-900 text-xs font-bold leading-tight">{fullName}</p>
                {p.student_number && (
                  <p className="text-gray-400 text-[9px] mt-0.5">{p.student_number}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-gray-100 flex divide-x divide-gray-100">
              <Link
                href={passUrl}
                target="_blank"
                className="flex-1 text-center text-[10px] text-violet-600 font-medium py-2 hover:bg-violet-50 transition-colors"
              >
                View
              </Link>
              <button
                onClick={() => copyLink(p.qr_token)}
                className="flex-1 text-center text-[10px] text-gray-500 font-medium py-2 hover:bg-gray-50 transition-colors"
              >
                {copied === p.qr_token ? '✓ Copied' : 'Copy link'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
