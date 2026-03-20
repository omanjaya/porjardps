'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Link as LinkIcon,
  Copy,
  Plus,
  Trash,
  Clock,
  CheckCircle,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'

interface TeamInvite {
  id: string
  invite_code: string
  max_uses: number
  used_count: number
  expires_at: string
  is_active: boolean
  created_at: string
}

interface InviteLinkCardProps {
  teamId: string
}

export function InviteLinkCard({ teamId }: InviteLinkCardProps) {
  const [invites, setInvites] = useState<TeamInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  // Settings for new invite
  const [maxUses, setMaxUses] = useState(5)
  const [expiryDays, setExpiryDays] = useState(7)
  const [showSettings, setShowSettings] = useState(false)

  const fetchInvites = useCallback(async () => {
    try {
      const data = await api.get<TeamInvite[]>(`/teams/${teamId}/invites`)
      setInvites(data ?? [])
    } catch (err) {
      console.error('Gagal memuat invite:', err)
    } finally {
      setLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    fetchInvites()
  }, [fetchInvites])

  async function handleGenerate() {
    setGenerating(true)
    try {
      await api.post(`/teams/${teamId}/invite`, {
        max_uses: maxUses,
        expiry_days: expiryDays,
      })
      setShowSettings(false)
      await fetchInvites()
    } catch {
      toast.error('Gagal membuat link undangan')
    } finally {
      setGenerating(false)
    }
  }

  async function handleDeactivate(inviteId: string) {
    try {
      await api.delete(`/teams/${teamId}/invites/${inviteId}`)
      await fetchInvites()
    } catch {
      toast.error('Gagal menonaktifkan undangan')
    }
  }

  function copyToClipboard(code: string) {
    const url = `${window.location.origin}/teams/join/${code}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(code)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  function formatExpiry(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    if (diff <= 0) return 'Kedaluwarsa'
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    if (days > 0) return `${days} hari lagi`
    return `${hours} jam lagi`
  }

  const maxUsesOptions = [
    { value: 1, label: '1x' },
    { value: 5, label: '5x' },
    { value: 0, label: 'Unlimited' },
  ]

  const expiryOptions = [
    { value: 1, label: '1 Hari' },
    { value: 7, label: '7 Hari' },
    { value: 30, label: '30 Hari' },
  ]

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/80 p-6 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-50">
          <LinkIcon size={20} weight="bold" />
          Link Undangan
        </h2>
        <Button
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          className="gap-1 bg-blue-600 hover:bg-blue-700"
        >
          <Plus size={14} />
          Buat Link
        </Button>
      </div>

      {/* Generate Settings */}
      {showSettings && (
        <div className="mb-4 rounded-lg border border-slate-700/30 bg-slate-900/50 p-4">
          <h3 className="mb-3 text-sm font-medium text-slate-300">Pengaturan Link Baru</h3>

          <div className="mb-3">
            <label className="mb-1 block text-xs text-slate-500">Maks Penggunaan</label>
            <div className="flex gap-2">
              {maxUsesOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMaxUses(opt.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    maxUses === opt.value
                      ? 'border border-blue-500/30 bg-blue-500/15 text-blue-400'
                      : 'border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-xs text-slate-500">Masa Berlaku</label>
            <div className="flex gap-2">
              {expiryOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setExpiryDays(opt.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    expiryDays === opt.value
                      ? 'border border-blue-500/30 bg-blue-500/15 text-blue-400'
                      : 'border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={generating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {generating ? 'Membuat...' : 'Buat Link'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowSettings(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              Batal
            </Button>
          </div>
        </div>
      )}

      {/* Active Invites List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-700/50" />
          ))}
        </div>
      ) : invites.length === 0 ? (
        <div className="flex flex-col items-center py-6 text-center">
          <LinkIcon size={32} weight="thin" className="mb-2 text-slate-600" />
          <p className="text-sm text-slate-400">Belum ada link undangan aktif</p>
          <p className="mt-1 text-xs text-slate-500">
            Buat link undangan agar pemain lain bisa bergabung ke tim
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center gap-3 rounded-lg border border-slate-700/30 bg-slate-900/50 p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <code className="rounded bg-slate-700/50 px-2 py-0.5 text-xs font-mono text-slate-300">
                    {invite.invite_code}
                  </code>
                  <span className="text-[10px] text-slate-500">
                    {invite.max_uses === 0
                      ? `${invite.used_count}x digunakan`
                      : `${invite.used_count}/${invite.max_uses} digunakan`}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <Clock size={10} />
                  {formatExpiry(invite.expires_at)}
                </div>
              </div>

              <button
                onClick={() => copyToClipboard(invite.invite_code)}
                className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-700 hover:text-slate-300"
                title="Salin link"
              >
                {copied === invite.invite_code ? (
                  <CheckCircle size={16} className="text-green-400" />
                ) : (
                  <Copy size={16} />
                )}
              </button>

              <button
                onClick={() => handleDeactivate(invite.id)}
                className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-red-500/15 hover:text-red-400"
                title="Nonaktifkan"
              >
                <Trash size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
