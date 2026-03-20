import type { Icon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon: Icon
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  icon: IconComponent,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
        <IconComponent size={32} className="text-stone-400" />
      </div>
      <h3 className="text-lg font-semibold text-stone-900">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-stone-500">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-4 bg-porjar-red hover:bg-porjar-red-dark text-white" size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
