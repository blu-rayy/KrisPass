'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { createUser } from '@/lib/actions/users'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Copy, CheckCircle, UserPlus } from 'lucide-react'

export function NewUserForm() {
  const [state, action, pending] = useActionState(createUser, null)
  const [copied, setCopied] = useState(false)

  async function copyPassword(pass: string) {
    await navigator.clipboard.writeText(pass)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (state?.ok) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle size={18} />
          <span className="font-semibold text-sm">User created successfully.</span>
        </div>
        <p className="text-sm text-gray-600">
          Share this temporary password with the new user. It will not be shown again.
        </p>
        <div className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
          <code className="flex-1 text-sm font-mono text-gray-900 tracking-wide">
            {state.data.tempPassword}
          </code>
          <button
            type="button"
            onClick={() => copyPassword(state.data.tempPassword)}
            className="text-gray-400 hover:text-gray-700 transition-colors"
            title="Copy password"
          >
            {copied ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} />}
          </button>
        </div>
        <p className="text-xs text-gray-400">
          The user will be required to change their password on first login.
        </p>
        <div className="flex gap-3 pt-1">
          <Link href="/users/new">
            <Button variant="secondary" size="sm">
              <UserPlus size={14} />
              Add another
            </Button>
          </Link>
          <Link href="/users">
            <Button variant="ghost" size="sm">Back to users</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4">

        {/* Account */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Account</h2>
          <Input
            id="email"
            name="email"
            type="email"
            label="School email"
            placeholder="user@feutech.edu.ph"
            required
            autoComplete="off"
          />
          <Input
            id="full_name"
            name="full_name"
            label="Display name"
            placeholder="Juan dela Cruz"
            required
          />
          <div className="space-y-1.5">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              Role
            </label>
            <select
              id="role"
              name="role"
              defaultValue="organizer"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="organizer">Organizer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Input
            id="committee"
            name="committee"
            label="Committee"
            placeholder="e.g. Academics"
          />
        </div>

        {/* Personal info */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Personal info</h2>
          <div className="grid grid-cols-2 gap-3">
            <Input id="first_name" name="first_name" label="First name" placeholder="Juan" />
            <Input id="last_name" name="last_name" label="Last name" placeholder="dela Cruz" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input id="middle_name" name="middle_name" label="Middle name" placeholder="Reyes" />
            <Input id="suffix" name="suffix" label="Suffix" placeholder="Jr." />
          </div>
          <Input
            id="personal_email"
            name="personal_email"
            type="email"
            label="Personal email"
            placeholder="juan@gmail.com"
          />
          <Input
            id="contact_no"
            name="contact_no"
            label="Contact number"
            placeholder="09171234567"
          />
        </div>

        {/* Academic info */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Academic info</h2>
          <Input
            id="student_number"
            name="student_number"
            label="Student number"
            placeholder="2021-12345"
          />
          <Input
            id="school"
            name="school"
            label="School"
            placeholder="FEU Tech"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="degree_program"
              name="degree_program"
              label="Degree program"
              placeholder="BS Computer Science"
            />
            <Input
              id="year_level"
              name="year_level"
              label="Year level"
              placeholder="1"
            />
          </div>
          <Input
            id="blocks"
            name="blocks"
            label="Blocks"
            placeholder="TN01, TN02"
          />
          <p className="text-xs text-gray-400 -mt-2">Separate multiple blocks with commas.</p>
        </div>

        {state?.ok === false && (
          <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
            {state.error}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? 'Creating…' : 'Create user'}
          </Button>
          <Link href="/users">
            <Button type="button" variant="ghost">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
