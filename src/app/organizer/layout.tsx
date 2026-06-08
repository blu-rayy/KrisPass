import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth'
import { OrganizerNav } from '@/components/layout/OrganizerNav'

export default async function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile()

  if (!profile) redirect('/login')

  return (
    <div className="min-h-screen flex flex-col">
      <OrganizerNav />
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  )
}
