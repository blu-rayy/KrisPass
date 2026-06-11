export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <p className="text-gray-400">Event {id} — coming in Phase 4</p>
}
