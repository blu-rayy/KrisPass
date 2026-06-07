import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import Papa from 'papaparse'
import { CsvRowError } from '@/types'

interface CsvRow {
  last_name?: string
  first_name?: string
  middle_name?: string
  suffix?: string
  school_email?: string
  personal_email?: string
  contact_no?: string
  school?: string
  student_number?: string
  degree_program?: string
  block?: string
  [key: string]: string | undefined
}

export async function GET(request: Request, { params }: { params: { eventId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { searchParams } = new URL(request.url)

  // Join event_roster → participants → attendances → event_teams → teams
  const { data: roster, error } = await service
    .from('event_roster')
    .select(`
      qr_token,
      participant_id,
      participants (
        id, last_name, first_name, middle_name, suffix,
        school_email, personal_email, contact_no, school, student_number
      )
    `)
    .eq('event_id', params.eventId)
    .order('participant_id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: attendances } = await service
    .from('attendances')
    .select('participant_id, scanned_at')
    .eq('event_id', params.eventId)

  const attendanceMap = new Map(
    (attendances ?? []).map((a) => [a.participant_id, a.scanned_at])
  )

  const { data: eventTeams } = await service
    .from('event_teams')
    .select('participant_id, teams(name)')
    .eq('event_id', params.eventId)

  const teamMap = new Map(
    (eventTeams ?? []).map((et) => [et.participant_id, (et.teams as unknown as { name: string } | null)?.name ?? null])
  )

  interface RosterRow {
    id: string; last_name: string; first_name: string; middle_name: string | null
    suffix: string | null; school_email: string; personal_email: string
    contact_no: string | null; school: string | null; student_number: string | null
    degree_program: string | null
    qr_token: string; attended: boolean; scanned_at: string | null; team_name: string | null
  }

  const rows: RosterRow[] = (roster ?? []).map((r) => {
    const p = r.participants as unknown as {
      id: string; last_name: string; first_name: string; middle_name: string | null
      suffix: string | null; school_email: string; personal_email: string
      contact_no: string | null; school: string | null; student_number: string | null
      degree_program: string | null
    }
    return {
      ...p,
      qr_token: r.qr_token,
      attended: attendanceMap.has(p.id),
      scanned_at: attendanceMap.get(p.id) ?? null,
      team_name: teamMap.get(p.id) ?? null,
    }
  })

  rows.sort((a, b) => (a.last_name ?? '').localeCompare(b.last_name ?? ''))

  if (searchParams.get('export') === 'csv') {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const csvRows = rows.map((p) => ({
      last_name: p.last_name,
      first_name: p.first_name,
      middle_name: p.middle_name ?? '',
      suffix: p.suffix ?? '',
      school_email: p.school_email,
      personal_email: p.personal_email,
      contact_no: p.contact_no ?? '',
      school: p.school ?? '',
      student_number: p.student_number ?? '',
      degree_program: p.degree_program ?? '',
      team: p.team_name ?? '',
      pass_url: `${appUrl}/pass/${p.qr_token}`,
      attended: p.attended ? 'yes' : 'no',
    }))
    const csv = Papa.unparse(csvRows)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="roster-${params.eventId}.csv"`,
      },
    })
  }

  return NextResponse.json(rows)
}

export async function POST(request: Request, { params }: { params: { eventId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: profile } = await service.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const text = await file.text()
  const { data: rows, errors: parseErrors } = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
  })

  if (parseErrors.length > 0) {
    return NextResponse.json({ error: 'CSV parse error', details: parseErrors }, { status: 400 })
  }

  const rowErrors: CsvRowError[] = []
  let inserted = 0
  let updated = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2

    const lastName = row.last_name?.trim()
    const firstName = row.first_name?.trim()
    const schoolEmail = row.school_email?.trim()?.toLowerCase()
    const personalEmail = row.personal_email?.trim()?.toLowerCase()

    if (!lastName) { rowErrors.push({ row: rowNum, message: 'last_name is required' }); continue }
    if (!firstName) { rowErrors.push({ row: rowNum, message: 'first_name is required' }); continue }
    if (!schoolEmail || !schoolEmail.includes('@')) { rowErrors.push({ row: rowNum, message: 'valid school_email is required' }); continue }
    if (!personalEmail || !personalEmail.includes('@')) { rowErrors.push({ row: rowNum, message: 'valid personal_email is required' }); continue }

    // Upsert participant on school_email
    const participantData = {
      last_name: lastName,
      first_name: firstName,
      middle_name: row.middle_name?.trim() || null,
      suffix: row.suffix?.trim() || null,
      school_email: schoolEmail,
      personal_email: personalEmail,
      contact_no: row.contact_no?.trim() || null,
      school: row.school?.trim() || null,
      student_number: row.student_number?.trim() || null,
      degree_program: row.degree_program?.trim() || null,
      updated_at: new Date().toISOString(),
    }

    const { data: existing } = await service
      .from('participants')
      .select('id')
      .eq('school_email', schoolEmail)
      .maybeSingle()

    let participantId: string

    if (existing) {
      await service.from('participants').update(participantData).eq('id', existing.id)
      participantId = existing.id
      updated++
    } else {
      const { data: newP, error: insertErr } = await service
        .from('participants')
        .insert(participantData)
        .select('id')
        .single()
      if (insertErr || !newP) {
        rowErrors.push({ row: rowNum, message: insertErr?.message ?? 'Insert failed' })
        continue
      }
      participantId = newP.id
      inserted++
    }

    // Add to event_roster if not already there (preserve existing qr_token)
    const { data: existingRoster } = await service
      .from('event_roster')
      .select('qr_token')
      .eq('event_id', params.eventId)
      .eq('participant_id', participantId)
      .maybeSingle()

    if (!existingRoster) {
      await service.from('event_roster').insert({
        event_id: params.eventId,
        participant_id: participantId,
        qr_token: crypto.randomUUID(),
      })
    }

    // Handle block assignment (accept both "block" and "blocks" column names)
    const blockValue = row.blocks ?? row.block
    if (blockValue?.trim()) {
      const blockCode = blockValue.trim().toUpperCase()
      const { data: block } = await service
        .from('blocks')
        .select('id')
        .eq('code', blockCode)
        .maybeSingle()

      let blockId: string
      if (block) {
        blockId = block.id
      } else {
        const { data: newBlock } = await service
          .from('blocks')
          .insert({ code: blockCode })
          .select('id')
          .single()
        if (!newBlock) continue
        blockId = newBlock.id
      }

      await service
        .from('participant_blocks')
        .upsert({ participant_id: participantId, block_id: blockId })
    }
  }

  return NextResponse.json({ inserted, updated, errors: rowErrors })
}
