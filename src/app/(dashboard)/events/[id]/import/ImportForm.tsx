'use client'

import { useActionState, useRef } from 'react'
import { importParticipants } from '@/lib/actions/participants'
import { Button } from '@/components/ui/Button'
import { Upload, Download, CheckCircle, AlertCircle, FileText } from 'lucide-react'

const TEMPLATE_HEADERS = [
  'participant_type',
  'last_name',
  'first_name',
  'middle_name',
  'suffix',
  'school_email',
  'personal_email',
  'contact_no',
  'school',
  'student_number',
  'degree_program',
  'blocks',
].join(',')

const TEMPLATE_EXAMPLE =
  'attendee,dela Cruz,Juan,,,juan@feutech.edu.ph,juan@gmail.com,09123456789,FEU Tech,2021100001,BSCS,'

const REQUIRED_COLS = ['participant_type', 'last_name', 'first_name', 'school_email', 'personal_email', 'student_number']
const OPTIONAL_COLS = ['middle_name', 'suffix', 'contact_no', 'school', 'degree_program', 'blocks']

function downloadTemplate() {
  const csv = [TEMPLATE_HEADERS, TEMPLATE_EXAMPLE].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'krispass_import_template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

interface Props {
  eventId: string
}

export function ImportForm({ eventId }: Props) {
  const boundAction = importParticipants.bind(null, eventId)
  const [state, action, pending] = useActionState(boundAction, null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasResult = state?.ok === true
  const hasError = state?.ok === false

  return (
    <div className="space-y-4">
      {/* Template download */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-1">CSV format</h2>
            <div className="text-xs text-gray-500 space-y-1">
              <p>
                <span className="font-medium text-gray-700">Required:</span>{' '}
                {REQUIRED_COLS.join(', ')}
              </p>
              <p>
                <span className="font-medium text-gray-700">Optional:</span>{' '}
                {OPTIONAL_COLS.join(', ')}
              </p>
              <p className="text-gray-400 mt-2">
                For <span className="font-medium">blocks</span>, separate multiple values with a pipe: <code className="bg-gray-100 px-1 rounded">A1|B2</code>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-700 shrink-0 transition-colors"
          >
            <Download size={13} />
            Template
          </button>
        </div>
      </div>

      {/* Upload form */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <form action={action} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CSV file</label>
            <label
              htmlFor="csv-input"
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-colors"
            >
              <FileText size={24} className="text-gray-300" />
              <span className="text-sm text-gray-500">Click to select a CSV file</span>
              <span className="text-xs text-gray-400">.csv only</span>
              <input
                ref={fileInputRef}
                id="csv-input"
                name="csv"
                type="file"
                accept=".csv"
                required
                className="sr-only"
                onChange={(e) => {
                  const label = e.target.closest('label')
                  const span = label?.querySelector('span')
                  if (span && e.target.files?.[0]) {
                    span.textContent = e.target.files[0].name
                  }
                }}
              />
            </label>
          </div>

          {hasError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-600">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              {state.error}
            </div>
          )}

          <Button type="submit" disabled={pending} className="w-full justify-center">
            <Upload size={14} />
            {pending ? 'Importing…' : 'Import CSV'}
          </Button>
        </form>
      </div>

      {/* Results */}
      {hasResult && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle size={16} />
            <span className="text-sm font-semibold">Import complete</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-center">
              <p className="text-2xl font-semibold text-green-700">{state.data.inserted}</p>
              <p className="text-xs text-green-600 mt-0.5">Inserted</p>
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-center">
              <p className="text-2xl font-semibold text-blue-700">{state.data.updated}</p>
              <p className="text-xs text-blue-600 mt-0.5">Updated</p>
            </div>
            <div className="rounded-lg bg-violet-50 border border-violet-200 p-3 text-center">
              <p className="text-2xl font-semibold text-violet-700">{state.data.added_to_roster}</p>
              <p className="text-xs text-violet-600 mt-0.5">Added to roster</p>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center">
              <p className="text-2xl font-semibold text-amber-700">{state.data.teams_assigned}</p>
              <p className="text-xs text-amber-600 mt-0.5">Teams assigned</p>
            </div>
          </div>

          {state.data.errors.length > 0 && (
            <div>
              <p className="text-xs font-medium text-red-600 mb-2">
                {state.data.errors.length} row{state.data.errors.length !== 1 ? 's' : ''} skipped
              </p>
              <div className="rounded-lg border border-red-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-red-50 border-b border-red-200">
                      <th className="px-3 py-2 text-left font-medium text-red-700 w-16">Row</th>
                      <th className="px-3 py-2 text-left font-medium text-red-700">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {state.data.errors.map((err) => (
                      <tr key={err.row}>
                        <td className="px-3 py-2 text-red-500">{err.row}</td>
                        <td className="px-3 py-2 text-red-600">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
