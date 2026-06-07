import { createClient } from '@/lib/supabase/server'
import { Profile } from '@/types'

export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return data as Profile | null
}

export async function requireAuth() {
  const profile = await getProfile()
  if (!profile) return null
  return profile
}
