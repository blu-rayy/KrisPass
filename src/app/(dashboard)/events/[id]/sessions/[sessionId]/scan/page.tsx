export default async function ScanPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>
}) {
  await params
  return <p className="text-gray-400">Scanner — coming in Phase 8</p>
}
