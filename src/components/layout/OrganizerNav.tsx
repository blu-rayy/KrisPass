'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function OrganizerNav() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="text-lg font-bold text-gray-900">KrisPass</span>
        <Link href="/organizer" className="text-sm text-gray-600 hover:text-gray-900">
          Events
        </Link>
      </div>
      <button
        onClick={handleSignOut}
        className="text-sm text-gray-500 hover:text-gray-900"
      >
        Sign out
      </button>
    </header>
  )
}
