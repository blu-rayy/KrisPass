export default async function ImportPage({ params }: { params: Promise<{ id: string }> }) {
  await params
  return <p className="text-gray-400">Import — coming in Phase 5</p>
}
