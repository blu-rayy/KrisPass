'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

export function CreateUserForm() {
  const router = useRouter()
  const [form, setForm] = useState({
    email: '', password: '',
    last_name: '', first_name: '', middle_initial: '', suffix: '',
    student_number: '', school_email: '', year_level: '', degree_program: '', blocks: '',
    committee: '', role: 'organizer',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) { setError(json.error ?? 'Failed to create user'); return }

    setSuccess(true)
    setForm({
      email: '', password: '',
      last_name: '', first_name: '', middle_initial: '', suffix: '',
      student_number: '', school_email: '', year_level: '', degree_program: '', blocks: '',
      committee: '', role: 'organizer',
    })
    router.refresh()
    setTimeout(() => setSuccess(false), 3000)
  }

  const field = (label: string, key: string, opts?: { required?: boolean; type?: string }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{opts?.required && ' *'}
      </label>
      <input
        type={opts?.type ?? 'text'}
        required={opts?.required}
        value={(form as Record<string, string>)[key]}
        onChange={set(key)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Name</p>
      <div className="grid grid-cols-2 gap-4">
        {field('Surname', 'last_name', { required: true })}
        {field('First name', 'first_name', { required: true })}
        {field('Middle initial', 'middle_initial')}
        {field('Suffix', 'suffix')}
      </div>

      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium pt-1">Student info</p>
      <div className="grid grid-cols-2 gap-4">
        {field('Student number', 'student_number')}
        {field('School email', 'school_email')}
        {field('Year level', 'year_level')}
        {field('Degree program', 'degree_program')}
        {field('Block/s', 'blocks')}
      </div>

      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium pt-1">ACM info</p>
      <div className="grid grid-cols-2 gap-4">
        {field('Committee', 'committee')}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            value={form.role}
            onChange={set('role')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="organizer">Organizer</option>
            <option value="scanner">Scanner</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium pt-1">Login credentials</p>
      <div className="grid grid-cols-2 gap-4">
        {field('Login email', 'email', { required: true, type: 'email' })}
        {field('Password', 'password', { required: true, type: 'password' })}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      {success && <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">Account created successfully.</p>}
      <Button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create account'}</Button>
    </form>
  )
}
