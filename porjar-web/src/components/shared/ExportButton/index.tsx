'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Export, FileCsv, Image as ImageIcon, SpinnerGap } from '@phosphor-icons/react'

interface ExportOption {
  label: string
  type: 'csv' | 'png'
  onExport: () => void | Promise<void>
}

interface ExportButtonProps {
  options: ExportOption[]
}

export function ExportButton({ options }: ExportButtonProps) {
  const [loadingType, setLoadingType] = useState<string | null>(null)

  async function handleExport(option: ExportOption) {
    setLoadingType(option.type)
    try {
      await option.onExport()
    } finally {
      setLoadingType(null)
    }
  }

  const iconMap = {
    csv: FileCsv,
    png: ImageIcon,
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            size="sm"
            variant="outline"
            className="border-stone-200 text-stone-700 hover:text-stone-900"
          >
            <Export size={14} className="mr-1" />
            Export
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {options.map((option) => {
          const Icon = iconMap[option.type]
          const isLoading = loadingType === option.type
          return (
            <DropdownMenuItem
              key={option.type}
              onClick={() => handleExport(option)}
              disabled={isLoading}
            >
              {isLoading ? (
                <SpinnerGap size={14} className="animate-spin" />
              ) : (
                <Icon size={14} />
              )}
              <span>{option.label}</span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
