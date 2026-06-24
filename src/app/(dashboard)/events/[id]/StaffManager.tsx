'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { addStaff, removeStaff } from '@/lib/actions/events'
import { Button } from '@/components/ui/Button'
import { UserPlus, X, CheckCircle, Users, ChevronDown } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

type StaffMember = {
  profile_id: string
  profiles: {
    id: string
    full_name: string
    role: string
    committee: string | null
  }
}

type ProfileOption = {
  id: string
  full_name: string
  role: string
  committee: string | null
}

interface Props {
  eventId: string
  staff: StaffMember[]
  allProfiles: ProfileOption[]
  isAdmin: boolean
}

export function StaffManager({ eventId, staff, allProfiles, isAdmin }: Props) {
  const router = useRouter()
  const boundAdd = addStaff.bind(null, eventId)
  const [state, addAction, pending] = useActionState(boundAdd, null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (state?.ok === true) router.refresh()
  }, [state, router])

  const assignedIds = new Set(staff.map((s) => s.profile_id))
  const available = allProfiles.filter((p) => !assignedIds.has(p.id))

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-4 flex items-center gap-2 hover:bg-gray-50 transition-colors text-left"
      >
        <Users size={15} className="text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-900">Staff</h2>
        <span className="ml-auto text-xs text-gray-400 mr-2">{staff.length} assigned</span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && <><div className="border-t border-gray-100" />
      {staff.length > 0 ? (
        <div className="divide-y divide-gray-100">
          {staff.map((s) => (
            <div key={s.profile_id} className="flex items-center px-5 py-3 gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{s.profiles.full_name}</p>
                <p className="text-xs text-gray-500 capitalize">
                  {s.profiles.role}{s.profiles.committee ? ` · ${s.profiles.committee}` : ''}
                </p>
              </div>
              {isAdmin && (
                <ConfirmDialog
                  title="Remove staff member?"
                  description={`${s.profiles.full_name} will be unassigned from this event.`}
                  confirmLabel="Remove"
                  formAction={removeStaff}
                  hiddenFields={{ event_id: eventId, profile_id: s.profile_id }}
                  trigger={
                    <span className="block p-1 text-gray-300 hover:text-red-500 transition-colors cursor-pointer rounded">
                      <X size={13} />
                    </span>
                  }
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="px-5 py-4 text-sm text-gray-400">No staff assigned.</p>
      )}

      {isAdmin && available.length > 0 && (
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
          <p className="text-xs font-medium text-gray-500 mb-3">Assign staff</p>
          <form action={addAction} className="flex items-end gap-2">
            <div className="flex-1">
              <select
                name="profile_id"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="">Select a user…</option>
                {available.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}{p.committee ? ` (${p.committee})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" size="sm" disabled={pending}>
              <UserPlus size={13} />
              {pending ? 'Adding…' : 'Add'}
            </Button>
          </form>
          {state?.ok === false && (
            <p className="text-xs text-red-600 mt-2">{state.error}</p>
          )}
          {state?.ok === true && (
            <div className="flex items-center gap-1.5 text-xs text-green-700 mt-2">
              <CheckCircle size={12} />
              Staff added.
            </div>
          )}
        </div>
      )}

      {isAdmin && available.length === 0 && staff.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400">All users are already assigned.</p>
        </div>
      )}
      </>}
    </div>
  )
}
