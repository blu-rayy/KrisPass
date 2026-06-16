import React from 'react'
import { writeFileSync } from 'fs'
import path from 'path'
import { renderPass } from '../src/lib/pass/render'

async function main() {
const png = await renderPass({
  firstName: 'Maria',
  lastName: 'Santos',
  middleName: 'Cruz',
  suffix: null,
  studentNumber: '2023-12345',
  blocks: [],
  teamName: 'Team Nebula',
  participantType: 'attendee',
  qrToken: 'SAMPLE-QR-TOKEN-2024',
  eventName: 'ACM Techsprint',
  eventDateRange: 'Jun 20 – Jun 21, 2025',
})

const out = path.join(process.cwd(), 'sample_pass.png')
writeFileSync(out, png)
console.log('Written:', out)
}
main()
