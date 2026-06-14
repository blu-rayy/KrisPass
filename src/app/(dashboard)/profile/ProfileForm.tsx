'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { updateProfile } from '@/lib/actions/profile'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { CheckCircle, KeyRound } from 'lucide-react'
import type { Profile } from '@/types'

interface ProfileFormProps {
  profile: Profile
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [state, action, pending] = useActionState(updateProfile, null)

  return (
    <div className="space-y-6">
      {/* Info card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Account info</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-gray-500">Role</dt>
            <dd className="font-medium text-gray-900 capitalize mt-0.5">{profile.role}</dd>
          </div>
          {profile.school_email && (
            <div>
              <dt className="text-gray-500">School email</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{profile.school_email}</dd>
            </div>
          )}
          {profile.student_number && (
            <div>
              <dt className="text-gray-500">Student #</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{profile.student_number}</dd>
            </div>
          )}
          {profile.degree_program && (
            <div>
              <dt className="text-gray-500">Program</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{profile.degree_program}</dd>
            </div>
          )}
          {profile.blocks.length > 0 && (
            <div className="col-span-2">
              <dt className="text-gray-500">Blocks</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{profile.blocks.join(', ')}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Edit form */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Edit profile</h2>
        <form action={action} className="space-y-4">
          <Input
            id="full_name"
            name="full_name"
            label="Display name"
            defaultValue={profile.full_name}
            required
          />
          <Input
            id="committee"
            name="committee"
            label="Committee"
            defaultValue={profile.committee ?? ''}
            placeholder="e.g. Academics"
          />
          <Input
            id="personal_email"
            name="personal_email"
            type="email"
            label="Personal email"
            defaultValue={profile.personal_email ?? ''}
            placeholder="you@gmail.com"
          />
          <Input
            id="contact_no"
            name="contact_no"
            label="Contact number"
            defaultValue={profile.contact_no ?? ''}
            placeholder="+63 9XX XXX XXXX"
          />
          <Input
            id="year_level"
            name="year_level"
            label="Year level"
            defaultValue={profile.year_level ?? ''}
            placeholder="1st Year"
          />

          {state?.ok === false && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
              {state.error}
            </p>
          )}
          {state?.ok === true && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
              <CheckCircle size={14} />
              Profile updated.
            </div>
          )}

          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </div>

      {/* Security */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Security</h2>
        <Link
          href="/auth/change-password"
          className="inline-flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 font-medium"
        >
          <KeyRound size={14} />
          Change password
        </Link>
      </div>
    </div>
  )
}
