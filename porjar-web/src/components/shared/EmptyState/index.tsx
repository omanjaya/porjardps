import type { ComponentType, ReactNode } from 'react'
import type { Icon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

type EmptyStateSize = 'sm' | 'default'

interface EmptyStateProps {
  icon: Icon | ComponentType<{ size?: number; className?: string }> | ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  size?: EmptyStateSize
}

function isComponentType(
  value: unknown,
): value is ComponentType<{ size?: number; className?: string }> {
  return typeof value === 'function' || (typeof value === 'object' && value !== null && '$$typeof' in (value as object))
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  size = 'default',
}: EmptyStateProps) {
  const isSm = size === 'sm'
  const containerPad = isSm ? 'py-8' : 'py-16'
  const iconBoxSize = isSm ? 'h-14 w-14' : 'h-20 w-20'
  const iconPx = isSm ? 28 : 48
  const titleSize = isSm ? 'text-base' : 'text-lg'
  const mb = isSm ? 'mb-3' : 'mb-4'

  let iconNode: ReactNode
  if (isComponentType(icon)) {
    const IconComponent = icon as ComponentType<{ size?: number; className?: string }>
    iconNode = <IconComponent size={iconPx} className="text-stone-400 dark:text-zinc-500" />
  } else {
    iconNode = icon as ReactNode
  }

  return (
    <div className={`flex flex-col items-center justify-center ${containerPad} text-center border border-dashed border-stone-300 dark:border-zinc-600 rounded-2xl p-8`}>
      <div className={`${mb} flex ${iconBoxSize} items-center justify-center rounded-full bg-gradient-to-br from-stone-100 to-stone-50 dark:from-zinc-800/50 dark:to-zinc-900/50`}>
        {iconNode}
      </div>
      <h3 className={`${titleSize} font-semibold text-stone-900 dark:text-zinc-100`}>{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-stone-500 dark:text-zinc-400">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-4 bg-esi-red hover:bg-esi-red-dark text-white shadow-md hover:shadow-lg transition-shadow" size="default">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
