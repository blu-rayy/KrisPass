'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { CsvRowError } from '@/types'

interface CsvUploaderProps {
  eventId: string
}

type State = 'idle' | 'parsing' | 'preview' | 'uploading' | 'done' | 'error'

interface PreviewRow {
  last_name: string
  first_name: string
  school_email: string
  personal_email: string
  block?: string
  [key: string]: string | undefined
}

export function CsvUploader({ eventId }: CsvUploaderProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<State>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [parseError, setParseError] = useState<string | null>(null)
  const [result, setResult] = useState<{ inserted: number; updated: number; errors: CsvRowError[] } | null>(null)

  function handleFile(selected: File) {
    setFile(selected)
    setState('parsing')
    setParseError(null)

    Papa.parse<Record<string, string>>(selected, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
      complete(results) {
        const fields = results.meta.fields ?? []
        if (!fields.includes('last_name') || !fields.includes('first_name')) {
          setParseError('CSV must have "last_name" and "first_name" columns.')
          setState('idle')
          return
        }
        if (!fields.includes('school_email')) {
          setParseError('CSV must have a "school_email" column.')
          setState('idle')
          return
        }
        if (!fields.includes('personal_email')) {
          setParseError('CSV must have a "personal_email" column.')
          setState('idle')
          return
        }
        setTotalRows(results.data.length)
        setPreview(results.data.slice(0, 10) as unknown as PreviewRow[])
        setState('preview')
      },
      error(err) {
        setParseError(err.message)
        setState('idle')
      },
    })
  }

  async function handleUpload() {
    if (!file) return
    setState('uploading')

    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch(`/api/participants/${eventId}`, { method: 'POST', body: formData })
    const json = await res.json()

    if (!res.ok) {
      setParseError(json.error ?? 'Upload failed')
      setState('error')
      return
    }

    setResult(json)
    setState('done')
    router.refresh()
  }

  const previewCols = ['last_name', 'first_name', 'school_email', 'personal_email', 'blocks']

  return (
    <div>
      {state === 'idle' && (
        <div>
          <div
            className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const f = e.dataTransfer.files[0]
              if (f) handleFile(f)
            }}
          >
            <p className="text-gray-500 text-sm">Drag & drop a CSV file here, or click to browse</p>
            <p className="text-xs text-gray-400 mt-2">
              Required: <code>last_name</code>, <code>first_name</code>, <code>school_email</code>, <code>personal_email</code>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Optional: <code>middle_name</code>, <code>suffix</code>, <code>contact_no</code>, <code>school</code>, <code>student_number</code>, <code>blocks</code>, <code>team_name</code>
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
          </div>
        </div>
      )}

      {state === 'parsing' && (
        <div className="flex items-center gap-2 text-gray-500 py-8">
          <Spinner /> <span className="text-sm">Parsing CSV…</span>
        </div>
      )}

      {parseError && (
        <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg mt-3">{parseError}</p>
      )}

      {state === 'preview' && (
        <div>
          <p className="text-sm text-gray-600 mb-3">
            Found <strong>{totalRows}</strong> rows. Preview (first 10):
          </p>
          <div className="bg-white rounded-xl border border-gray-200 overflow-auto max-h-64 mb-4">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {previewCols.map((col) => (
                    <th key={col} className="text-left px-4 py-2 font-medium text-gray-600">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.map((row, i) => (
                  <tr key={i}>
                    {previewCols.map((col) => (
                      <td key={col} className="px-4 py-2">{row[col] ?? '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleUpload}>Import {totalRows} participants</Button>
            <Button variant="secondary" onClick={() => { setState('idle'); setFile(null) }}>Cancel</Button>
          </div>
        </div>
      )}

      {state === 'uploading' && (
        <div className="flex items-center gap-2 text-gray-500 py-8">
          <Spinner /> <span className="text-sm">Importing participants…</span>
        </div>
      )}

      {state === 'done' && result && (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm">
            <p className="font-medium text-green-800">Import complete</p>
            <p className="text-green-700 mt-0.5">
              {result.inserted} added · {result.updated} updated
              {result.errors.length > 0 && ` · ${result.errors.length} errors`}
            </p>
          </div>
          {result.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs space-y-1">
              <p className="font-medium text-red-700">Row errors:</p>
              {result.errors.map((e, i) => (
                <p key={i} className="text-red-600">Row {e.row}: {e.message}</p>
              ))}
            </div>
          )}
          <Button variant="secondary" onClick={() => { setState('idle'); setFile(null); setResult(null) }}>
            Import another file
          </Button>
        </div>
      )}
    </div>
  )
}
