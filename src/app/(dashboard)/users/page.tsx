import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { UserPlus, KeyRound, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { Profile } from '@/types'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (currentProfile?.role !== 'admin') redirect('/events')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, role, committee, school_email, must_change_password, created_at')
    .order('created_at', { ascending: true })
    .returns<Pick<Profile, 'id' | 'full_name' | 'role' | 'committee' | 'school_email' | 'must_change_password' | 'created_at'>[]>()

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Users</h1>
        <Link href="/users/new">
          <Button size="sm">
            <UserPlus size={14} />
            New user
          </Button>
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Committee</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {profiles?.map((profile) => (
              <tr key={profile.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {profile.full_name}
                  {profile.id === user.id && (
                    <span className="ml-2 text-xs text-gray-400">(you)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{profile.school_email ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    profile.role === 'admin'
                      ? 'bg-violet-100 text-violet-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {profile.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{profile.committee ?? '—'}</td>
                <td className="px-4 py-3">
                  {profile.must_change_password ? (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                      <KeyRound size={11} />
                      Temp password
                    </span>
                  ) : (
                    <span className="text-xs text-green-600">Active</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/users/${profile.id}/edit`}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    <Pencil size={12} />
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {(!profiles || profiles.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
