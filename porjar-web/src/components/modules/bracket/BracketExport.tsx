'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Export, Link as LinkIcon, SpinnerGap } from '@phosphor-icons/react'

interface BracketExportProps {
  /** Ref to the bracket content element (the inner content div with match nodes) */
  bracketContentRef: React.RefObject<HTMLDivElement | null>
  /** Content dimensions for proper capture sizing */
  contentWidth: number
  contentHeight: number
  /** Filename for the exported image */
  filename?: string
}

export function BracketExport({
  bracketContentRef,
  contentWidth,
  contentHeight,
  filename = 'bracket',
}: BracketExportProps) {
  const [exporting, setExporting] = useState(false)

  const handleDownload = useCallback(async () => {
    if (!bracketContentRef.current) {
      toast.error('Bracket belum tersedia')
      return
    }

    setExporting(true)
    try {
      const html2canvas = (await import('html2canvas-pro')).default

      // Clone the bracket content into a hidden container for clean capture
      const original = bracketContentRef.current
      const clone = original.cloneNode(true) as HTMLDivElement

      // Create offscreen container
      const offscreen = document.createElement('div')
      offscreen.style.cssText = `
        position: fixed;
        left: -99999px;
        top: 0;
        width: ${contentWidth}px;
        height: ${contentHeight}px;
        overflow: visible;
        background: #f5f0eb;
        z-index: -9999;
      `

      // Reset transforms on clone so we capture at 1x scale
      clone.style.transform = 'none'
      clone.style.transformOrigin = '0 0'
      clone.style.position = 'relative'
      clone.style.width = `${contentWidth}px`
      clone.style.height = `${contentHeight}px`

      offscreen.appendChild(clone)
      document.body.appendChild(offscreen)

      const canvas = await html2canvas(offscreen, {
        width: contentWidth,
        height: contentHeight,
        backgroundColor: '#f5f0eb',
        scale: 2, // 2x for retina-quality export
        useCORS: true,
        logging: false,
      })

      document.body.removeChild(offscreen)

      // Trigger download
      const link = document.createElement('a')
      link.download = `${filename}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()

      toast.success('Bracket berhasil diunduh!')
    } catch {
      toast.error('Gagal mengekspor bracket')
    } finally {
      setExporting(false)
    }
  }, [bracketContentRef, contentWidth, contentHeight, filename])

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link berhasil disalin!')
    } catch {
      toast.error('Gagal menyalin link')
    }
  }, [])

  return (
    <div className="flex items-center gap-1.5">
      <Button
        size="sm"
        variant="outline"
        onClick={handleDownload}
        disabled={exporting}
        className="border-stone-300 bg-white text-stone-600 hover:bg-stone-50 hover:text-stone-900"
      >
        {exporting ? (
          <SpinnerGap size={14} className="mr-1 animate-spin" />
        ) : (
          <Export size={14} className="mr-1" />
        )}
        {exporting ? 'Mengunduh...' : 'Download'}
      </Button>

      <Button
        size="sm"
        variant="outline"
        onClick={handleCopyLink}
        className="border-stone-300 bg-white text-stone-600 hover:bg-stone-50 hover:text-stone-900"
      >
        <LinkIcon size={14} className="mr-1" />
        Copy Link
      </Button>
    </div>
  )
}
