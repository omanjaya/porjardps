'use client'

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Code, Copy, CheckCircle } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface EmbedCodeDialogProps {
  tournamentId: string
  tournamentName?: string
}

export function EmbedCodeDialog({ tournamentId, tournamentName }: EmbedCodeDialogProps) {
  const [open, setOpen] = useState(false)
  const [width, setWidth] = useState('100%')
  const [height, setHeight] = useState('600')
  const [theme, setTheme] = useState<'dark' | 'light'>('light')
  const [copied, setCopied] = useState(false)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const embedUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (theme !== 'light') params.set('theme', theme)
    const qs = params.toString()
    return `${baseUrl}/embed/bracket/${tournamentId}${qs ? `?${qs}` : ''}`
  }, [baseUrl, tournamentId, theme])

  const iframeCode = useMemo(() => {
    const w = width.includes('%') ? width : `${width}px`
    return `<iframe src="${embedUrl}" width="${w}" height="${height}" frameborder="0" style="border:0;border-radius:12px;overflow:hidden;" allowfullscreen title="${tournamentName ? `Bracket - ${tournamentName}` : 'PORJAR Bracket'}"></iframe>`
  }, [embedUrl, width, height, tournamentName])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(iframeCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      const textarea = document.createElement('textarea')
      textarea.value = iframeCode
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="border-stone-200 text-stone-700 hover:bg-stone-50" />
        }
      >
        <Code size={16} className="mr-1.5" />
        Embed
      </DialogTrigger>
      <DialogContent className="bg-white border-stone-200 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-stone-900">Embed Bracket</DialogTitle>
          <DialogDescription className="text-stone-500">
            Salin kode iframe untuk menampilkan bracket di website lain.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Customization */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block mb-1">
                Lebar
              </label>
              <Input
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder="100% atau 800"
                className="bg-white border-stone-200 text-stone-800 text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block mb-1">
                Tinggi (px)
              </label>
              <Input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="bg-white border-stone-200 text-stone-800 text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block mb-1">
                Tema
              </label>
              <div className="flex gap-1">
                <button
                  onClick={() => setTheme('dark')}
                  className={cn(
                    'flex-1 rounded-md border px-2 py-1.5 text-[10px] font-semibold transition-colors',
                    theme === 'dark'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-stone-200 bg-white text-stone-500 hover:border-stone-300'
                  )}
                >
                  Dark
                </button>
                <button
                  onClick={() => setTheme('light')}
                  className={cn(
                    'flex-1 rounded-md border px-2 py-1.5 text-[10px] font-semibold transition-colors',
                    theme === 'light'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-stone-200 bg-white text-stone-500 hover:border-stone-300'
                  )}
                >
                  Light
                </button>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block mb-1.5">
              Preview
            </label>
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-2 overflow-hidden">
              <iframe
                src={embedUrl}
                width="100%"
                height="200"
                style={{ border: 0, borderRadius: 8, pointerEvents: 'none' }}
                title="Embed Preview"
              />
            </div>
          </div>

          {/* Code */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block mb-1.5">
              Kode Embed
            </label>
            <div className="relative">
              <pre className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-[11px] text-stone-700 overflow-x-auto whitespace-pre-wrap break-all font-mono">
                {iframeCode}
              </pre>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
                className={cn(
                  'absolute top-2 right-2 border-stone-200 text-xs',
                  copied ? 'text-green-600 border-green-400' : 'text-stone-500'
                )}
              >
                {copied ? (
                  <>
                    <CheckCircle size={14} weight="fill" className="mr-1" />
                    Tersalin
                  </>
                ) : (
                  <>
                    <Copy size={14} className="mr-1" />
                    Salin
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
