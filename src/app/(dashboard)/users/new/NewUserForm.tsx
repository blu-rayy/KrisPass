'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { createUser } from '@/lib/actions/users'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Copy, CheckCircle, UserPlus } from 'lucide-react'
import { useState } from 'react'

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
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <form action={action} className="space-y-4">
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

        {state?.ok === false && (
          <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
            {state.error}
          </p>
        )}

        <div className="flex gap-3 pt-1">
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
