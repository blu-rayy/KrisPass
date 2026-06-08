'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'

interface Row {
  id: string
  last_name: string | null
  first_name: string | null
  middle_name: string | null
  suffix: string | null
  school_email: string | null
  student_number: string | null
  degree_program: string | null
  block: string | null
  team_name: string | null
  qr_token: string
  attended: boolean
  scanned_at: string | null
}

export function RosterTable({ rows, eventId }: { rows: Row[]; eventId: string }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(participantId: string) {
    if (!confirm('Remove this participant from the roster?')) return
    setDeleting(participantId)
    await fetch(`/api/participants/${eventId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId }),
    })
    setDeleting(null)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
      <table className="w-full text-sm whitespace-nowrap">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Student no.</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">School email</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Degree</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Block</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Team</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Scanned at</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900">
                {p.last_name}, {p.first_name}
                {p.middle_name ? ` ${p.middle_name}` : ''}
                {p.suffix ? ` ${p.suffix}` : ''}
              </td>
              <td className="px-4 py-3 text-gray-500">{p.student_number ?? '—'}</td>
              <td className="px-4 py-3 text-gray-500">{p.school_email ?? '—'}</td>
              <td className="px-4 py-3 text-gray-500">{p.degree_program ?? '—'}</td>
              <td className="px-4 py-3 text-gray-500">{p.block ?? '—'}</td>
              <td className="px-4 py-3 text-gray-500">{p.team_name ?? '—'}</td>
              <td className="px-4 py-3">
                <Badge variant={p.attended ? 'green' : 'gray'}>
                  {p.attended ? 'Attended' : 'Absent'}
                </Badge>
              </td>
              <td className="px-4 py-3 text-gray-400 text-xs">
                {p.scanned_at
                  ? new Date(p.scanned_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
                  : '—'}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => handleDelete(p.id)}
                  disabled={deleting === p.id}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
                >
                  {deleting === p.id ? 'Removing…' : 'Remove'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
