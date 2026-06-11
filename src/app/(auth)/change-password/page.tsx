'use client'

import { useActionState } from 'react'
import { changePassword } from '@/lib/actions/auth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function ChangePasswordPage() {
  const [state, action, pending] = useActionState(changePassword, null)

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-violet-600 tracking-tight">KrisPass</h1>
          <p className="mt-1 text-sm text-gray-500">Set a new password to continue</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-gray-900">Change password</h2>
            <p className="mt-1 text-sm text-gray-500">
              You must set a new password before accessing your account.
            </p>
          </div>

          <form action={action} className="space-y-4">
            <Input
              id="password"
              name="password"
              type="password"
              label="New password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <Input
              id="confirm"
              name="confirm"
              type="password"
              label="Confirm password"
              placeholder="Repeat new password"
              autoComplete="new-password"
              minLength={8}
              required
            />

            {state?.ok === false && (
              <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                {state.error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Saving…' : 'Set new password'}
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}
