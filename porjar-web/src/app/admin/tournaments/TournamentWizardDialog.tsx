'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { GAME_CONFIG } from '@/constants/games'
import {
  Trophy, ArrowRight, ArrowLeft, CheckCircle, GraduationCap,
} from '@phosphor-icons/react'
import type { Game, GameSlug } from '@/types'

// ─── Game categories per tingkat ───
const GAME_CATEGORIES = [
  { label: 'ML Pria', slug: 'ml-pria', format: 'single_elimination', bo: 3 },
  { label: 'ML Wanita', slug: 'ml-wanita', format: 'single_elimination', bo: 3 },
  { label: 'HOK', slug: 'hok', format: 'single_elimination', bo: 3 },
  { label: 'Free Fire', slug: 'ff', format: 'battle_royale_points', bo: 1 },
  { label: 'PUBG Mobile', slug: 'pubgm', format: 'battle_royale_points', bo: 1 },
  { label: 'eFootball Solo', slug: 'efootball-solo', format: 'single_elimination', bo: 1 },
  { label: 'eFootball Duo', slug: 'efootball-duo', format: 'single_elimination', bo: 1 },
]

const TINGKAT_OPTIONS = [
  { value: 'SD', label: 'SD', color: 'bg-amber-500', desc: 'Sekolah Dasar' },
  { value: 'SMP', label: 'SMP', color: 'bg-blue-500', desc: 'Sekolah Menengah Pertama' },
  { value: 'SMA', label: 'SMA', color: 'bg-porjar-red', desc: 'Sekolah Menengah Atas/Kejuruan' },
]

const FORMAT_LABELS: Record<string, string> = {
  single_elimination: 'Single Elimination',
  double_elimination: 'Double Elimination',
  round_robin: 'Round Robin',
  battle_royale_points: 'Battle Royale Points',
}

export { GAME_CATEGORIES, TINGKAT_OPTIONS, FORMAT_LABELS }

interface TournamentWizardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  games: Game[]
  onCreated: () => void
}

export function TournamentWizardDialog({
  open,
  onOpenChange,
  games,
  onCreated,
}: TournamentWizardDialogProps) {
  const [step, setStep] = useState(1)
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
    setWizName(`${cat.label} ${wizTingkat} - PORJAR 2026`)
    setStep(3)
  }

  async function handleCreate() {
    const cat = GAME_CATEGORIES.find(c => c.label === wizCategory)
    if (!cat) return
    const game = games.find(g => g.slug === cat.slug)
    if (!game) { toast.error('Game tidak ditemukan'); return }

    setCreating(true)
    try {
      const result = await api.post<{ id: string }>('/admin/tournaments', {
        name: wizName.trim(),
        game_id: game.id,
        format: wizFormat,
        best_of: parseInt(wizBestOf),
        max_teams: wizMaxTeams ? parseInt(wizMaxTeams) : null,
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
      <DialogContent className="bg-white border-stone-200 sm:max-w-lg p-0 overflow-hidden">
        {/* Progress bar */}
        {!createdTournament && (
          <div className="flex border-b border-stone-100">
            {[1, 2, 3].map(s => (
              <div key={s} className={`flex-1 h-1 transition-colors ${step >= s ? 'bg-porjar-red' : 'bg-stone-100'}`} />
            ))}
          </div>
        )}

        <div className="p-6">
          {/* ─── Success Screen ─── */}
          {createdTournament ? (
            <div className="text-center py-4">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle size={32} weight="fill" className="text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-stone-900 mb-1">Turnamen Berhasil Dibuat!</h3>
              <p className="text-sm text-stone-500 mb-6">{createdTournament.name}</p>
              <div className="flex flex-col gap-2">
                {(createdTournament.format === 'single_elimination' || createdTournament.format === 'double_elimination') && (
                  <Link
                    href={`/admin/tournaments/${createdTournament.id}/bracket`}
                    className="w-full rounded-lg bg-porjar-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-porjar-red-dark text-center"
                  >
                    Setup Bracket →
                  </Link>
                )}
                {createdTournament.format === 'battle_royale_points' && (
                  <Link
                    href={`/admin/tournaments/${createdTournament.id}/lobbies`}
                    className="w-full rounded-lg bg-porjar-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-porjar-red-dark text-center"
                  >
                    Setup POT →
                  </Link>
                )}
                <Link
                  href={`/admin/tournaments/${createdTournament.id}`}
                  className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 text-center"
                >
                  Lihat Detail Turnamen
                </Link>
                <button
                  onClick={() => { setCreatedTournament(null); onOpenChange(false) }}
                  className="text-xs text-stone-400 hover:text-stone-600 mt-1"
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
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-porjar-red">
                <GraduationCap size={14} /> Langkah 1 dari 3
              </div>
              <h2 className="mb-1 text-xl font-bold text-stone-900">Pilih Tingkat</h2>
              <p className="mb-6 text-sm text-stone-500">Turnamen untuk jenjang pendidikan mana?</p>

              <div className="grid gap-3">
                {TINGKAT_OPTIONS.map(t => (
                  <button
                    key={t.value}
                    onClick={() => { setWizTingkat(t.value); setStep(2) }}
                    className="group flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-4 text-left transition-all hover:border-porjar-red/30 hover:shadow-md"
                  >
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${t.color} text-white font-bold text-lg`}>
                      {t.value}
                    </div>
                    <div>
                      <p className="font-bold text-stone-900 group-hover:text-porjar-red">{t.label}</p>
                      <p className="text-xs text-stone-500">{t.desc}</p>
                    </div>
                    <ArrowRight size={16} className="ml-auto text-stone-300 transition-transform group-hover:translate-x-1 group-hover:text-porjar-red" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── Step 2: Pilih Game/Kategori ─── */}
          {step === 2 && (
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-porjar-red">
                <Trophy size={14} /> Langkah 2 dari 3
              </div>
              <h2 className="mb-1 text-xl font-bold text-stone-900">Pilih Cabang Lomba</h2>
              <p className="mb-6 text-sm text-stone-500">
                Turnamen <span className="font-semibold text-stone-700">{wizTingkat}</span> — pilih cabang game
              </p>

              <div className="grid gap-2">
                {GAME_CATEGORIES.map(cat => {
                  const config = GAME_CONFIG[cat.slug as GameSlug]
                  return (
                    <button
                      key={cat.label}
                      onClick={() => selectCategory(cat)}
                      className="group flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3.5 text-left transition-all hover:border-porjar-red/30 hover:shadow-md"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stone-50 border border-stone-200">
                        {config?.logo ? (
                          <img src={config.logo} alt={cat.label} className="h-6 w-6 object-contain" />
                        ) : (
                          <Trophy size={18} className="text-stone-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-stone-900 group-hover:text-porjar-red">{cat.label}</p>
                        <p className="text-[11px] text-stone-400">
                          {FORMAT_LABELS[cat.format]} · BO{cat.bo}
                        </p>
                      </div>
                      <ArrowRight size={14} className="text-stone-300 transition-transform group-hover:translate-x-1 group-hover:text-porjar-red" />
                    </button>
                  )
                })}
              </div>

              <button onClick={() => setStep(1)} className="mt-4 flex items-center gap-1 text-sm text-stone-500 hover:text-porjar-red transition-colors">
                <ArrowLeft size={14} /> Kembali
              </button>
            </div>
          )}

          {/* ─── Step 3: Review & Konfigurasi ─── */}
          {step === 3 && (
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-porjar-red">
                <CheckCircle size={14} /> Langkah 3 dari 3
              </div>
              <h2 className="mb-1 text-xl font-bold text-stone-900">Review & Buat</h2>
              <p className="mb-6 text-sm text-stone-500">Periksa detail turnamen sebelum membuat</p>

              {/* Summary card */}
              <div className="mb-5 rounded-xl border-l-4 border-porjar-red bg-stone-50 p-4">
                <div className="flex items-center gap-3">
                  {(() => {
                    const cat = GAME_CATEGORIES.find(c => c.label === wizCategory)
                    const config = cat ? GAME_CONFIG[cat.slug as GameSlug] : null
                    return config?.logo ? <img src={config.logo} alt="" className="h-8 w-8 object-contain" /> : null
                  })()}
                  <div>
                    <p className="font-bold text-stone-900">{wizCategory}</p>
                    <p className="text-xs text-stone-500">Tingkat {wizTingkat} · {FORMAT_LABELS[wizFormat]} · BO{wizBestOf}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">Nama Turnamen</label>
                  <Input
                    value={wizName}
                    onChange={(e) => setWizName(e.target.value)}
                    className="bg-white border-stone-300 focus:border-porjar-red"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">Format Bracket</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { value: 'single_elimination', label: 'Single Elimination' },
                      { value: 'double_elimination', label: 'Double Elimination' },
                      { value: 'battle_royale_points', label: 'Battle Royale' },
                    ].map(f => (
                      <button
                        key={f.value}
                        onClick={() => setWizFormat(f.value)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          wizFormat === f.value
                            ? 'border-porjar-red bg-porjar-red text-white'
                            : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-700">Best Of</label>
                    <div className="flex gap-1">
                      {['1', '3', '5'].map(v => (
                        <button
                          key={v}
                          onClick={() => setWizBestOf(v)}
                          className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors ${
                            wizBestOf === v
                              ? 'border-porjar-red bg-porjar-red text-white'
                              : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                          }`}
                        >
                          BO{v}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-700">Maks Tim</label>
                    <Input
                      value={wizMaxTeams}
                      onChange={(e) => setWizMaxTeams(e.target.value)}
                      placeholder="Opsional"
                      type="number"
                      className="bg-white border-stone-300 focus:border-porjar-red"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button onClick={() => setStep(2)} className="flex items-center gap-1 text-sm text-stone-500 hover:text-porjar-red transition-colors">
                  <ArrowLeft size={14} /> Kembali
                </button>
                <Button onClick={handleCreate} disabled={creating} className="bg-porjar-red hover:bg-porjar-red-dark text-white px-6">
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
