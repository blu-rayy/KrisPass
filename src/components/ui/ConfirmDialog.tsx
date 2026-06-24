'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  title: string
  description: string
  confirmLabel?: string
  /** The element that opens the dialog — wrapped in a click handler */
  trigger: React.ReactNode
  formAction: (formData: FormData) => void | Promise<void>
  hiddenFields?: Record<string, string>
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Delete',
  trigger,
  formAction,
  hiddenFields = {},
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <span role="button" tabIndex={0} onClick={() => setOpen(true)} onKeyDown={(e) => e.key === 'Enter' && setOpen(true)}>
        {trigger}
      </span>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle size={16} className="text-red-600" />
              </div>
              <div className="pt-0.5">
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500 mt-1">{description}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <form action={formAction} onSubmit={() => setOpen(false)}>
                {Object.entries(hiddenFields).map(([k, v]) => (
                  <input key={k} type="hidden" name={k} value={v} />
                ))}
                <button
                  type="submit"
                  className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  {confirmLabel}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
