import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from 'lucide-react'
import { NewUserForm } from './NewUserForm'

export default async function NewUserPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/events')

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <Link
        href="/users"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to users
      </Link>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">New user</h1>
      <NewUserForm />
    </div>
  )
}
