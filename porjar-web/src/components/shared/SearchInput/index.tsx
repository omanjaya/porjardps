'use client'

import { useState, useEffect, useRef } from 'react'
import { MagnifyingGlass, X } from '@phosphor-icons/react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface SearchInputProps {
  placeholder?: string
  onSearch: (query: string) => void
  debounce?: number
  className?: string
}

export function SearchInput({
  placeholder = 'Cari...',
  onSearch,
  debounce = 300,
  className,
}: SearchInputProps) {
  const [value, setValue] = useState('')
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    const timer = setTimeout(() => {
      onSearch(value)
    }, debounce)

    return () => clearTimeout(timer)
  }, [value, debounce, onSearch])

  const handleClear = () => {
    setValue('')
    onSearch('')
  }

  return (
    <div className={cn('relative', className)}>
      <MagnifyingGlass
        size={18}
        weight="bold"
        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
      />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-8 bg-white border-stone-200 text-stone-900 placeholder:text-stone-400 focus-visible:border-porjar-red focus-visible:ring-porjar-red/20"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors"
        >
          <X size={16} weight="bold" />
        </button>
      )}
    </div>
  )
}
