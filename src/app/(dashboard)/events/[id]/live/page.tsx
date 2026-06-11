export default async function LiveDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  await params
  return <p className="text-gray-400">Live dashboard — coming in Phase 9</p>
}
