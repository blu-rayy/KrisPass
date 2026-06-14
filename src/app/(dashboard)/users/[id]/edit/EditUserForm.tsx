'use client'

import { useActionState, useState } from 'react'
import { updateUser, resetUserPassword, deleteUser, setUserEventAssignments } from '@/lib/actions/users'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { CheckCircle, Copy, RotateCcw, Trash2, Calendar } from 'lucide-react'
import type { Profile } from '@/types'

interface Props {
  profile: Profile
  currentUserId: string
  allEvents: { id: string; name: string }[]
  assignedEventIds: Set<string>
}

export function EditUserForm({ profile, currentUserId, allEvents, assignedEventIds }: Props) {
  const boundUpdate = updateUser.bind(null, profile.id)
  const boundReset = resetUserPassword.bind(null, profile.id)
  const boundDelete = deleteUser.bind(null, profile.id)
  const boundAssign = setUserEventAssignments.bind(null, profile.id)

  const [updateState, updateAction, updatePending] = useActionState(boundUpdate, null)
  const [resetState, resetAction, resetPending] = useActionState(boundReset, null)
  const [deleteState, deleteAction, deletePending] = useActionState(boundDelete, null)
  const [assignState, assignAction, assignPending] = useActionState(boundAssign, null)
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set(assignedEventIds))

  const isSelf = profile.id === currentUserId

  async function copyPassword(pass: string) {
    await navigator.clipboard.writeText(pass)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function toggleEvent(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-6">
      {/* Account info */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Account info</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {profile.school_email && (
            <div>
              <dt className="text-gray-500">School email</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{profile.school_email}</dd>
            </div>
          )}
          <div>
            <dt className="text-gray-500">Member since</dt>
            <dd className="font-medium text-gray-900 mt-0.5">
              {new Date(profile.created_at).toLocaleDateString('en-PH', {
                year: 'numeric', month: 'short', day: 'numeric',
              })}
            </dd>
          </div>
        </dl>
      </div>

      {/* Edit form */}
      <form action={updateAction} className="space-y-4">
        {/* Account details */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Account details</h2>
          <Input
            id="full_name"
            name="full_name"
            label="Display name"
            defaultValue={profile.full_name}
            required
          />
          <div className="space-y-1.5">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              Role
            </label>
            <select
              id="role"
              name="role"
              defaultValue={profile.role}
              disabled={isSelf}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="organizer">Organizer</option>
              <option value="admin">Admin</option>
            </select>
            {isSelf && (
              <p className="text-xs text-gray-400">You cannot change your own role.</p>
            )}
          </div>
          <Input
            id="committee"
            name="committee"
            label="Committee"
            defaultValue={profile.committee ?? ''}
            placeholder="e.g. Academics"
          />
        </div>

        {/* Personal info */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Personal info</h2>
          <div className="grid grid-cols-2 gap-3">
            <Input id="first_name" name="first_name" label="First name" defaultValue={profile.first_name ?? ''} placeholder="Juan" />
            <Input id="last_name" name="last_name" label="Last name" defaultValue={profile.last_name ?? ''} placeholder="dela Cruz" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input id="middle_name" name="middle_name" label="Middle name" defaultValue={profile.middle_name ?? ''} placeholder="Reyes" />
            <Input id="suffix" name="suffix" label="Suffix" defaultValue={profile.suffix ?? ''} placeholder="Jr." />
          </div>
          <Input
            id="personal_email"
            name="personal_email"
            type="email"
            label="Personal email"
            defaultValue={profile.personal_email ?? ''}
            placeholder="juan@gmail.com"
          />
          <Input
            id="contact_no"
            name="contact_no"
            label="Contact number"
            defaultValue={profile.contact_no ?? ''}
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
            defaultValue={profile.student_number ?? ''}
            placeholder="2021-12345"
          />
          <Input
            id="school"
            name="school"
            label="School"
            defaultValue={profile.school ?? ''}
            placeholder="FEU Tech"
          />
          <Input
            id="degree_program"
            name="degree_program"
            label="Degree program"
            defaultValue={profile.degree_program ?? ''}
            placeholder="BS Computer Science"
          />
          <div className="space-y-1">
            <Input
              id="blocks"
              name="blocks"
              label="Blocks"
              defaultValue={profile.blocks?.join(', ') ?? ''}
              placeholder="TN01, TN02"
            />
            <p className="text-xs text-gray-400">Separate multiple blocks with commas.</p>
          </div>
        </div>

        {updateState?.ok === false && (
          <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
            {updateState.error}
          </p>
        )}
        {updateState?.ok === true && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
            <CheckCircle size={14} />
            Changes saved.
          </div>
        )}

        <Button type="submit" disabled={updatePending}>
          {updatePending ? 'Saving…' : 'Save changes'}
        </Button>
      </form>

      {/* Assign to events */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Calendar size={14} className="text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Assigned events</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Assigning to an event also creates an officer-participant record and QR pass for this user.
        </p>

        {allEvents.length === 0 ? (
          <p className="text-sm text-gray-400">No events yet.</p>
        ) : (
          <form action={assignAction} className="space-y-4">
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {allEvents.map((ev) => (
                <label
                  key={ev.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 hover:border-violet-300 hover:bg-violet-50/40 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    name="event_ids"
                    value={ev.id}
                    checked={checkedIds.has(ev.id)}
                    onChange={() => toggleEvent(ev.id)}
                    className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-sm text-gray-800">{ev.name}</span>
                </label>
              ))}
            </div>

            {assignState?.ok === false && (
              <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                {assignState.error}
              </p>
            )}
            {assignState?.ok === true && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
                <CheckCircle size={14} />
                Event assignments saved.
              </div>
            )}

            <Button type="submit" variant="secondary" disabled={assignPending}>
              {assignPending ? 'Saving…' : 'Save assignments'}
            </Button>
          </form>
        )}
      </div>

      {/* Reset password */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Reset password</h2>
        <p className="text-sm text-gray-500 mb-4">
          Generates a new temporary password. The user will be required to change it on next login.
        </p>

        {resetState?.ok === true ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">New temporary password:</p>
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
              <code className="flex-1 text-sm font-mono text-gray-900 tracking-wide">
                {resetState.data.tempPassword}
              </code>
              <button
                type="button"
                onClick={() => copyPassword(resetState.data.tempPassword)}
                className="text-gray-400 hover:text-gray-700 transition-colors"
                title="Copy password"
              >
                {copied ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} />}
              </button>
            </div>
            <p className="text-xs text-gray-400">This will not be shown again.</p>
          </div>
        ) : (
          <>
            {resetState?.ok === false && (
              <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600 mb-3">
                {resetState.error}
              </p>
            )}
            <form action={resetAction}>
              <Button type="submit" variant="secondary" disabled={resetPending}>
                <RotateCcw size={14} />
                {resetPending ? 'Resetting…' : 'Reset password'}
              </Button>
            </form>
          </>
        )}
      </div>

      {/* Danger zone */}
      {!isSelf && (
        <div className="rounded-xl border border-red-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-red-700 mb-1">Danger zone</h2>
          <p className="text-sm text-gray-500 mb-4">
            Permanently deletes the account. This cannot be undone.
          </p>

          {deleteState?.ok === false && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600 mb-3">
              {deleteState.error}
            </p>
          )}

          {!confirmDelete ? (
            <Button type="button" variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} />
              Delete user
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-red-700">
                Are you sure? This will permanently delete {profile.full_name}&apos;s account.
              </p>
              <div className="flex gap-2">
                <form action={deleteAction}>
                  <Button type="submit" variant="danger" size="sm" disabled={deletePending}>
                    {deletePending ? 'Deleting…' : 'Yes, delete'}
                  </Button>
                </form>
                <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
