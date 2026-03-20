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
  url: string
  title: string
  description?: string
}

export function ShareButton({ url, title, description }: ShareButtonProps) {
  const [open, setOpen] = useState(false)

  const fullUrl = url.startsWith('http') ? url : `${typeof window !== 'undefined' ? window.location.origin : ''}${url}`
  const text = description ? `${title} - ${description}` : title

  async function handleShare() {
    // Try Web Share API first (primarily mobile)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text: description, url: fullUrl })
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
      await navigator.clipboard.writeText(fullUrl)
      toast.success('Link berhasil disalin!')
    } catch {
      toast.error('Gagal menyalin link')
    }
    setOpen(false)
  }

  function shareWhatsApp() {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(`${text}\n${fullUrl}`)}`
    window.open(waUrl, '_blank', 'noopener,noreferrer')
    setOpen(false)
  }

  function shareTwitter() {
    const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(fullUrl)}`
    window.open(twUrl, '_blank', 'noopener,noreferrer')
    setOpen(false)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            size="sm"
            variant="outline"
            onClick={handleShare}
            className="border-stone-200 text-stone-700 hover:text-stone-900"
          >
            <ShareNetwork size={14} className="mr-1" />
            Bagikan
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
