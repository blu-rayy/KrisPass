'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/types'

export async function updateProfile(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: (formData.get('full_name') as string).trim(),
      committee: (formData.get('committee') as string).trim() || null,
      contact_no: (formData.get('contact_no') as string).trim() || null,
      personal_email: (formData.get('personal_email') as string).trim() || null,
      year_level: (formData.get('year_level') as string).trim() || null,
    })
    .eq('id', user.id)

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: undefined }
}
