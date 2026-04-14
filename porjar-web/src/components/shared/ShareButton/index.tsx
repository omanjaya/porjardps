'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { ShareNetwork, Link as LinkIcon, WhatsappLogo, XLogo } from '@phosphor-icons/react'

interface ShareButtonProps {
  title: string
  text: string
  url?: string
  className?: string
}

export function ShareButton({ title, text, url, className }: ShareButtonProps) {
  const [open, setOpen] = useState(false)

  const fullUrl = url
    ? url.startsWith('http')
      ? url
      : `${typeof window !== 'undefined' ? window.location.origin : ''}${url}`
    : typeof window !== 'undefined'
    ? window.location.href
    : ''

  const shareText = text

  async function handleShare() {
    // Try Web Share API first (primarily mobile)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text: shareText, url: fullUrl || undefined })
        return
      } catch {
        // User cancelled or API not available, fall through to dropdown
      }
    }
    // Fallback: open dropdown
    setOpen(true)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(fullUrl || shareText)
      toast.success('Link berhasil disalin!')
    } catch {
      toast.error('Gagal menyalin link')
    }
    setOpen(false)
  }

  function shareWhatsApp() {
    const waText = fullUrl ? `${shareText}\n${fullUrl}` : shareText
    const waUrl = `https://wa.me/?text=${encodeURIComponent(waText)}`
    window.open(waUrl, '_blank', 'noopener,noreferrer')
    setOpen(false)
  }

  function shareTwitter() {
    const twUrl = fullUrl
      ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(fullUrl)}`
      : `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`
    window.open(twUrl, '_blank', 'noopener,noreferrer')
    setOpen(false)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            size="sm"
            variant="ghost"
            onClick={handleShare}
            className={className ?? 'text-stone-500 dark:text-zinc-400 hover:text-stone-700 dark:hover:text-zinc-300 h-8 w-8 p-0'}
          >
            <ShareNetwork size={16} />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={copyLink}>
          <LinkIcon size={14} />
          <span>Salin Link</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareWhatsApp}>
          <WhatsappLogo size={14} />
          <span>WhatsApp</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareTwitter}>
          <XLogo size={14} />
          <span>Twitter / X</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
