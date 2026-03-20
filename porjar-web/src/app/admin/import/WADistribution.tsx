'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/store/auth-store'
import {
  WhatsappLogo,
  PaperPlaneTilt,
  CheckCircle,
  MagnifyingGlass,
  FunnelSimple,
  ArrowCounterClockwise,
  Users,
  Phone,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

interface SchoolData {
  id: string
  name: string
  level: string
  coach_phone: string | null
}

interface CredentialRow {
  nama: string
  nisn: string
  password_default: string
  sekolah: string
  tim: string
  game: string
  tingkat: string
}

const STORAGE_KEY = 'porjar_wa_sent_schools'

function getSentSchools(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return new Set(JSON.parse(raw))
  } catch {
    // ignore
  }
  return new Set()
}

function saveSentSchools(sent: Set<string>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(sent)))
}

function formatPhoneForWA(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1)
  }
  if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned
  }
  return cleaned
}

function buildWAMessage(schoolName: string, downloadUrl: string, pin: string): string {
  return `Yth. Pembina/Pelatih
*${schoolName}*

Berikut kartu kredensial peserta PORJAR ESPORT 2026 dari sekolah Anda:

📥 *Download Kartu Kredensial:*
${downloadUrl}

🔑 *PIN Download:* ${pin}

Buka link di atas, masukkan PIN, lalu kartu kredensial akan otomatis terdownload.

Kartu berisi NISN dan password untuk login di porjar.esidenpasar.id
Mohon distribusikan ke seluruh peserta tim.

_Link & PIN berlaku 7 hari._

Terima kasih,
Panitia PORJAR ESPORT 2026`
}

export function WADistribution() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [schools, setSchools] = useState<SchoolData[]>([])
  const [credentials, setCredentials] = useState<CredentialRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sentSchools, setSentSchools] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'sent' | 'unsent'>('all')

  useEffect(() => {
    setSentSchools(getSentSchools())
  }, [])

  useEffect(() => {
    if (!isAuthenticated || authLoading) return
    loadData()
  }, [isAuthenticated, authLoading])

  async function loadData() {
    setIsLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'
      const { getAccessToken } = await import('@/lib/api')
      const token = getAccessToken() ?? ''

      const [schoolsRes, credsRes] = await Promise.all([
        fetch(`${apiUrl}/schools?limit=200`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiUrl}/admin/import/credentials`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      // Parse schools
      const schoolsBody = await schoolsRes.json()
      const schoolItems = schoolsBody.data ?? schoolsBody ?? []
      if (Array.isArray(schoolItems)) {
        setSchools(
          schoolItems.map((s: SchoolData) => ({
            id: s.id,
            name: s.name,
            level: s.level,
            coach_phone: s.coach_phone,
          }))
        )
      }

      // Parse credentials CSV
      const csvText = await credsRes.text()
      const lines = csvText.trim().split('\n')
      if (lines.length > 1) {
        const headers = lines[0].split(',')
        const rows: CredentialRow[] = lines.slice(1).map((line) => {
          const vals = line.split(',')
          const obj: Record<string, string> = {}
          headers.forEach((h, i) => {
            obj[h.trim()] = (vals[i] ?? '').trim()
          })
          return obj as unknown as CredentialRow
        })
        setCredentials(rows)
      }
    } catch (err) {
      console.error('Gagal memuat data distribusi WA:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Count students per school
  const studentCountBySchool = useMemo(() => {
    const map = new Map<string, number>()
    credentials.forEach((c) => {
      map.set(c.sekolah, (map.get(c.sekolah) || 0) + 1)
    })
    return map
  }, [credentials])

  // Only show schools that have credentials
  const schoolsWithCredentials = useMemo(() => {
    const schoolNamesWithCreds = new Set(credentials.map((c) => c.sekolah))
    return schools.filter((s) => schoolNamesWithCreds.has(s.name))
  }, [schools, credentials])

  // Filter schools
  const filteredSchools = useMemo(() => {
    return schoolsWithCredentials.filter((school) => {
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!school.name.toLowerCase().includes(q)) return false
      }
      // Status filter
      if (filterStatus === 'sent' && !sentSchools.has(school.id)) return false
      if (filterStatus === 'unsent' && sentSchools.has(school.id)) return false
      return true
    })
  }, [schoolsWithCredentials, searchQuery, filterStatus, sentSchools])

  const sentCount = schoolsWithCredentials.filter((s) => sentSchools.has(s.id)).length
  const totalCount = schoolsWithCredentials.length

  const [sendingSchoolId, setSendingSchoolId] = useState<string | null>(null)

  async function handleSendWA(school: SchoolData) {
    if (!school.coach_phone) return
    setSendingSchoolId(school.id)
    try {
      const { api: apiClient } = await import('@/lib/api')
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'

      // Generate credential download link
      const result = await apiClient.post<{ token: string; pin: string; url: string; expires_in: number }>(
        '/admin/import/credentials/link',
        { school_id: school.id }
      )

      const downloadUrl = `${apiUrl}/public/credentials/${result.token}`

      const phone = formatPhoneForWA(school.coach_phone)
      const message = buildWAMessage(school.name, downloadUrl, result.pin)
      const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      window.open(waUrl, '_blank')

      // Mark as sent
      const newSent = new Set(sentSchools)
      newSent.add(school.id)
      setSentSchools(newSent)
      saveSentSchools(newSent)
    } catch (err) {
      console.error('Gagal mengirim via WA:', err)
      alert('Gagal generate link kredensial. Silakan coba lagi.')
    } finally {
      setSendingSchoolId(null)
    }
  }

  function handleResetAll() {
    if (!confirm('Reset semua status pengiriman? Data status akan dihapus dari browser ini.'))
      return
    const newSent = new Set<string>()
    setSentSchools(newSent)
    saveSentSchools(newSent)
  }

  function handleToggleSent(schoolId: string) {
    const newSent = new Set(sentSchools)
    if (newSent.has(schoolId)) {
      newSent.delete(schoolId)
    } else {
      newSent.add(schoolId)
    }
    setSentSchools(newSent)
    saveSentSchools(newSent)
  }

  return (
    <div className="rounded-xl border border-porjar-border bg-white shadow-sm">
      <div className="border-b border-porjar-border p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold text-porjar-text">
          <WhatsappLogo size={22} weight="bold" className="text-green-600" />
          Distribusi via WhatsApp
        </h2>
        <p className="mt-1 text-sm text-porjar-muted">
          Kirim pesan kredensial ke pembina/pelatih sekolah via WhatsApp
        </p>
      </div>

      <div className="p-5 space-y-4">
        {/* Stats Bar */}
        <div className="flex items-center justify-between rounded-lg border border-porjar-border bg-porjar-bg px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="font-bold text-porjar-text">{sentCount}</span>
              <span className="text-porjar-muted">/{totalCount} sekolah terkirim</span>
            </div>
            <div className="h-2 w-40 overflow-hidden rounded-full bg-stone-200">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-300"
                style={{ width: totalCount > 0 ? `${(sentCount / totalCount) * 100}%` : '0%' }}
              />
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleResetAll}
            className="gap-1.5 border-porjar-border text-porjar-muted hover:bg-white"
          >
            <ArrowCounterClockwise size={14} />
            Reset Status
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <MagnifyingGlass
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-porjar-muted"
            />
            <input
              type="text"
              placeholder="Cari sekolah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-porjar-border bg-white py-1.5 pl-9 pr-3 text-sm text-porjar-text placeholder:text-stone-400 focus:border-porjar-red focus:outline-none focus:ring-1 focus:ring-porjar-red/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <FunnelSimple size={16} className="text-porjar-muted" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'sent' | 'unsent')}
              className="rounded-lg border border-porjar-border bg-white px-3 py-1.5 text-sm text-porjar-text focus:border-porjar-red focus:outline-none focus:ring-1 focus:ring-porjar-red/20"
            >
              <option value="all">Semua Status</option>
              <option value="unsent">Belum Dikirim</option>
              <option value="sent">Sudah Dikirim</option>
            </select>
          </div>
        </div>

        {/* School Cards Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <LoadingSpinner size="md" />
          </div>
        ) : filteredSchools.length === 0 ? (
          <div className="rounded-lg border border-porjar-border bg-porjar-bg p-8 text-center">
            <WhatsappLogo size={32} className="mx-auto mb-2 text-stone-400" />
            <p className="text-sm text-porjar-muted">
              {schoolsWithCredentials.length === 0
                ? 'Belum ada sekolah dengan kredensial. Import peserta terlebih dahulu.'
                : 'Tidak ada sekolah yang cocok dengan filter.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSchools.map((school) => {
              const isSent = sentSchools.has(school.id)
              const studentCount = studentCountBySchool.get(school.name) || 0
              const hasPhone = !!school.coach_phone

              return (
                <div
                  key={school.id}
                  className={`relative rounded-lg border p-3.5 transition-colors ${
                    isSent
                      ? 'border-green-200 bg-green-50/50'
                      : 'border-porjar-border bg-white hover:border-porjar-red/20'
                  }`}
                >
                  {/* Status indicator */}
                  <div className="mb-2 flex items-center justify-between">
                    <button
                      onClick={() => handleToggleSent(school.id)}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                        isSent
                          ? 'border border-green-200 bg-green-100 text-green-700 hover:bg-green-200'
                          : 'border border-stone-200 bg-stone-100 text-stone-500 hover:bg-stone-200'
                      }`}
                      title={isSent ? 'Klik untuk tandai belum dikirim' : 'Klik untuk tandai sudah dikirim'}
                    >
                      {isSent ? (
                        <>
                          <CheckCircle size={12} weight="fill" />
                          Sudah dikirim
                        </>
                      ) : (
                        'Belum dikirim'
                      )}
                    </button>
                    <span className="inline-flex items-center gap-1 text-[10px] text-porjar-muted">
                      <Users size={12} />
                      {studentCount} peserta
                    </span>
                  </div>

                  {/* School name */}
                  <p className="mb-1.5 truncate text-sm font-semibold text-porjar-text" title={school.name}>
                    {school.name}
                  </p>

                  {/* Phone */}
                  <div className="mb-3 flex items-center gap-1.5 text-xs text-porjar-muted">
                    <Phone size={13} />
                    {hasPhone ? (
                      <span className="font-mono">{school.coach_phone}</span>
                    ) : (
                      <span className="italic text-stone-400">Belum ada nomor</span>
                    )}
                  </div>

                  {/* Send button */}
                  <button
                    onClick={() => handleSendWA(school)}
                    disabled={!hasPhone || sendingSchoolId === school.id}
                    className={`flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                      hasPhone && sendingSchoolId !== school.id
                        ? 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800'
                        : 'cursor-not-allowed bg-stone-100 text-stone-400'
                    }`}
                  >
                    {sendingSchoolId === school.id ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Generating link...
                      </>
                    ) : hasPhone ? (
                      <>
                        <PaperPlaneTilt size={14} weight="bold" />
                        Kirim via WA
                      </>
                    ) : (
                      <>
                        <WhatsappLogo size={14} />
                        No. HP belum diisi
                      </>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Info */}
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3.5">
          <PaperPlaneTilt size={18} weight="fill" className="mt-0.5 shrink-0 text-amber-600" />
          <div className="text-xs text-amber-800">
            <p className="font-semibold">Cara pengiriman:</p>
            <ol className="mt-1 list-inside list-decimal space-y-0.5">
              <li>Klik tombol &quot;Kirim via WA&quot; untuk generate link download &amp; membuka WhatsApp</li>
              <li>Pesan otomatis sudah terisi dengan link download PDF kredensial</li>
              <li>Pembina/pelatih cukup klik link untuk download PDF (tanpa login)</li>
              <li>Link berlaku 7 hari sejak dibuat</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
