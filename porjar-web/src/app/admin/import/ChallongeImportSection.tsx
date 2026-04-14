'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ArrowRight,
  CheckCircle,
  WarningCircle,
  Spinner,
  Trophy,
  Users,
  ArrowsClockwise,
  MagnifyingGlass,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { api, ApiError } from '@/lib/api'
import { toast } from 'sonner'
import type { Tournament } from '@/types'

// === Types ===

interface ChallongeTournament {
  id: number
  name: string
  slug: string
  type: string
  state: string
  participants_count: number
  progress_meter: number
}

interface ChallongeParticipant {
  id: number
  name: string
  seed: number
}

interface ChallongeMatchPreview {
  id: number
  round: number
  match_number: number
  player1_id: number | null
  player2_id: number | null
  winner_id: number | null
  scores: string
  state: string
  bracket_position: string
}

interface PreviewData {
  participants: ChallongeParticipant[]
  matches: ChallongeMatchPreview[]
  match_count: number
}

interface PorjarTeam {
  id: string
  name: string
  school_name?: string
}

// === Main Component ===

export function ChallongeImportSection() {
  const [tournaments, setTournaments] = useState<ChallongeTournament[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step tracking: 'list' → 'mapping' → 'done'
  const [step, setStep] = useState<'list' | 'mapping' | 'done'>('list')

  // Selected Challonge tournament
  const [selected, setSelected] = useState<ChallongeTournament | null>(null)
  const [preview, setPreview] = useState<PreviewData | null>(null)

  // Porjar tournament selection
  const [porjarTournaments, setPorjarTournaments] = useState<Tournament[]>([])
  const [selectedPorjar, setSelectedPorjar] = useState<Tournament | null>(null)
  const [porjarTeams, setPorjarTeams] = useState<PorjarTeam[]>([])

  // Team mapping: challonge participant ID → porjar team ID
  const [teamMapping, setTeamMapping] = useState<Record<string, string>>({})

  // Import result
  const [importResult, setImportResult] = useState<{ imported_matches: number } | null>(null)
  const [importing, setImporting] = useState(false)

  // Search filter for Challonge tournaments
  const [searchQuery, setSearchQuery] = useState('')

  // Load Challonge tournaments
  const loadTournaments = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.get<ChallongeTournament[]>('/admin/import/challonge/tournaments')
      setTournaments(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memuat tournament Challonge')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load Porjar tournaments
  const loadPorjarTournaments = useCallback(async () => {
    try {
      const data = await api.get<{ tournaments: Tournament[] }>('/admin/tournaments?limit=100')
      setPorjarTournaments(data.tournaments || [])
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    loadTournaments()
    loadPorjarTournaments()
  }, [loadTournaments, loadPorjarTournaments])

  // Select a Challonge tournament → fetch preview
  const selectTournament = async (t: ChallongeTournament) => {
    setSelected(t)
    setLoading(true)
    try {
      const data = await api.get<PreviewData>(`/admin/import/challonge/tournaments/${t.slug}/preview`)
      setPreview(data)
      setStep('mapping')
      // Auto-match by name
      autoMatch(data.participants)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal memuat preview')
    } finally {
      setLoading(false)
    }
  }

  // Load teams when Porjar tournament is selected
  const selectPorjarTournament = async (t: Tournament) => {
    setSelectedPorjar(t)
    try {
      const data = await api.get<PorjarTeam[]>(`/admin/tournaments/${t.id}/teams`)
      setPorjarTeams(data || [])
      // Re-run auto-match with new teams
      if (preview) {
        autoMatchWithTeams(preview.participants, data || [])
      }
    } catch {
      setPorjarTeams([])
    }
  }

  // Auto-match participants to teams by normalized name
  const autoMatch = (participants: ChallongeParticipant[]) => {
    if (porjarTeams.length === 0) return
    autoMatchWithTeams(participants, porjarTeams)
  }

  const autoMatchWithTeams = (participants: ChallongeParticipant[], teams: PorjarTeam[]) => {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
    const mapping: Record<string, string> = {}

    for (const p of participants) {
      const pNorm = normalize(p.name)
      // Exact match first
      let match = teams.find((t) => normalize(t.name) === pNorm)
      // Partial match (contains)
      if (!match) {
        match = teams.find((t) => pNorm.includes(normalize(t.name)) || normalize(t.name).includes(pNorm))
      }
      if (match) {
        mapping[String(p.id)] = match.id
      }
    }

    setTeamMapping(mapping)
  }

  // Do the import
  const doImport = async () => {
    if (!selected || !selectedPorjar) return
    setImporting(true)
    try {
      const result = await api.post<{ imported_matches: number }>('/admin/import/challonge', {
        challonge_slug: selected.slug,
        tournament_id: selectedPorjar.id,
        team_mapping: teamMapping,
      })
      setImportResult(result)
      setStep('done')
      toast.success(`Berhasil import ${result.imported_matches} match!`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal import bracket')
    } finally {
      setImporting(false)
    }
  }

  // Reset to start
  const reset = () => {
    setStep('list')
    setSelected(null)
    setPreview(null)
    setSelectedPorjar(null)
    setPorjarTeams([])
    setTeamMapping({})
    setImportResult(null)
  }

  const filteredTournaments = tournaments.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stateColors: Record<string, string> = {
    underway: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    awaiting_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    pending: 'bg-stone-100 text-stone-600 dark:bg-zinc-800 dark:text-zinc-400',
    complete: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  }

  // ── Step: Tournament List ──
  if (step === 'list') {
    return (
      <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy size={18} weight="bold" className="text-amber-500" />
            <h3 className="font-semibold text-stone-900 dark:text-zinc-100">Import dari Challonge</h3>
          </div>
          <Button size="sm" variant="outline" onClick={loadTournaments} disabled={loading}>
            <ArrowsClockwise size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="px-5 py-3 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
            <WarningCircle size={16} />
            {error}
          </div>
        )}

        <div className="px-5 py-3">
          <div className="relative">
            <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Cari tournament..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-stone-900 dark:text-zinc-100 placeholder:text-stone-400"
            />
          </div>
        </div>

        {loading && tournaments.length === 0 ? (
          <div className="px-5 py-8 text-center text-stone-400">
            <Spinner size={24} className="animate-spin mx-auto mb-2" />
            Memuat tournament...
          </div>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-zinc-800">
            {filteredTournaments.map((t) => (
              <button
                key={t.id}
                onClick={() => selectTournament(t)}
                className="w-full px-5 py-3 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-stone-900 dark:text-zinc-100 truncate">{t.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-stone-400 dark:text-zinc-500">{t.type}</span>
                    <span className="text-stone-300 dark:text-zinc-600">·</span>
                    <span className="text-[11px] text-stone-400 dark:text-zinc-500 flex items-center gap-1">
                      <Users size={10} />
                      {t.participants_count}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${stateColors[t.state] || stateColors.pending}`}>
                      {t.state}
                    </span>
                  </div>
                </div>
                <ArrowRight size={16} className="text-stone-300 dark:text-zinc-600 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}

        {!loading && filteredTournaments.length === 0 && tournaments.length > 0 && (
          <div className="px-5 py-6 text-center text-stone-400 text-sm">Tidak ada tournament yang cocok</div>
        )}
      </div>
    )
  }

  // ── Step: Team Mapping ──
  if (step === 'mapping' && selected && preview) {
    const mappedCount = Object.keys(teamMapping).length
    const totalParticipants = preview.participants.length
    const completedMatches = preview.matches.filter((m) => m.state === 'complete').length

    return (
      <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-stone-900 dark:text-zinc-100">{selected.name}</h3>
              <p className="text-[11px] text-stone-400 dark:text-zinc-500 mt-0.5">
                {selected.type} · {totalParticipants} peserta · {preview.match_count} match ({completedMatches} selesai)
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={reset}>Kembali</Button>
          </div>
        </div>

        {/* Target Porjar Tournament */}
        <div className="px-5 py-4 border-b border-stone-100 dark:border-zinc-800">
          <label className="block text-xs font-medium text-stone-500 dark:text-zinc-400 mb-2">
            Target Tournament di ESI
          </label>
          <select
            value={selectedPorjar?.id || ''}
            onChange={(e) => {
              const t = porjarTournaments.find((pt) => pt.id === e.target.value)
              if (t) selectPorjarTournament(t)
            }}
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-stone-900 dark:text-zinc-100"
          >
            <option value="">Pilih tournament...</option>
            {porjarTournaments.map((pt) => (
              <option key={pt.id} value={pt.id}>
                {pt.name} ({pt.format} · {pt.team_count} tim)
              </option>
            ))}
          </select>
        </div>

        {/* Team Mapping Table */}
        {selectedPorjar && (
          <div className="px-5 py-4 border-b border-stone-100 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-stone-500 dark:text-zinc-400">
                Mapping Peserta ({mappedCount}/{totalParticipants} terpetakan)
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => preview && autoMatchWithTeams(preview.participants, porjarTeams)}
              >
                <ArrowsClockwise size={12} />
                Auto-match
              </Button>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {preview.participants
                .sort((a, b) => a.seed - b.seed)
                .map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 py-1.5"
                >
                  <div className="w-6 text-right">
                    <span className="text-[10px] font-bold text-stone-400 dark:text-zinc-500">#{p.seed}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-stone-700 dark:text-zinc-300 truncate">{p.name}</p>
                  </div>
                  <ArrowRight size={12} className="text-stone-300 dark:text-zinc-600 flex-shrink-0" />
                  <div className="flex-1">
                    <select
                      value={teamMapping[String(p.id)] || ''}
                      onChange={(e) => {
                        setTeamMapping((prev) => {
                          const next = { ...prev }
                          if (e.target.value) {
                            next[String(p.id)] = e.target.value
                          } else {
                            delete next[String(p.id)]
                          }
                          return next
                        })
                      }}
                      className={`w-full px-2 py-1.5 text-xs rounded-md border ${
                        teamMapping[String(p.id)]
                          ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                          : 'border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800'
                      } text-stone-900 dark:text-zinc-100`}
                    >
                      <option value="">- Tidak dipetakan -</option>
                      {porjarTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Import Button */}
        <div className="px-5 py-4 flex items-center justify-between">
          <p className="text-[11px] text-stone-400 dark:text-zinc-500">
            {mappedCount === 0 ? 'Petakan peserta ke tim ESI terlebih dahulu' :
              `${mappedCount} dari ${totalParticipants} peserta terpetakan`}
          </p>
          <Button
            onClick={doImport}
            disabled={importing || !selectedPorjar || mappedCount === 0}
          >
            {importing ? (
              <>
                <Spinner size={14} className="animate-spin" />
                Mengimport...
              </>
            ) : (
              <>Import {preview.match_count} Match</>
            )}
          </Button>
        </div>
      </div>
    )
  }

  // ── Step: Done ──
  if (step === 'done') {
    return (
      <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="px-5 py-8 text-center">
          <CheckCircle size={48} weight="fill" className="text-green-500 mx-auto mb-3" />
          <h3 className="font-semibold text-stone-900 dark:text-zinc-100 mb-1">Import Berhasil!</h3>
          <p className="text-sm text-stone-500 dark:text-zinc-400 mb-4">
            {importResult?.imported_matches} match berhasil diimport dari <strong>{selected?.name}</strong> ke{' '}
            <strong>{selectedPorjar?.name}</strong>
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={reset}>Import Lagi</Button>
            {selectedPorjar && (
              <a href={`/admin/tournaments/${selectedPorjar.id}/bracket`}>
                <Button>Lihat Bracket</Button>
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}
