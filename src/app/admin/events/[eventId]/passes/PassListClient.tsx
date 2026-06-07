'use client'

import { useState } from 'react'

interface PassRow {
  id: string
  last_name: string
  first_name: string
  middle_name: string | null
  suffix: string | null
  school_email: string
  qr_token: string
}

interface PassListClientProps {
  rows: PassRow[]
  appUrl: string
}

export function PassListClient({ rows, appUrl }: PassListClientProps) {
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
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-5 py-3 font-medium text-gray-600">Name</th>
            <th className="text-left px-5 py-3 font-medium text-gray-600">School email</th>
            <th className="text-left px-5 py-3 font-medium text-gray-600">Pass link</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((p) => {
            const passUrl = `${appUrl}/pass/${p.qr_token}`
            const fullName = `${p.last_name}, ${p.first_name}${p.middle_name ? ` ${p.middle_name}` : ''}${p.suffix ? ` ${p.suffix}` : ''}`
            return (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 font-medium text-gray-900">{fullName}</td>
                <td className="px-5 py-3 text-gray-500">{p.school_email}</td>
                <td className="px-5 py-3">
                  <a
                    href={passUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-xs font-mono"
                  >
                    /pass/{p.qr_token.slice(0, 8)}…
                  </a>
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => copyLink(p.qr_token)}
                    className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    {copied === p.qr_token ? 'Copied!' : 'Copy'}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
