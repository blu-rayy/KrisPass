import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center bg-gray-50">
      <p className="text-7xl font-bold text-gray-200 select-none">404</p>
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Page not found</h1>
        <p className="mt-1 text-sm text-gray-500">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <Link
        href="/events"
        className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
      >
        Go to events
      </Link>
    </div>
  )
}
