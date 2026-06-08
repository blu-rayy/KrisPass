'use client'

import QRCode from 'react-qr-code'

interface PassCardProps {
  qrToken: string
  participant: {
    first_name: string
    last_name: string
    middle_name: string | null
    suffix: string | null
    school_email: string
    school: string | null
    student_number: string | null
  } | null
  event: {
    name: string
    event_date: string
    location: string | null
  } | null
}

export function PassCard({ qrToken, participant, event }: PassCardProps) {
  const fullName = participant
    ? [
        participant.first_name,
        participant.middle_name ?? '',
        participant.last_name,
        participant.suffix ?? '',
      ].filter(Boolean).join(' ')
    : 'Unknown'

  const eventDate = event?.event_date
    ? new Date(event.event_date).toLocaleDateString('en-PH', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      })
    : '—'

  const eventTime = event?.event_date
    ? new Date(event.event_date).toLocaleTimeString('en-PH', {
        hour: '2-digit', minute: '2-digit',
      })
    : ''

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-[360px] rounded-3xl overflow-hidden shadow-2xl shadow-violet-950/50 font-sans select-none">

        {/* Header strip */}
        <div className="bg-gradient-to-br from-violet-700 to-violet-900 px-6 pt-6 pb-8 relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5" />

          <div className="relative">
            <p className="text-violet-300 text-[10px] font-semibold uppercase tracking-[0.2em] mb-1">
              FEU Tech ACM
            </p>
            <h1 className="text-white text-2xl font-bold leading-tight">
              {event?.name ?? 'Event Pass'}
            </h1>
            <div className="flex items-center gap-3 mt-3">
              <div>
                <p className="text-violet-300 text-[9px] uppercase tracking-widest">Date</p>
                <p className="text-white text-xs font-medium">{eventDate}</p>
              </div>
              {eventTime && (
                <div className="border-l border-violet-500/50 pl-3">
                  <p className="text-violet-300 text-[9px] uppercase tracking-widest">Time</p>
                  <p className="text-white text-xs font-medium">{eventTime}</p>
                </div>
              )}
              {event?.location && (
                <div className="border-l border-violet-500/50 pl-3">
                  <p className="text-violet-300 text-[9px] uppercase tracking-widest">Venue</p>
                  <p className="text-white text-xs font-medium">{event.location}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tear line */}
        <div className="bg-gray-100 flex items-center relative">
          <div className="absolute -left-3 w-6 h-6 rounded-full bg-gray-950" />
          <div className="flex-1 border-t-2 border-dashed border-gray-300 mx-3" />
          <div className="absolute -right-3 w-6 h-6 rounded-full bg-gray-950" />
        </div>

        {/* Body */}
        <div className="bg-gray-100 px-6 py-6 flex flex-col items-center gap-5">

          {/* QR code */}
          <div className="bg-white p-4 rounded-2xl shadow-sm">
            <QRCode value={qrToken} size={180} />
          </div>

          <p className="text-gray-400 text-[9px] font-mono text-center tracking-wider">
            {qrToken}
          </p>

          {/* Divider */}
          <div className="w-full border-t border-gray-200" />

          {/* Participant info */}
          <div className="w-full space-y-3">
            <div>
              <p className="text-gray-400 text-[9px] uppercase tracking-widest">Attendee</p>
              <p className="text-gray-900 text-lg font-bold mt-0.5">{fullName}</p>
            </div>

            {participant?.student_number && (
              <div>
                <p className="text-gray-400 text-[9px] uppercase tracking-widest">Student No.</p>
                <p className="text-gray-700 text-sm font-medium mt-0.5">{participant.student_number}</p>
              </div>
            )}

            {participant?.school && (
              <div>
                <p className="text-gray-400 text-[9px] uppercase tracking-widest">School</p>
                <p className="text-gray-700 text-sm font-medium mt-0.5">{participant.school}</p>
              </div>
            )}
          </div>

          <p className="text-gray-300 text-[10px] text-center mt-1">
            Present this pass at check-in · Do not share
          </p>
        </div>
      </div>
    </div>
  )
}
