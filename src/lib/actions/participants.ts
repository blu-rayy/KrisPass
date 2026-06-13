'use server'

import Papa from 'papaparse'
import { nanoid } from 'nanoid'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ActionResult, ImportResult, ParticipantType } from '@/types'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return null
  return user
}

type CsvRow = Record<string, string>

function validateRow(row: CsvRow, rowNum: number): string | null {
  if (!row.last_name?.trim())     return `Row ${rowNum}: missing last_name`
  if (!row.first_name?.trim())    return `Row ${rowNum}: missing first_name`
  if (!row.school_email?.trim())  return `Row ${rowNum}: missing school_email`
  if (!row.personal_email?.trim()) return `Row ${rowNum}: missing personal_email`
  if (!row.student_number?.trim()) return `Row ${rowNum}: missing student_number`
  return null
}

function mapRow(row: CsvRow) {
  const rawType = row.participant_type?.trim().toLowerCase()
  const rawBlocks = row.blocks?.trim() ?? ''
  const blocks = rawBlocks
    ? rawBlocks.split(/[|,]/).map((b) => b.trim()).filter(Boolean)
    : []

  return {
    participant_type: (rawType === 'officer' ? 'officer' : 'attendee') as ParticipantType,
    last_name: row.last_name.trim(),
    first_name: row.first_name.trim(),
    middle_name: row.middle_name?.trim() || null,
    suffix: row.suffix?.trim() || null,
    school_email: row.school_email.trim().toLowerCase(),
    personal_email: row.personal_email.trim().toLowerCase(),
    contact_no: row.contact_no?.trim() || null,
    school: row.school?.trim() || null,
    student_number: row.student_number.trim(),
    degree_program: row.degree_program?.trim() || null,
    blocks,
  }
}

export async function importParticipants(
  eventId: string,
  _prev: ActionResult<ImportResult> | null,
  formData: FormData
): Promise<ActionResult<ImportResult>> {
  const actor = await requireAdmin()
  if (!actor) return { ok: false, error: 'Unauthorized.' }

  const file = formData.get('csv') as File | null
  if (!file || file.size === 0) return { ok: false, error: 'Please select a CSV file.' }
  if (!file.name.endsWith('.csv')) return { ok: false, error: 'File must be a .csv.' }

  const text = await file.text()
  const { data: rows, errors: parseErrors } = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: true,
  })

  if (rows.length === 0) {
    const msg = parseErrors[0]?.message ?? 'CSV is empty or could not be parsed.'
    return { ok: false, error: msg }
  }

  // Validate all rows first; collect errors but continue processing valid rows
  const result: ImportResult = { inserted: 0, updated: 0, added_to_roster: 0, errors: [] }
  const validRows: { mapped: ReturnType<typeof mapRow>; rowNum: number }[] = []

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2 // account for header row (1-indexed)
    const err = validateRow(rows[i], rowNum)
    if (err) {
      result.errors.push({ row: rowNum, message: err })
      continue
    }
    validRows.push({ mapped: mapRow(rows[i]), rowNum })
  }

  if (validRows.length === 0) {
    return { ok: true, data: result }
  }

  const admin = createAdminClient()

  // Pre-fetch: which emails already exist as participants
  const emails = validRows.map((r) => r.mapped.school_email)
  const { data: existingParticipants } = await admin
    .from('participants')
    .select('id, school_email')
    .in('school_email', emails)

  const existingByEmail = new Map(
    existingParticipants?.map((p) => [p.school_email as string, p.id as string]) ?? []
  )

  // Pre-fetch: which participants are already on this event's roster
  const { data: rosterEntries } = await admin
    .from('event_roster')
    .select('participant_id')
    .eq('event_id', eventId)

  const alreadyRostered = new Set(
    rosterEntries?.map((r) => r.participant_id as string) ?? []
  )

  // Process each valid row
  for (const { mapped, rowNum } of validRows) {
    const wasExisting = existingByEmail.has(mapped.school_email)

    const { data: upserted, error: upsertErr } = await admin
      .from('participants')
      .upsert(mapped, { onConflict: 'school_email' })
      .select('id')
      .single()

    if (upsertErr) {
      result.errors.push({ row: rowNum, message: upsertErr.message })
      continue
    }

    if (wasExisting) result.updated++
    else result.inserted++

    // Add to roster if not already there
    if (!alreadyRostered.has(upserted.id)) {
      const { error: rosterErr } = await admin
        .from('event_roster')
        .insert({ event_id: eventId, participant_id: upserted.id, qr_token: nanoid() })

      if (rosterErr && rosterErr.code !== '23505') {
        result.errors.push({ row: rowNum, message: `Roster: ${rosterErr.message}` })
      } else {
        result.added_to_roster++
        alreadyRostered.add(upserted.id) // prevent duplicate in same import
      }
    }
  }

  return { ok: true, data: result }
}

// ── Single-participant CRUD ────────────────────────────────────────────────

function parseParticipantForm(formData: FormData) {
  const rawType = (formData.get('participant_type') as string).trim().toLowerCase()
  const rawBlocks = (formData.get('blocks') as string).trim()
  return {
    participant_type: (rawType === 'officer' ? 'officer' : 'attendee') as ParticipantType,
    last_name: (formData.get('last_name') as string).trim(),
    first_name: (formData.get('first_name') as string).trim(),
    middle_name: (formData.get('middle_name') as string).trim() || null,
    suffix: (formData.get('suffix') as string).trim() || null,
    school_email: (formData.get('school_email') as string).trim().toLowerCase(),
    personal_email: (formData.get('personal_email') as string).trim().toLowerCase(),
    contact_no: (formData.get('contact_no') as string).trim() || null,
    school: (formData.get('school') as string).trim() || null,
    student_number: (formData.get('student_number') as string).trim(),
    degree_program: (formData.get('degree_program') as string).trim() || null,
    blocks: rawBlocks
      ? rawBlocks.split(',').map((b) => b.trim()).filter(Boolean)
      : [],
  }
}

export async function createParticipant(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const actor = await requireAdmin()
  if (!actor) return { ok: false, error: 'Unauthorized.' }

  const data = parseParticipantForm(formData)
  if (!data.last_name) return { ok: false, error: 'Last name is required.' }
  if (!data.first_name) return { ok: false, error: 'First name is required.' }
  if (!data.school_email) return { ok: false, error: 'School email is required.' }
  if (!data.personal_email) return { ok: false, error: 'Personal email is required.' }
  if (!data.student_number) return { ok: false, error: 'Student number is required.' }

  const admin = createAdminClient()
  const { data: inserted, error } = await admin
    .from('participants')
    .insert(data)
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }
  redirect(`/participants/${inserted.id}/edit`)
}

export async function updateParticipant(
  id: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const actor = await requireAdmin()
  if (!actor) return { ok: false, error: 'Unauthorized.' }

  const data = parseParticipantForm(formData)
  if (!data.last_name) return { ok: false, error: 'Last name is required.' }
  if (!data.first_name) return { ok: false, error: 'First name is required.' }
  if (!data.school_email) return { ok: false, error: 'School email is required.' }
  if (!data.personal_email) return { ok: false, error: 'Personal email is required.' }
  if (!data.student_number) return { ok: false, error: 'Student number is required.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('participants')
    .update(data)
    .eq('id', id)

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: undefined }
}

export async function deleteParticipant(
  id: string,
  _prev: ActionResult | null,
  _formData: FormData
): Promise<ActionResult> {
  const actor = await requireAdmin()
  if (!actor) return { ok: false, error: 'Unauthorized.' }

  const admin = createAdminClient()
  const { error } = await admin.from('participants').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  redirect('/participants')
}
