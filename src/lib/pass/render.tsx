import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import QRCode from 'qrcode'
import { readFileSync } from 'fs'
import path from 'path'

export type PassData = {
  firstName: string
  lastName: string
  middleName?: string | null
  suffix?: string | null
  studentNumber: string
  blocks: string[]
  teamName?: string | null
  participantType: 'attendee' | 'officer'
  qrToken: string
  eventName: string
  eventDateRange: string
}

let _fonts: { regular: Buffer; bold: Buffer } | null = null
function getFonts() {
  if (!_fonts) {
    _fonts = {
      regular: readFileSync(path.join(process.cwd(), 'public/fonts/Inter-Regular.ttf')),
      bold: readFileSync(path.join(process.cwd(), 'public/fonts/Inter-Bold.ttf')),
    }
  }
  return _fonts
}

export async function renderPass(data: PassData): Promise<Buffer> {
  const qrDataUrl = await QRCode.toDataURL(data.qrToken, {
    width: 500,
    margin: 2,
    color: { dark: '#1e1b4b', light: '#ffffff' },
  })

  const fonts = getFonts()
  const typeColor = data.participantType === 'officer' ? '#a78bfa' : '#93c5fd'
  const typeLabel = data.participantType === 'officer' ? 'OFFICER' : 'ATTENDEE'

  const nameMiddle = [
    data.firstName,
    data.middleName ? `${data.middleName.charAt(0)}.` : null,
    data.suffix ?? null,
  ].filter(Boolean).join(' ')

  const svg = await satori(
    <div
      style={{
        width: 1080,
        height: 1920,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'linear-gradient(160deg, #0d1528 0%, #0f172a 45%, #100d1f 100%)',
        color: '#f8fafc',
        fontFamily: 'Inter',
        padding: '72px 60px 56px',
      }}
    >
      {/* Top accent line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 6,
          background: 'linear-gradient(90deg, #7c3aed, #a78bfa, #7c3aed)',
          display: 'flex',
        }}
      />

      {/* Wordmark + type badge */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            letterSpacing: 14,
            color: '#a78bfa',
            display: 'flex',
          }}
        >
          KRISPASS
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 5,
            color: typeColor,
            backgroundColor: `${typeColor}1a`,
            padding: '8px 24px',
            borderRadius: 999,
            border: `1.5px solid ${typeColor}55`,
            display: 'flex',
          }}
        >
          {typeLabel}
        </div>
      </div>

      {/* Flex spacer */}
      <div style={{ flex: 1, display: 'flex' }} />

      {/* QR code */}
      <div
        style={{
          display: 'flex',
          padding: 24,
          backgroundColor: '#ffffff',
          borderRadius: 24,
          boxShadow: '0 0 0 1px rgba(167,139,250,0.15), 0 24px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} width={480} height={480} alt="" />
      </div>

      <div style={{ height: 60, display: 'flex' }} />

      {/* Name */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            fontSize: 68,
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: 1.05,
            letterSpacing: 3,
            color: '#f1f5f9',
            display: 'flex',
          }}
        >
          {data.lastName.toUpperCase()}
        </div>
        <div
          style={{
            fontSize: 42,
            fontWeight: 400,
            color: '#94a3b8',
            textAlign: 'center',
            display: 'flex',
          }}
        >
          {nameMiddle}
        </div>
      </div>

      <div style={{ height: 32, display: 'flex' }} />

      {/* Student number */}
      <div
        style={{
          fontSize: 26,
          color: '#475569',
          letterSpacing: 4,
          fontWeight: 400,
          display: 'flex',
        }}
      >
        {data.studentNumber}
      </div>

      <div style={{ height: 32, display: 'flex' }} />

      {/* Team + blocks */}
      {(data.teamName || data.blocks.length > 0) && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 10,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {data.teamName && (
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: '#f8fafc',
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                padding: '12px 26px',
                borderRadius: 999,
                display: 'flex',
              }}
            >
              {data.teamName}
            </div>
          )}
          {data.blocks.map((b) => (
            <div
              key={b}
              style={{
                fontSize: 22,
                fontWeight: 400,
                color: '#94a3b8',
                backgroundColor: '#1e293b',
                padding: '10px 18px',
                borderRadius: 999,
                border: '1px solid #334155',
                display: 'flex',
              }}
            >
              {b}
            </div>
          ))}
        </div>
      )}

      {/* Bottom spacer */}
      <div style={{ flex: 1, display: 'flex' }} />

      {/* Event footer */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          borderTop: '1px solid #1e293b',
          paddingTop: 40,
          width: '100%',
        }}
      >
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: '#e2e8f0',
            textAlign: 'center',
            display: 'flex',
          }}
        >
          {data.eventName}
        </div>
        <div
          style={{
            fontSize: 22,
            color: '#475569',
            textAlign: 'center',
            display: 'flex',
          }}
        >
          {data.eventDateRange}
        </div>
      </div>
    </div>,
    {
      width: 1080,
      height: 1920,
      fonts: [
        { name: 'Inter', data: fonts.regular, weight: 400, style: 'normal' },
        { name: 'Inter', data: fonts.bold, weight: 700, style: 'normal' },
      ],
    }
  )

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1080 } })
  return Buffer.from(resvg.render().asPng())
}

export function passFilename(lastName: string, firstName: string): string {
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '')
  return `${slug(lastName)}_${slug(firstName)}.png`
}

export function eventDateRange(sessions: { starts_at: string }[]): string {
  if (sessions.length === 0) return ''
  const sorted = [...sessions].sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  const fmt = (d: Date) => d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  const first = new Date(sorted[0].starts_at)
  const last = new Date(sorted[sorted.length - 1].starts_at)
  return sessions.length === 1 ? fmt(first) : `${fmt(first)} – ${fmt(last)}`
}
