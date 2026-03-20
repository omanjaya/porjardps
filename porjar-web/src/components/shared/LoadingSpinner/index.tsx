import { cn } from '@/lib/utils'

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-5 w-5 border-2',
  lg: 'h-8 w-8 border-[3px]',
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  return (
    <span
      className={cn(
        'inline-block animate-spin rounded-full border-solid border-current border-t-transparent text-blue-500',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  )
}
