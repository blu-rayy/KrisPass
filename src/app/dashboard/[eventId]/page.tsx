import { redirect } from 'next/navigation'

export default function DashboardPage({ params }: { params: { eventId: string } }) {
  redirect(`/admin/events/${params.eventId}`)
}
