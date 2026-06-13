import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/Button'
import { UserPlus, Pencil } from 'lucide-react'
import { ParticipantSearch } from './ParticipantSearch'

type ParticipantRow = {
  id: string
  participant_type: string
  last_name: string
  first_name: string
  student_number: string
  school_email: string
  blocks: string[]
}

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function ParticipantsPage({ searchParams }: Props) {
  const { q } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = currentProfile?.role === 'admin'

  const base = supabase
    .from('participants')
    .select('id, participant_type, last_name, first_name, student_number, school_email, blocks')
    .order('last_name')
    .order('first_name')
    .limit(300)

  const built = q?.trim()
    ? base.or(
        `last_name.ilike.%${q.trim()}%,first_name.ilike.%${q.trim()}%,student_number.ilike.%${q.trim()}%,school_email.ilike.%${q.trim()}%`
      )
    : base

  const { data: participants } = await built.returns<ParticipantRow[]>()

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Participants</h1>
          {participants && (
            <p className="text-xs text-gray-400 mt-0.5">
              {participants.length}{q ? ' result' : ' total'}{participants.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {isAdmin && (
          <Link href="/participants/new">
            <Button size="sm">
              <UserPlus size={14} />
              New participant
            </Button>
          </Link>
        )}
      </div>

      <div className="mb-4">
        <ParticipantSearch defaultValue={q} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Student No.</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">School Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">Blocks</th>
                {isAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {participants?.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {p.last_name}, {p.first_name}
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{p.student_number}</td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell text-xs">{p.school_email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.participant_type === 'officer'
                        ? 'bg-violet-100 text-violet-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {p.participant_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
                    {p.blocks.length > 0 ? p.blocks.join(', ') : '—'}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/participants/${p.id}/edit`}
                        className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-900 transition-colors"
                      >
                        <Pencil size={12} />
                        Edit
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
              {(!participants || participants.length === 0) && (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-4 py-10 text-center text-sm text-gray-400">
                    {q ? `No participants matching "${q}".` : 'No participants yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
