export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <p className="text-gray-400">Edit event {id} — coming in Phase 4</p>
}
