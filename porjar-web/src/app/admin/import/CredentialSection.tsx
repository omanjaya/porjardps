'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/store/auth-store'
import {
  Users,
  FunnelSimple,
  FilePdf,
  WhatsappLogo,
  MagnifyingGlass,
  CheckCircle,
  ArrowCounterClockwise,
  Info,
  LockKeyOpen,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

// ── Types ──

interface CredentialRow {
  nama: string
  nisn: string
  password_default: string
  sekolah: string
  tim: string
  game: string
  tingkat: string
}

interface SchoolData {
  id: string
  name: string
  level: string
  coach_phone: string | null
}

interface SchoolRow {
  school: SchoolData
  studentCount: number
  games: string[]
  teams: string[]
}

// ── Helpers ──

const WA_SENT_KEY = 'porjar_wa_sent_schools'

function getSentSchools(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(WA_SENT_KEY)
    if (raw) return new Set(JSON.parse(raw))
  } catch { /* ignore */ }
  return new Set()
}

function saveSentSchools(sent: Set<string>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(WA_SENT_KEY, JSON.stringify(Array.from(sent)))
}

/** RFC 4180 CSV parser - handles quoted fields with commas and escaped quotes */
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let i = 0
  const len = text.length

  while (i < len) {
    const row: string[] = []
    while (i < len) {
      let value = ''
      if (text[i] === '"') {
        // Quoted field
        i++ // skip opening quote
        while (i < len) {
          if (text[i] === '"') {
            if (i + 1 < len && text[i + 1] === '"') {
              value += '"'
              i += 2
            } else {
              i++ // skip closing quote
              break
            }
          } else {
            value += text[i]
            i++
          }
        }
      } else {
        // Unquoted field
        while (i < len && text[i] !== ',' && text[i] !== '\r' && text[i] !== '\n') {
          value += text[i]
          i++
        }
      }
      row.push(value)
      if (i < len && text[i] === ',') {
        i++ // skip comma
      } else {
        break
      }
    }
    // Skip line endings
    if (i < len && text[i] === '\r') i++
    if (i < len && text[i] === '\n') i++
    if (row.length > 0 && !(row.length === 1 && row[0] === '')) {
      rows.push(row)
    }
  }
  return rows
}

function formatPhoneForWA(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '')
  if (cleaned.startsWith('0')) cleaned = '62' + cleaned.slice(1)
  if (!cleaned.startsWith('62')) cleaned = '62' + cleaned
  return cleaned
}

function buildWAMessage(schoolName: string, downloadUrl: string, pin: string): string {
  return `Yth. Pembina/Pelatih
*${schoolName}*

Berikut kartu kredensial peserta ESI ESPORT 2026 dari sekolah Anda:

📥 *Download Kartu Kredensial:*
${downloadUrl}

🔑 *PIN Download:* ${pin}

Buka link di atas, masukkan PIN, lalu kartu kredensial akan otomatis terdownload.

Kartu berisi NISN dan password untuk login di porjar.esidenpasar.id
Mohon distribusikan ke seluruh peserta tim.

_Link & PIN berlaku 7 hari._

Terima kasih,
Panitia ESI Denpasar 2026`
}

// ── Component ──

export function CredentialSection() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [credentials, setCredentials] = useState<CredentialRow[]>([])
  const [schools, setSchools] = useState<SchoolData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filterTingkat, setFilterTingkat] = useState('')
  const [filterGame, setFilterGame] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sentSchools, setSentSchools] = useState<Set<string>>(new Set())
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [resettingId, setResettingId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const perPage = 10

  useEffect(() => {
    if (!isAuthenticated || authLoading) return
    loadData()
    setSentSchools(getSentSchools())
  }, [isAuthenticated, authLoading, filterTingkat, filterGame])

  async function loadData() {
    setIsLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'
      const { getAccessToken } = await import('@/lib/api')
      const token = getAccessToken() ?? ''
      const headers = { Authorization: `Bearer ${token}` }

      // Fetch ALL schools (paginated, max 100 per page)
      const allSchools: SchoolData[] = []
      let page = 1
      while (true) {
        const res = await fetch(`${apiUrl}/schools?limit=100&page=${page}`, { headers })
        const body = await res.json()
        const items = body.data ?? body ?? []
        if (!Array.isArray(items) || items.length === 0) break
        for (const s of items) {
          allSchools.push({ id: s.id, name: s.name, level: s.level, coach_phone: s.coach_phone })
        }
        const totalPages = body.meta?.total_pages ?? body.total_pages ?? 1
        if (page >= totalPages) break
        page++
      }
      setSchools(allSchools)

      // Load credentials CSV
      const params = new URLSearchParams()
      if (filterTingkat) params.set('tingkat', filterTingkat)
      if (filterGame) params.set('game', filterGame)
      const qs = params.toString()
      const credRes = await fetch(`${apiUrl}/admin/import/credentials${qs ? `?${qs}` : ''}`, { headers })
      const csvText = await credRes.text()
      // Strip BOM if present
      const cleanText = csvText.replace(/^\uFEFF/, '')
      const parsed = parseCSV(cleanText)
      if (parsed.length > 1) {
        const csvHeaders = parsed[0]
        const rows: CredentialRow[] = parsed.slice(1).map((vals) => {
          const obj: Record<string, string> = {}
          csvHeaders.forEach((h, i) => { obj[h.trim()] = (vals[i] ?? '').trim() })
          return obj as unknown as CredentialRow
        })
        setCredentials(rows)
      } else {
        setCredentials([])
      }
    } catch (err) {
      console.error('Gagal memuat data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Build school rows from credentials
  const schoolRows = useMemo((): SchoolRow[] => {
    const schoolMap = new Map<string, { count: number; games: Set<string>; teams: Set<string> }>()

    for (const c of credentials) {
      if (!c.sekolah) continue
      const existing = schoolMap.get(c.sekolah) || { count: 0, games: new Set<string>(), teams: new Set<string>() }
      existing.count++
      if (c.game) existing.games.add(c.game)
      if (c.tim) existing.teams.add(c.tim)
      schoolMap.set(c.sekolah, existing)
    }

    // Helper: normalize school name for fuzzy matching (strip A/B suffix, lowercase)
    function normalizeSchoolName(name: string): string {
      return name.trim().toLowerCase()
        .replace(/\s*[(\[]?\s*(?:tim\s*)?[a-c]\s*[)\]]?\s*$/i, '')
        .replace(/\s+/g, ' ')
    }

    const rows: SchoolRow[] = []
    for (const [schoolName, data] of schoolMap) {
      // Try exact match first, then normalized match
      let school = schools.find(s => s.name === schoolName)
      if (!school) {
        const norm = normalizeSchoolName(schoolName)
        school = schools.find(s => normalizeSchoolName(s.name) === norm)
      }
      if (!school) {
        // Last resort: find school whose name is contained in CSV name or vice versa
        const lower = schoolName.toLowerCase()
        school = schools.find(s => lower.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(lower))
      }
      if (!school) continue
      // Merge into existing row if same school ID (handles A/B team variants)
      const existing = rows.find(r => r.school.id === school!.id)
      if (existing) {
        existing.studentCount += data.count
        for (const g of data.games) existing.games.push(g)
        for (const t of data.teams) existing.teams.push(t)
        existing.games = [...new Set(existing.games)].sort()
        existing.teams = [...new Set(existing.teams)].sort()
      } else {
        rows.push({
          school,
          studentCount: data.count,
          games: Array.from(data.games).sort(),
          teams: Array.from(data.teams).sort(),
        })
      }
    }

    return rows.sort((a, b) => a.school.name.localeCompare(b.school.name))
  }, [credentials, schools])

  // Filter
  const filteredRows = useMemo(() => {
    let rows = schoolRows
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      rows = rows.filter(r => r.school.name.toLowerCase().includes(q))
    }
    return rows
  }, [schoolRows, searchQuery])

  const sentCount = schoolRows.filter(r => sentSchools.has(r.school.id)).length
  const totalPages = Math.ceil(filteredRows.length / perPage)
  const paginatedRows = filteredRows.slice((currentPage - 1) * perPage, currentPage * perPage)

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1) }, [searchQuery, filterTingkat, filterGame])

  async function handleDownloadPDF(schoolId: string, schoolName: string) {
    setDownloadingId(schoolId)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'
      const { getAccessToken } = await import('@/lib/api')
      const token = getAccessToken() ?? ''
      const res = await fetch(`${apiUrl}/admin/import/credentials/pdf?school_id=${schoolId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        alert('Gagal download PDF')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeName = schoolName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
      a.download = `Kredensial_${safeName}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Gagal download PDF')
    } finally {
      setDownloadingId(null)
    }
  }

  async function handleSendWA(row: SchoolRow) {
    if (!row.school.coach_phone) return
    setSendingId(row.school.id)
    // Open window immediately (in sync with user gesture) to avoid popup blocker
    const waWin = window.open('', '_blank')
    try {
      const { api: apiClient } = await import('@/lib/api')
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'

      const result = await apiClient.post<{ token: string; pin: string }>(
        '/admin/import/credentials/link',
        { school_id: row.school.id }
      )

      const downloadUrl = `${apiUrl}/public/credentials/${result.token}`
      const phone = formatPhoneForWA(row.school.coach_phone!)
      const message = buildWAMessage(row.school.name, downloadUrl, result.pin)
      const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      if (waWin) waWin.location.href = waUrl

      const newSent = new Set(sentSchools)
      newSent.add(row.school.id)
      setSentSchools(newSent)
      saveSentSchools(newSent)
    } catch {
      if (waWin) waWin.close()
      alert('Gagal generate link')
    } finally {
      setSendingId(null)
    }
  }

  async function handleResetPasswords(row: SchoolRow) {
    if (!confirm(`Reset semua password peserta dari ${row.school.name}?\n\nPassword lama tidak bisa digunakan lagi. PDF baru harus dikirim ulang ke pembina.`)) return
    setResettingId(row.school.id)
    try {
      const { api: apiClient } = await import('@/lib/api')
      const result = await apiClient.post<{ school: string; reset: number; skipped: number }>(
        '/admin/import/credentials/reset-school',
        { school_id: row.school.id }
      )
      alert(`Password berhasil direset untuk ${result.reset} peserta dari ${result.school}.\nSilakan download PDF ulang dan kirim ke pembina.`)
      // Mark as not-sent so admin knows to resend WA
      const newSent = new Set(sentSchools)
      newSent.delete(row.school.id)
      setSentSchools(newSent)
      saveSentSchools(newSent)
    } catch {
      alert('Gagal reset password')
    } finally {
      setResettingId(null)
    }
  }

  function resetSentStatus() {
    setSentSchools(new Set())
    localStorage.removeItem(WA_SENT_KEY)
  }

  return (
    <div className="rounded-xl border border-esi-border bg-white dark:bg-zinc-900 shadow-sm">
      {/* Header */}
      <div className="border-b border-esi-border p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-esi-text">
              <Users size={22} weight="bold" className="text-esi-red" />
              Distribusi Kredensial
            </h2>
            <p className="mt-1 text-sm text-esi-muted">
              Download PDF & kirim kredensial ke pembina via WhatsApp
            </p>
          </div>
          {sentCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={resetSentStatus}
              className="gap-1.5 border-esi-border text-esi-muted hover:bg-esi-bg"
            >
              <ArrowCounterClockwise size={14} />
              Reset Status
            </Button>
          )}
        </div>

        {/* Progress bar */}
        {schoolRows.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-esi-muted mb-1.5">
              <span>{sentCount}/{schoolRows.length} sekolah terkirim via WA</span>
              <span>{Math.round((sentCount / schoolRows.length) * 100)}%</span>
            </div>
            <div className="h-2 rounded-full bg-esi-bg overflow-hidden">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-300"
                style={{ width: `${schoolRows.length > 0 ? (sentCount / schoolRows.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Info */}
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 p-3">
          <Info size={16} weight="fill" className="mt-0.5 shrink-0 text-blue-600" />
          <p className="text-xs text-blue-800">
            Klik <strong>PDF</strong> untuk download kartu kredensial. Klik <strong>WA</strong> untuk kirim link download + PIN ke pembina sekolah. Pembina buka link, masukkan PIN, dan PDF otomatis terdownload.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-esi-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari sekolah..."
              className="w-full rounded-lg border border-esi-border bg-white dark:bg-zinc-900 py-2 pl-9 pr-3 text-sm text-esi-text placeholder:text-esi-muted focus:border-esi-red focus:outline-none focus:ring-1 focus:ring-esi-red/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <FunnelSimple size={16} className="text-esi-muted" />
            <select
              value={filterTingkat}
              onChange={(e) => setFilterTingkat(e.target.value)}
              className="rounded-lg border border-esi-border bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-esi-text focus:border-esi-red focus:outline-none"
            >
              <option value="">Semua Tingkat</option>
              <option value="SMP">SMP</option>
              <option value="SMA">SMA</option>
              <option value="SMK">SMK</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <LoadingSpinner size="md" />
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-lg border border-esi-border bg-esi-bg p-8 text-center">
            <Users size={32} className="mx-auto mb-2 text-stone-400 dark:text-zinc-500" />
            <p className="text-sm text-esi-muted">
              {credentials.length === 0 ? 'Belum ada data peserta. Import CSV terlebih dahulu.' : 'Tidak ada sekolah ditemukan.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-esi-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-800 text-white">
                <tr>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider w-10">#</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Sekolah</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-center w-20">Peserta</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Game</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-center w-20">Status</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-center w-40">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row, idx) => {
                  const isSent = sentSchools.has(row.school.id)
                  const hasPhone = !!row.school.coach_phone
                  const globalIdx = (currentPage - 1) * perPage + idx

                  return (
                    <tr
                      key={row.school.id}
                      className={`border-t border-esi-border transition-colors ${
                        isSent ? 'bg-green-50 dark:bg-green-950/30' : 'hover:bg-esi-bg/50'
                      }`}
                    >
                      <td className="px-4 py-3 text-xs text-esi-muted font-mono">{globalIdx + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-esi-text">{row.school.name}</p>
                        <p className="text-xs text-esi-muted mt-0.5">
                          {row.teams.length} tim
                          {hasPhone && (
                            <span className="ml-2 text-green-600">• {row.school.coach_phone}</span>
                          )}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center rounded-full bg-esi-red/10 px-2.5 py-0.5 text-xs font-semibold text-esi-red">
                          {row.studentCount}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {row.games.map(g => (
                            <span key={g} className="inline-flex rounded-md border border-esi-border bg-esi-bg px-1.5 py-0.5 text-[10px] font-medium text-esi-muted">
                              {g}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isSent ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                            <CheckCircle size={12} weight="fill" /> Terkirim
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-stone-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-stone-500 dark:text-zinc-400">
                            Belum
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleDownloadPDF(row.school.id, row.school.name)}
                            disabled={downloadingId === row.school.id}
                            className="inline-flex items-center gap-1 rounded-lg bg-esi-red px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-esi-red/90 disabled:opacity-50"
                            title="Download PDF"
                          >
                            {downloadingId === row.school.id ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <FilePdf size={14} weight="bold" />
                            )}
                            PDF
                          </button>

                          <button
                            onClick={() => handleResetPasswords(row)}
                            disabled={resettingId === row.school.id}
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
                            title="Reset semua password peserta sekolah ini"
                          >
                            {resettingId === row.school.id ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <LockKeyOpen size={14} weight="bold" />
                            )}
                            Reset PW
                          </button>

                          <button
                            onClick={() => handleSendWA(row)}
                            disabled={!hasPhone || sendingId === row.school.id}
                            className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-30 disabled:cursor-not-allowed"
                            title={hasPhone ? `Kirim ke ${row.school.coach_phone}` : 'Nomor WA pembina belum tersedia'}
                          >
                            {sendingId === row.school.id ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <WhatsappLogo size={14} weight="bold" />
                            )}
                            WA
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination + Footer */}
        {filteredRows.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-esi-muted">
              {filteredRows.length} sekolah • {filteredRows.reduce((sum, r) => sum + r.studentCount, 0)} peserta total
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-esi-border px-3 py-1.5 text-xs font-medium text-esi-muted transition-colors hover:bg-esi-bg disabled:opacity-30"
                >
                  Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, i, arr) => {
                    const showEllipsis = i > 0 && p - arr[i - 1] > 1
                    return (
                      <span key={p} className="flex items-center">
                        {showEllipsis && <span className="px-1 text-xs text-esi-muted">…</span>}
                        <button
                          onClick={() => setCurrentPage(p)}
                          className={`min-w-[32px] rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                            p === currentPage
                              ? 'bg-esi-red text-white'
                              : 'border border-esi-border text-esi-muted hover:bg-esi-bg'
                          }`}
                        >
                          {p}
                        </button>
                      </span>
                    )
                  })}

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-esi-border px-3 py-1.5 text-xs font-medium text-esi-muted transition-colors hover:bg-esi-bg disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
