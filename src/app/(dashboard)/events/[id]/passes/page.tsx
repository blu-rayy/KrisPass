export default async function PassesPage({ params }: { params: Promise<{ id: string }> }) {
  await params
  return <p className="text-gray-400">Passes — coming in Phase 7</p>
}
