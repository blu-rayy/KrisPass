import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from 'lucide-react'
import { EditParticipantForm } from './EditParticipantForm'
import type { Participant } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditParticipantPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (currentProfile?.role !== 'admin') redirect('/participants')

  const { data: participant } = await supabase
    .from('participants')
    .select('*')
    .eq('id', id)
    .single<Participant>()

  if (!participant) notFound()

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <Link
        href="/participants"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to participants
      </Link>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">
        Edit participant
      </h1>
      <EditParticipantForm participant={participant} />
    </div>
  )
}
