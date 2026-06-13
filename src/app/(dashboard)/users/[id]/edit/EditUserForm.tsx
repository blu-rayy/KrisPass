'use client'

import { useActionState, useState } from 'react'
import { updateUser, resetUserPassword, deleteUser } from '@/lib/actions/users'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { CheckCircle, Copy, RotateCcw, Trash2 } from 'lucide-react'
import type { Profile } from '@/types'

interface Props {
  profile: Profile
  currentUserId: string
}

export function EditUserForm({ profile, currentUserId }: Props) {
  const boundUpdate = updateUser.bind(null, profile.id)
  const boundReset = resetUserPassword.bind(null, profile.id)
  const boundDelete = deleteUser.bind(null, profile.id)

  const [updateState, updateAction, updatePending] = useActionState(boundUpdate, null)
  const [resetState, resetAction, resetPending] = useActionState(boundReset, null)
  const [deleteState, deleteAction, deletePending] = useActionState(boundDelete, null)
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isSelf = profile.id === currentUserId

  async function copyPassword(pass: string) {
    await navigator.clipboard.writeText(pass)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Edit details</h2>
        <form action={updateAction} className="space-y-4">
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
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={14} />
              Delete user
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-red-700">
                Are you sure? This will permanently delete {profile.full_name}'s account.
              </p>
              <div className="flex gap-2">
                <form action={deleteAction}>
                  <Button type="submit" variant="danger" size="sm" disabled={deletePending}>
                    {deletePending ? 'Deleting…' : 'Yes, delete'}
                  </Button>
                </form>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                >
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
