import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import Papa from 'papaparse'
import { CsvRowError } from '@/types'

interface CsvRow {
  full_name?: string
  email?: string
  team?: string
  student_id?: string
  [key: string]: string | undefined
}

export async function GET(request: Request, { params }: { params: { eventId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { searchParams } = new URL(request.url)

  const { data: participants, error } = await service
    .from('participants')
    .select('*')
    .eq('event_id', params.eventId)
    .order('full_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (searchParams.get('export') === 'csv') {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const rows = (participants ?? []).map((p) => ({
      full_name: p.full_name,
      email: p.email,
      team: p.team ?? '',
      student_id: p.student_id ?? '',
      pass_url: `${appUrl}/pass/${p.qr_token}`,
      checked_in: p.checked_in ? 'yes' : 'no',
    }))
    const csv = Papa.unparse(rows)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="participants-${params.eventId}.csv"`,
      },
    })
  }

  return NextResponse.json(participants ?? [])
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
    const rowNum = i + 2 // +1 for header, +1 for 1-based

    const fullName = row.full_name?.trim()
    const email = row.email?.trim()?.toLowerCase()

    if (!fullName) { rowErrors.push({ row: rowNum, message: 'full_name is required' }); continue }
    if (!email || !email.includes('@')) { rowErrors.push({ row: rowNum, message: 'valid email is required' }); continue }

    const { data: existing } = await service
      .from('participants')
      .select('id, qr_token')
      .eq('event_id', params.eventId)
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      await service
        .from('participants')
        .update({
          full_name: fullName,
          team: row.team?.trim() || null,
          student_id: row.student_id?.trim() || null,
        })
        .eq('id', existing.id)
      updated++
    } else {
      const { error: insertError } = await service
        .from('participants')
        .insert({
          event_id: params.eventId,
          full_name: fullName,
          email,
          team: row.team?.trim() || null,
          student_id: row.student_id?.trim() || null,
          qr_token: crypto.randomUUID(),
        })
      if (insertError) {
        rowErrors.push({ row: rowNum, message: insertError.message })
      } else {
        inserted++
      }
    }
  }

  return NextResponse.json({ inserted, updated, errors: rowErrors })
}
