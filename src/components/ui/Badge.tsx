import { cn } from '@/lib/utils'

interface BadgeProps {
  variant?: 'green' | 'yellow' | 'red' | 'blue' | 'gray'
  children: React.ReactNode
  className?: string
}

const variants = {
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-violet-100 text-violet-800',
  gray: 'bg-gray-100 text-gray-700',
}

export function Badge({ variant = 'gray', children, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  )
}
