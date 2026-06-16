import React from 'react'
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
  participantType: 'attendee' | 'officer' | 'organizer'
  qrToken: string
  eventName: string
  eventDateRange: string
}

// SVG viewBox: 297.75 × 419.25  →  rendered at 1080 × 1521
const PASS_W = 1080
const PASS_H = 1521

// Positions derived from the qr_pass.svg template (screen coords at 397×559 scaled ×2.72)
// Tweak these if the overlay drifts from the card fields.
// Canvas: 10.5 × 14.8 cm → 1080 × 1521 px (102.86 px/cm)
// Canva coordinates are (vertical_cm, horizontal_cm) from top-left of canvas.
// participant_name: bottom-left (6.1, 1.3) cm, font 12.4pt = 45px
// team_name:        bottom-left (6.9, 5.4) cm, font 7.6pt  = 28px
// qr: bottom-left (12.6, 3.5) cm, top-right (9.2, 7.0) cm
const CM = 102.857 // px per cm
const LAYOUT = {
  // White erasure boxes — sized tightly to cover only the placeholder text paths
  nameCover:  { top: Math.round(6.1 * CM) - 56, left: Math.round(1.3 * CM) - 4, width: 840, height: 62 },
  teamCover:  { top: Math.round(6.9 * CM) - 34, left: Math.round(5.4 * CM) - 4, width: 270, height: 40 },
  // Real text — name nudged 1.5 px up from Canva baseline
  name:       { top: Math.round(6.1 * CM) - 65.5, left: Math.round(1.3 * CM), fontSize: 45 },
  teamName:   { top: Math.round(6.9 * CM) - 34, left: Math.round(5.4 * CM), fontSize: 28 },
  // QR: top = 9.2 cm, left = 3.5 cm, size = avg of (7.0-3.5)*CM and (12.6-9.2)*CM
  qr:         { top: Math.round(9.2 * CM) - 15, left: Math.round(3.5 * CM) - 15, size: Math.round(((7.0 - 3.5) + (12.6 - 9.2)) / 2 * CM) + 30 },
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

let _templateDataUrl: string | null = null
function getTemplateDataUrl(): string {
  if (!_templateDataUrl) {
    const svgBuf = readFileSync(path.join(process.cwd(), 'public/qr_pass.svg'))
    const resvg = new Resvg(svgBuf, { fitTo: { mode: 'width', value: PASS_W } })
    const png = resvg.render().asPng()
    _templateDataUrl = `data:image/png;base64,${Buffer.from(png).toString('base64')}`
  }
  return _templateDataUrl
}

export async function renderPass(data: PassData): Promise<Buffer> {
  const qrDataUrl = await QRCode.toDataURL(data.qrToken, {
    width: LAYOUT.qr.size,
    margin: 1,
    color: { dark: '#1e1b4b', light: '#ffffff' },
  })

  const fonts = getFonts()
  const templateDataUrl = getTemplateDataUrl()

  const fullName = [data.firstName, data.lastName].join(' ')

  const svg = await satori(
    <div
      style={{
        width: PASS_W,
        height: PASS_H,
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Template background */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={templateDataUrl}
        width={PASS_W}
        height={PASS_H}
        alt=""
        style={{ position: 'absolute', top: 0, left: 0 }}
      />

      {/* Erase placeholder name path */}
      <div
        style={{
          position: 'absolute',
          top: LAYOUT.nameCover.top,
          left: LAYOUT.nameCover.left,
          width: LAYOUT.nameCover.width,
          height: LAYOUT.nameCover.height,
          backgroundColor: '#ffffff',
          display: 'flex',
        }}
      />

      {/* Erase placeholder team_name path */}
      <div
        style={{
          position: 'absolute',
          top: LAYOUT.teamCover.top,
          left: LAYOUT.teamCover.left,
          width: LAYOUT.teamCover.width,
          height: LAYOUT.teamCover.height,
          backgroundColor: '#ffffff',
          display: 'flex',
        }}
      />

      {/* Participant full name */}
      <div
        style={{
          position: 'absolute',
          top: LAYOUT.name.top,
          left: LAYOUT.name.left,
          width: LAYOUT.nameCover.width,
          display: 'flex',
          fontFamily: 'Inter',
          fontSize: LAYOUT.name.fontSize,
          fontWeight: 700,
          color: '#1a0533',
          lineHeight: 1.2,
        }}
      >
        {fullName}
      </div>

      {/* Team name */}
      {data.teamName && (
        <div
          style={{
            position: 'absolute',
            top: LAYOUT.teamName.top,
            left: LAYOUT.teamName.left,
            display: 'flex',
            fontFamily: 'Inter',
            fontSize: LAYOUT.teamName.fontSize,
            fontWeight: 700,
            color: '#1a0533',
          }}
        >
          {data.teamName}
        </div>
      )}

      {/* QR code */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qrDataUrl}
        width={LAYOUT.qr.size}
        height={LAYOUT.qr.size}
        alt=""
        style={{
          position: 'absolute',
          top: LAYOUT.qr.top,
          left: LAYOUT.qr.left,
        }}
      />
    </div>,
    {
      width: PASS_W,
      height: PASS_H,
      fonts: [
        { name: 'Inter', data: fonts.regular, weight: 400, style: 'normal' },
        { name: 'Inter', data: fonts.bold, weight: 700, style: 'normal' },
      ],
    }
  )

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: PASS_W } })
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
