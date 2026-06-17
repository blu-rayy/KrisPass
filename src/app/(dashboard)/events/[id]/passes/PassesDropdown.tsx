'use client'

import { useState, useRef, useEffect } from 'react'
import { FileArchive, FileText, ChevronDown } from 'lucide-react'

interface Props {
  eventId: string
  activeTab: 'attendee' | 'officer' | 'staff'
  tabCount: number
}

export function PassesDropdown({ eventId, activeTab, tabCount }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const base = `/events/${eventId}/passes/zip`
  const tabParam = `type=${activeTab}`

  const items = [
    {
      label: `ZIP current tab (${tabCount})`,
      icon: FileArchive,
      png: `${base}?${tabParam}`,
      pdf: `${base}?${tabParam}&format=pdf`,
    },
    {
      label: 'ZIP All',
      icon: FileArchive,
      png: base,
      pdf: `${base}?format=pdf`,
    },
    {
      label: 'ZIP by Team',
      icon: FileArchive,
      png: `${base}?group=team`,
      pdf: `${base}?group=team&format=pdf`,
    },
  ]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:border-violet-300 hover:text-violet-700 transition-all"
      >
        <FileArchive size={14} />
        Download
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-56 rounded-xl border border-gray-200 bg-white shadow-lg z-50 overflow-hidden">
          {items.map(({ label, icon: Icon, png, pdf }) => (
            <div key={label} className="border-b border-gray-100 last:border-0">
              <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                <Icon size={11} /> {label}
              </p>
              <div className="flex px-3 pb-2 gap-2">
                <a
                  href={png}
                  onClick={() => setOpen(false)}
                  className="flex-1 text-center rounded-md border border-gray-200 py-1 text-xs font-medium text-gray-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-all"
                >
                  PNG
                </a>
                <a
                  href={pdf}
                  onClick={() => setOpen(false)}
                  className="flex-1 text-center rounded-md border border-gray-200 py-1 text-xs font-medium text-gray-600 hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition-all"
                >
                  PDF
                </a>
              </div>
            </div>
          ))}

          <div className="border-t border-gray-100">
            <a
              href={`/events/${eventId}/passes/print`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <FileText size={13} className="text-gray-400" />
              Print PDF
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
