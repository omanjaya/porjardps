'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { GAME_CONFIG } from '@/constants/games'
import {
  Trophy, ArrowRight, ArrowLeft, CheckCircle, GraduationCap, CalendarBlank,
} from '@phosphor-icons/react'
import type { Game, GameSlug, Event } from '@/types'

// Pick the most relevant event to default to: an ongoing one first, then a
// published/upcoming one, otherwise whatever sorts first.
function pickDefaultEvent(events: Event[]): string {
  if (events.length === 0) return ''
  const ongoing = events.find(e => e.status === 'ongoing')
  if (ongoing) return ongoing.id
  const active = events.find(e => e.status === 'published' || e.status === 'draft')
  if (active) return active.id
  return events[0].id
}

// ─── Game categories per tingkat ───
const GAME_CATEGORIES = [
  { label: 'ML Pria', slug: 'ml-pria', format: 'single_elimination', bo: 3 },
  { label: 'ML Wanita', slug: 'ml-wanita', format: 'single_elimination', bo: 3 },
  { label: 'HOK', slug: 'hok', format: 'single_elimination', bo: 3 },
  { label: 'Free Fire', slug: 'ff', format: 'battle_royale_points', bo: 1 },
  { label: 'PUBG Mobile', slug: 'pubgm', format: 'battle_royale_points', bo: 1 },
  { label: 'eFootball Solo', slug: 'efootball-solo', format: 'group_stage_playoff', bo: 1 },
  { label: 'eFootball Duo', slug: 'efootball-duo', format: 'group_stage_playoff', bo: 1 },
]

const TINGKAT_OPTIONS = [
  { value: 'SD', label: 'SD', color: 'bg-amber-500', desc: 'Sekolah Dasar' },
  { value: 'SMP', label: 'SMP', color: 'bg-blue-500', desc: 'Sekolah Menengah Pertama' },
  { value: 'SMA', label: 'SMA', color: 'bg-esi-red', desc: 'Sekolah Menengah Atas/Kejuruan' },
]

const FORMAT_LABELS: Record<string, string> = {
  single_elimination: 'Single Elimination',
  double_elimination: 'Double Elimination',
  round_robin: 'Round Robin',
  swiss: 'Swiss System',
  group_stage_playoff: 'Grup + Playoff',
  multi_stage: 'Multi Stage',
  battle_royale_points: 'Battle Royale Points',
}

export { GAME_CATEGORIES, TINGKAT_OPTIONS, FORMAT_LABELS }

interface TournamentWizardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  games: Game[]
  events: Event[]
  defaultEventId?: string | null
  onCreated: () => void
}

export function TournamentWizardDialog({
  open,
  onOpenChange,
  games,
  events,
  defaultEventId,
  onCreated,
}: TournamentWizardDialogProps) {
  const [step, setStep] = useState(1)
  const [wizEventId, setWizEventId] = useState('')
  const [wizTingkat, setWizTingkat] = useState('')
  const [wizCategory, setWizCategory] = useState('')
  const [wizFormat, setWizFormat] = useState('single_elimination')
  const [wizBestOf, setWizBestOf] = useState('3')
  const [wizMaxTeams, setWizMaxTeams] = useState('')
  const [wizName, setWizName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createdTournament, setCreatedTournament] = useState<{ id: string; name: string; format: string } | null>(null)

  function reset() {
    setStep(1)
    setWizEventId(defaultEventId || pickDefaultEvent(events))
    setWizTingkat('')
    setWizCategory('')
    setWizFormat('single_elimination')
    setWizBestOf('3')
    setWizMaxTeams('')
    setWizName('')
    setCreatedTournament(null)
  }

  useEffect(() => {
    if (open) reset()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleOpenChange(val: boolean) {
    onOpenChange(val)
  }

  function selectCategory(cat: typeof GAME_CATEGORIES[0]) {
    setWizCategory(cat.label)
    setWizFormat(cat.format)
    setWizBestOf(cat.format === 'battle_royale_points' ? '1' : String(cat.bo))
    const ev = events.find(e => e.id === wizEventId)
    const suffix = ev?.short_name || ev?.name || 'ESI'
    setWizName(`${cat.label} ${wizTingkat} - ${suffix}`)
    setStep(3)
  }

  async function handleCreate() {
    const cat = GAME_CATEGORIES.find(c => c.label === wizCategory)
    if (!cat) return
    const game = games.find(g => g.slug === cat.slug)
    if (!game) { toast.error('Game tidak ditemukan'); return }
    if (!wizEventId) { toast.error('Pilih event terlebih dahulu'); setStep(3); return }

    setCreating(true)
    try {
      const result = await api.post<{ id: string }>('/admin/tournaments', {
        event_id: wizEventId,
        name: wizName.trim(),
        game_id: game.id,
        format: wizFormat,
        best_of: parseInt(wizBestOf),
        max_teams: wizMaxTeams ? parseInt(wizMaxTeams) : null,
        school_level: wizTingkat || null,
        stage: 'main',
      })
      toast.success('Turnamen berhasil dibuat!')
      setCreatedTournament({ id: result.id, name: wizName.trim(), format: wizFormat })
      onCreated()
    } catch {
      toast.error('Gagal membuat turnamen')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-700 w-[calc(100vw-2rem)] max-w-lg p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Progress bar */}
        {!createdTournament && (
          <div className="flex border-b border-stone-100 dark:border-zinc-700">
            {[1, 2, 3].map(s => (
              <div key={s} className={`flex-1 h-1 transition-colors ${step >= s ? 'bg-esi-red' : 'bg-stone-100 dark:bg-zinc-800'}`} />
            ))}
          </div>
        )}

        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* ─── Success Screen ─── */}
          {createdTournament ? (
            <div className="text-center py-4">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle size={32} weight="fill" className="text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-stone-900 dark:text-zinc-100 mb-1">Turnamen Berhasil Dibuat!</h3>
              <p className="text-sm text-stone-500 dark:text-zinc-400 mb-6">{createdTournament.name}</p>
              <div className="flex flex-col gap-2">
                {(createdTournament.format === 'single_elimination' || createdTournament.format === 'double_elimination') && (
                  <Link
                    href={`/admin/tournaments/${createdTournament.id}/bracket`}
                    className="w-full rounded-lg bg-esi-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-esi-red-dark text-center"
                  >
                    Setup Bracket →
                  </Link>
                )}
                {createdTournament.format === 'group_stage_playoff' && (
                  <>
                    <Link
                      href={`/admin/tournaments/${createdTournament.id}/groups`}
                      className="w-full rounded-lg bg-esi-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-esi-red-dark text-center"
                    >
                      Setup Grup →
                    </Link>
                    <p className="text-xs text-stone-400 dark:text-zinc-500 -mt-1">Anda bisa memilih 1 atau 2 leg saat mengacak grup.</p>
                  </>
                )}
                {createdTournament.format === 'swiss' && (
                  <Link
                    href={`/admin/tournaments/${createdTournament.id}/swiss`}
                    className="w-full rounded-lg bg-esi-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-esi-red-dark text-center"
                  >
                    Setup Swiss →
                  </Link>
                )}
                {createdTournament.format === 'multi_stage' && (
                  <Link
                    href={`/admin/tournaments/${createdTournament.id}/stages`}
                    className="w-full rounded-lg bg-esi-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-esi-red-dark text-center"
                  >
                    Setup Stages →
                  </Link>
                )}
                {createdTournament.format === 'battle_royale_points' && (
                  <Link
                    href={`/admin/tournaments/${createdTournament.id}/lobbies`}
                    className="w-full rounded-lg bg-esi-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-esi-red-dark text-center"
                  >
                    Setup POT →
                  </Link>
                )}
                <Link
                  href={`/admin/tournaments/${createdTournament.id}`}
                  className="w-full rounded-lg border border-stone-300 dark:border-zinc-600 px-4 py-2.5 text-sm font-medium text-stone-700 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50 text-center"
                >
                  Lihat Detail Turnamen
                </Link>
                <button
                  onClick={() => { setCreatedTournament(null); onOpenChange(false) }}
                  className="text-xs text-stone-400 dark:text-zinc-500 hover:text-stone-600 dark:text-zinc-400 mt-1"
                >
                  Tutup
                </button>
              </div>
            </div>
          ) : (
          <>
          {/* ─── Step 1: Pilih Tingkat ─── */}
          {step === 1 && (
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-esi-red">
                <GraduationCap size={14} /> Langkah 1 dari 3
              </div>
              <h2 className="mb-1 text-xl font-bold text-stone-900 dark:text-zinc-100">Pilih Tingkat</h2>
              <p className="mb-6 text-sm text-stone-500 dark:text-zinc-400">Turnamen untuk jenjang pendidikan mana?</p>

              <div className="grid gap-3">
                {TINGKAT_OPTIONS.map(t => (
                  <button
                    key={t.value}
                    onClick={() => { setWizTingkat(t.value); setStep(2) }}
                    className="group flex items-center gap-4 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 text-left transition-all hover:border-esi-red/30 hover:shadow-md"
                  >
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${t.color} text-white font-bold text-lg`}>
                      {t.value}
                    </div>
                    <div>
                      <p className="font-bold text-stone-900 dark:text-zinc-100 group-hover:text-esi-red">{t.label}</p>
                      <p className="text-xs text-stone-500 dark:text-zinc-400">{t.desc}</p>
                    </div>
                    <ArrowRight size={16} className="ml-auto text-stone-300 dark:text-zinc-600 transition-transform group-hover:translate-x-1 group-hover:text-esi-red" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── Step 2: Pilih Game/Kategori ─── */}
          {step === 2 && (
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-esi-red">
                <Trophy size={14} /> Langkah 2 dari 3
              </div>
              <h2 className="mb-1 text-xl font-bold text-stone-900 dark:text-zinc-100">Pilih Cabang Lomba</h2>
              <p className="mb-6 text-sm text-stone-500 dark:text-zinc-400">
                Turnamen <span className="font-semibold text-stone-700 dark:text-zinc-300">{wizTingkat}</span> — pilih cabang game
              </p>

              <div className="grid gap-2">
                {GAME_CATEGORIES.map(cat => {
                  const config = GAME_CONFIG[cat.slug as GameSlug]
                  return (
                    <button
                      key={cat.label}
                      onClick={() => selectCategory(cat)}
                      className="group flex items-center gap-3 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3.5 text-left transition-all hover:border-esi-red/30 hover:shadow-md"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stone-50 dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-700">
                        {config?.logo ? (
                          <img src={config.logo} alt={cat.label} className="h-6 w-6 object-contain" />
                        ) : (
                          <Trophy size={18} className="text-stone-400 dark:text-zinc-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-stone-900 dark:text-zinc-100 group-hover:text-esi-red">{cat.label}</p>
                        <p className="text-[11px] text-stone-400 dark:text-zinc-500">
                          {FORMAT_LABELS[cat.format]}{cat.format !== 'battle_royale_points' ? ` · BO${cat.bo}` : ''}
                        </p>
                      </div>
                      <ArrowRight size={14} className="text-stone-300 dark:text-zinc-600 transition-transform group-hover:translate-x-1 group-hover:text-esi-red" />
                    </button>
                  )
                })}
              </div>

              <button onClick={() => setStep(1)} className="mt-4 flex items-center gap-1 text-sm text-stone-500 dark:text-zinc-400 hover:text-esi-red transition-colors">
                <ArrowLeft size={14} /> Kembali
              </button>
            </div>
          )}

          {/* ─── Step 3: Review & Konfigurasi ─── */}
          {step === 3 && (
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-esi-red">
                <CheckCircle size={14} /> Langkah 3 dari 3
              </div>
              <h2 className="mb-1 text-xl font-bold text-stone-900 dark:text-zinc-100">Review & Buat</h2>
              <p className="mb-6 text-sm text-stone-500 dark:text-zinc-400">Periksa detail turnamen sebelum membuat</p>

              {/* Summary card */}
              <div className="mb-5 rounded-xl border-l-4 border-esi-red bg-stone-50 dark:bg-zinc-800/50 p-4">
                <div className="flex items-center gap-3">
                  {(() => {
                    const cat = GAME_CATEGORIES.find(c => c.label === wizCategory)
                    const config = cat ? GAME_CONFIG[cat.slug as GameSlug] : null
                    return config?.logo ? <img src={config.logo} alt="" className="h-8 w-8 object-contain" /> : null
                  })()}
                  <div>
                    <p className="font-bold text-stone-900 dark:text-zinc-100">{wizCategory}</p>
                    <p className="text-xs text-stone-500 dark:text-zinc-400">Tingkat {wizTingkat} · {FORMAT_LABELS[wizFormat]}{wizFormat !== 'battle_royale_points' ? ` · BO${wizBestOf}` : ''}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-stone-700 dark:text-zinc-300">
                    <CalendarBlank size={14} /> Event
                  </label>
                  {events.length === 0 ? (
                    <p className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                      Belum ada event. Buat event dulu di menu <span className="font-semibold">Events</span> sebelum membuat turnamen.
                    </p>
                  ) : (
                    <Select value={wizEventId} onValueChange={(v) => setWizEventId(v ?? '')}>
                      <SelectTrigger className="w-full bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 text-stone-900 dark:text-zinc-100">
                        <SelectValue placeholder="Pilih event..." />
                      </SelectTrigger>
                      <SelectContent>
                        {events.map((e) => (
                          <SelectItem key={e.id} value={e.id} className="text-stone-900 dark:text-zinc-100">
                            {e.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-zinc-300">Nama Turnamen</label>
                  <Input
                    value={wizName}
                    onChange={(e) => setWizName(e.target.value)}
                    className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 focus:border-esi-red"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-zinc-300">Format Bracket</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { value: 'single_elimination', label: 'Single Elimination' },
                      { value: 'double_elimination', label: 'Double Elimination' },
                      { value: 'swiss', label: 'Swiss System' },
                      { value: 'group_stage_playoff', label: 'Grup + Playoff' },
                      { value: 'multi_stage', label: 'Multi Stage' },
                      { value: 'battle_royale_points', label: 'Battle Royale' },
                    ].map(f => (
                      <button
                        key={f.value}
                        onClick={() => setWizFormat(f.value)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          wizFormat === f.value
                            ? 'border-esi-red bg-esi-red text-white'
                            : 'border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {wizFormat !== 'battle_royale_points' && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-zinc-300">Best Of</label>
                    <div className="flex gap-1">
                      {['1', '3', '5'].map(v => (
                        <button
                          key={v}
                          onClick={() => setWizBestOf(v)}
                          className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors ${
                            wizBestOf === v
                              ? 'border-esi-red bg-esi-red text-white'
                              : 'border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50'
                          }`}
                        >
                          BO{v}
                        </button>
                      ))}
                    </div>
                  </div>
                  )}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-zinc-300">Maks Tim</label>
                    <Input
                      value={wizMaxTeams}
                      onChange={(e) => setWizMaxTeams(e.target.value)}
                      placeholder="Opsional"
                      type="number"
                      className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 focus:border-esi-red"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button onClick={() => setStep(2)} className="flex items-center gap-1 text-sm text-stone-500 dark:text-zinc-400 hover:text-esi-red transition-colors">
                  <ArrowLeft size={14} /> Kembali
                </button>
                <Button onClick={handleCreate} disabled={creating || !wizEventId} className="bg-esi-red hover:bg-esi-red-dark text-white px-6">
                  {creating ? 'Membuat...' : (
                    <>
                      Buat Turnamen
                      <CheckCircle size={16} className="ml-1.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
          </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
