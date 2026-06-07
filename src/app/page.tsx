import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth'

export default async function RootPage() {
  const profile = await getProfile()

  if (!profile) {
    redirect('/login')
  }

  if (profile.role === 'admin') {
    redirect('/admin/events')
  }

  redirect('/organizer')
}
