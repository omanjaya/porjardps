'use client'

import { useEffect, useMemo, useState } from 'react'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/shared/EmptyState'
import { WhatsappLogo, Copy, ArrowSquareOut } from '@phosphor-icons/react'
import { api } from '@/lib/api'

interface Team {
  id: string
  name: string
  game_id?: string
  game_name?: string
  school_id?: string
  school_name?: string
  captain_user_id?: string | null
  captain_name?: string | null
  captain_phone?: string | null
}

interface Game {
  id: string
  name: string
}

interface School {
  id: string
  name: string
}

interface Event {
  id: string
  name: string
}

type TargetFilter = 'all' | 'game' | 'school' | 'event'

// Normalize an Indonesian phone number for wa.me: strip non-digits, convert
// leading 0 to 62.
function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D+/g, '')
  if (!digits) return null
  if (digits.startsWith('62')) return digits
  if (digits.startsWith('0')) return '62' + digits.slice(1)
  if (digits.startsWith('8')) return '62' + digits
  return digits
}

function buildWaLink(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

export default function AdminBroadcastPage() {
  const [message, setMessage] = useState(
    'Halo captain, mohon cek jadwal pertandingan terbaru di website ESI Denpasar. Terima kasih!',
  )
  const [targetFilter, setTargetFilter] = useState<TargetFilter>('all')
  const [filterValue, setFilterValue] = useState<string>('')
  const [teams, setTeams] = useState<Team[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const [g, s] = await Promise.all([
          api.get<(Game & { id: string })[]>('/games').catch(() => []),
          api.getPaginated<School[]>('/schools?per_page=200').catch(() => ({
            data: [] as School[],
          })),
        ])
        setGames(Array.isArray(g) ? g : [])
        setSchools(Array.isArray((s as { data?: School[] }).data) ? (s as { data: School[] }).data : [])
      } catch {
        // ignore
      }
      try {
        const ev = await api.getPaginated<Event[]>('/events?per_page=100').catch(() => ({
          data: [] as Event[],
        }))
        setEvents(Array.isArray((ev as { data?: Event[] }).data) ? (ev as { data: Event[] }).data : [])
      } catch {
        // ignore
      }
    })()
  }, [])

  async function generate() {
    setLoading(true)
    setGenerated(false)
    try {
      const params = new URLSearchParams({ per_page: '500' })
      if (targetFilter === 'game' && filterValue) params.set('game_id', filterValue)
      if (targetFilter === 'school' && filterValue) params.set('school_id', filterValue)
      if (targetFilter === 'event' && filterValue) params.set('event_id', filterValue)
      const res = await api.getPaginated<Team[]>(`/teams?${params.toString()}`)
      setTeams(Array.isArray(res.data) ? res.data : [])
      setGenerated(true)
    } catch {
      setTeams([])
      setGenerated(true)
    } finally {
      setLoading(false)
    }
  }

  const recipients = useMemo(() => {
    return teams
      .map((t) => ({
        team: t,
        phone: normalizePhone(t.captain_phone),
      }))
      .filter((r): r is { team: Team; phone: string } => r.phone !== null)
  }, [teams])

  const missingPhone = teams.length - recipients.length

  function openOne(phone: string) {
    const url = buildWaLink(phone, message)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function openAll() {
    // open in batches of 5 with a small delay to reduce popup-blocker issues
    for (let i = 0; i < recipients.length; i += 5) {
      const batch = recipients.slice(i, i + 5)
      for (const r of batch) {
        window.open(buildWaLink(r.phone, message), '_blank', 'noopener,noreferrer')
      }
      if (i + 5 < recipients.length) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((res) => setTimeout(res, 1200))
      }
    }
  }

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <PageHeader
          title="Broadcast WhatsApp"
          description="Kirim pesan ke captain tim via WhatsApp (wa.me deep link)."
        />

        <div className="rounded-lg border bg-card p-4 sm:p-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="msg" className="text-sm font-medium">Pesan</label>
            <Textarea
              id="msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Tulis pesan di sini..."
            />
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={copyMessage}>
                <Copy className="mr-1 h-4 w-4" />
                {copied ? 'Tersalin!' : 'Salin pesan'}
              </Button>
              <span className="text-xs text-muted-foreground">{message.length} karakter</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="target" className="text-sm font-medium">Target</label>
              <select
                id="target"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={targetFilter}
                onChange={(e) => {
                  setTargetFilter(e.target.value as TargetFilter)
                  setFilterValue('')
                }}
              >
                <option value="all">Semua tim</option>
                <option value="game">Berdasarkan game</option>
                <option value="school">Berdasarkan sekolah</option>
                <option value="event">Berdasarkan event</option>
              </select>
            </div>

            {targetFilter !== 'all' && (
              <div className="space-y-2">
                <label htmlFor="filterval" className="text-sm font-medium">
                  {targetFilter === 'game'
                    ? 'Pilih Game'
                    : targetFilter === 'school'
                      ? 'Pilih Sekolah'
                      : 'Pilih Event'}
                </label>
                <select
                  id="filterval"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                >
                  <option value="">-- pilih --</option>
                  {targetFilter === 'game' &&
                    games.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  {targetFilter === 'school' &&
                    schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  {targetFilter === 'event' &&
                    events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              onClick={generate}
              disabled={loading || (targetFilter !== 'all' && !filterValue) || !message.trim()}
            >
              {loading ? 'Memuat...' : 'Generate WA Links'}
            </Button>
            {generated && recipients.length > 0 && (
              <Button type="button" variant="secondary" onClick={openAll}>
                <ArrowSquareOut className="mr-1 h-4 w-4" />
                Buka Semua ({recipients.length})
              </Button>
            )}
          </div>
        </div>

        {generated && (
          <div className="rounded-lg border bg-card p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold">
                Penerima ({recipients.length})
              </h3>
              {missingPhone > 0 && (
                <span className="text-xs text-amber-600">
                  {missingPhone} tim tanpa nomor captain dilewati
                </span>
              )}
            </div>

            {recipients.length === 0 ? (
              <EmptyState
                icon={WhatsappLogo}
                title="Tidak ada penerima"
                description="Tidak ada tim yang cocok dengan filter ini, atau tidak ada yang memiliki nomor captain."
              />
            ) : (
              <ul className="divide-y">
                {recipients.map(({ team, phone }) => (
                  <li
                    key={team.id}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{team.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {team.school_name ? `${team.school_name} · ` : ''}
                        {team.game_name ? `${team.game_name} · ` : ''}
                        Captain: {team.captain_name || '-'} ({phone})
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openOne(phone)}
                      className="w-full sm:w-auto"
                    >
                      <WhatsappLogo className="mr-1 h-4 w-4" />
                      Buka WA
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
