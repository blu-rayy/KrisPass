import { Badge } from '@/components/ui/Badge'
import { CheckInResponse } from '@/types'

interface CheckInFeedItemProps {
  result: CheckInResponse
  timestamp: string
}

const resultConfig = {
  success: { label: 'Checked in', variant: 'green' as const },
  duplicate: { label: 'Already in', variant: 'yellow' as const },
  not_found: { label: 'Not found', variant: 'red' as const },
}

export function CheckInFeedItem({ result, timestamp }: CheckInFeedItemProps) {
  const config = resultConfig[result.result]
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-900">
          {result.participant?.full_name ?? 'Unknown'}
        </p>
        {result.participant?.team && (
          <p className="text-xs text-gray-400">{result.participant.team}</p>
        )}
      </div>
      <div className="text-right shrink-0 ml-3">
        <Badge variant={config.variant}>{config.label}</Badge>
        <p className="text-xs text-gray-400 mt-0.5">{timestamp}</p>
      </div>
    </div>
  )
}
