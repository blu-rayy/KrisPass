import { notFound } from 'next/navigation'
import { PassCard } from '@/components/pass/PassCard'

export default async function PassPage({ params }: { params: { token: string } }) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/pass/${params.token}`, { cache: 'no-store' })

  if (!res.ok) notFound()

  const data = await res.json()

  return (
    <PassCard
      fullName={data.full_name}
      qrToken={data.qr_token}
      event={data.event}
    />
  )
}
