import { createServiceClient } from '@/lib/supabase/server'
import { Profile } from '@/types'
import { CreateUserForm } from './CreateUserForm'

export default async function UsersPage() {
  const service = createServiceClient()
  const { data: users } = await service
    .from('profiles')
    .select('*')
    .order('last_name')

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Users</h1>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Student No.</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">School Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Year / Program</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Block/s</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Committee</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(users ?? []).map((u: Profile) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {u.last_name}, {u.first_name}
                  {u.middle_initial ? ` ${u.middle_initial}.` : ''}
                  {u.suffix ? ` ${u.suffix}` : ''}
                </td>
                <td className="px-4 py-3 text-gray-500">{u.student_number ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{u.school_email ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">
                  {u.year_level && u.degree_program
                    ? `${u.year_level} · ${u.degree_program}`
                    : u.year_level ?? u.degree_program ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">{u.blocks ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{u.committee ?? '—'}</td>
                <td className="px-4 py-3 capitalize text-gray-500">{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Create staff account</h2>
        <CreateUserForm />
      </div>
    </div>
  )
}
