'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Upload,
  FileText,
  DownloadSimple,
  CheckCircle,
  WarningCircle,
  XCircle,
  X,
  Spinner,
  Users,
  FileCsv,
  Info,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { api, ApiError } from '@/lib/api'

// === Types ===

interface ImportResult {
  users_imported: number
  teams_created: number
  skipped: number
  errors: string[]
}

interface ParsedRow {
  [key: string]: string
}

interface RowValidation {
  valid: boolean
  errors: string[]
}

// === Helpers ===

const TEMPLATE_HEADERS = ['nama', 'nisn', 'tingkat', 'nomor_pertandingan', 'nama_tim', 'sekolah', 'role']

const COLUMN_DESCRIPTIONS: { col: string; required: boolean; desc: string }[] = [
  { col: 'nama', required: true, desc: 'Nama lengkap peserta' },
  { col: 'nisn', required: true, desc: 'NISN (10 digit) atau NIK (16 digit) \u2014 digunakan sebagai username & password awal' },
  { col: 'tingkat', required: true, desc: 'SMA / SMK / SMP' },
  { col: 'nomor_pertandingan', required: true, desc: 'ML Pria / ML Wanita / HOK / Free Fire / eFootball Solo / eFootball Duo' },
  { col: 'nama_tim', required: false, desc: 'Nama tim (jika kosong, otomatis dibuat dari sekolah)' },
  { col: 'sekolah', required: true, desc: 'Nama sekolah' },
  { col: 'role', required: true, desc: 'captain / player' },
]

function parseCSV(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.split('\n').filter((line) => line.trim() !== '')
  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
  const rows: ParsedRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
    const row: ParsedRow = {}
    headers.forEach((h, idx) => {
      row[h] = values[idx] || ''
    })
    rows.push(row)
  }

  return { headers, rows }
}

function validateRow(row: ParsedRow): RowValidation {
  const errors: string[] = []

  if (!row.nama?.trim()) errors.push('Nama wajib diisi')
  if (!row.nisn?.trim()) errors.push('NISN wajib diisi')
  else if (!/^\d{10,16}$/.test(row.nisn.trim())) errors.push('NISN/NIK harus 10\u201316 digit angka')
  if (!row.tingkat?.trim()) errors.push('Tingkat wajib diisi')
  else if (!['SMP', 'SMA', 'SMK'].includes(row.tingkat.trim().toUpperCase())) errors.push('Tingkat harus SMP/SMA/SMK')
  if (!row.sekolah?.trim()) errors.push('Sekolah wajib diisi')
  if (!row.nomor_pertandingan?.trim()) errors.push('Nomor pertandingan wajib diisi')
  if (!row.role?.trim()) errors.push('Role wajib diisi')
  else if (!['player', 'captain', 'substitute'].includes(row.role.trim().toLowerCase())) {
    errors.push('Role harus captain/player/substitute')
  }

  return { valid: errors.length === 0, errors }
}

function truncateText(text: string, maxLen: number): string {
  if (!text || text.length <= maxLen) return text
  return text.slice(0, maxLen) + '\u2026'
}

// === Component ===

export function ImportUploadSection() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<{ headers: string[]; rows: ParsedRow[] } | null>(null)
  const [validations, setValidations] = useState<RowValidation[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [showColumnInfo, setShowColumnInfo] = useState(false)

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith('.csv')) return
    setFile(f)
    setResult(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      setPreview(parsed)
      setValidations(parsed.rows.map((row) => validateRow(row)))
    }
    reader.readAsText(f)
  }, [])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  async function handleImport() {
    if (!file) return

    // If there are errors, confirm before proceeding
    if (invalidCount > 0) {
      if (allInvalid) return
      const confirmed = confirm(
        `Terdapat ${invalidCount} baris dengan error yang akan dilewati. Hanya ${validCount} baris valid yang akan diimport. Lanjutkan?`
      )
      if (!confirmed) return
    }

    setImporting(true)
    setResult(null)

    try {
      const data = await api.upload<ImportResult>('/admin/import/participants', file)
      setResult(data)
    } catch (err) {
      if (err instanceof ApiError) {
        setResult({ users_imported: 0, teams_created: 0, skipped: 0, errors: [err.message] })
      } else {
        setResult({ users_imported: 0, teams_created: 0, skipped: 0, errors: ['Gagal terhubung ke server'] })
      }
    } finally {
      setImporting(false)
    }
  }

  function downloadTemplate() {
    const sampleRows = [
      'I Made Dharma Putra,5171031503100002,SMA,ML Pria,SMAN 1 Denpasar A,SMAN 1 Denpasar,captain',
      'Ni Kadek Ayu Sari,5171045511070001,SMA,ML Wanita,SMAN 1 Denpasar Ladies,SMAN 1 Denpasar,captain',
      'Gede Wahyu Diaksa,5171032601090001,SMK,HOK,SMK Negeri 1 Denpasar,SMK Negeri 1 Denpasar,captain',
      'Arya Damar Wijaya,5171032703090004,SMK,HOK,SMK Negeri 1 Denpasar,SMK Negeri 1 Denpasar,player',
      'Putu Chesta Radithya,5171042103100001,SMA,eFootball Duo,SMAN 5 Denpasar A,SMAN 5 Denpasar,captain',
      'I Wayan Gilang Permana,5107072804090001,SMK,eFootball Solo,SMK Negeri 1 Denpasar,SMK Negeri 1 Denpasar,captain',
    ]
    const csv = TEMPLATE_HEADERS.join(',') + '\n' + sampleRows.join('\n') + '\n'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template_peserta_porjar.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function clearFile() {
    setFile(null)
    setPreview(null)
    setValidations([])
    setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const validCount = validations.filter((v) => v.valid).length
  const invalidCount = validations.filter((v) => !v.valid).length
  const allInvalid = validations.length > 0 && validCount === 0

  return (
    <div className="rounded-xl border border-porjar-border bg-white shadow-sm">
      <div className="border-b border-porjar-border p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-porjar-text">
              <FileCsv size={22} weight="bold" className="text-porjar-red" />
              Import Peserta (CSV)
            </h2>
            <p className="mt-1 text-sm text-porjar-muted">
              Upload file CSV dengan data peserta, tim, dan sekolah sekaligus
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={downloadTemplate}
            className="gap-1.5 border-porjar-border text-porjar-muted hover:bg-porjar-bg hover:text-porjar-text"
          >
            <DownloadSimple size={14} />
            Download Template
          </Button>
        </div>

        {/* Expected columns hint */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {TEMPLATE_HEADERS.map((h) => {
            const info = COLUMN_DESCRIPTIONS.find((c) => c.col === h)
            return (
              <span
                key={h}
                className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${
                  info?.required
                    ? 'border-porjar-red/20 bg-porjar-red/5 text-porjar-red'
                    : 'border-porjar-border bg-porjar-bg text-porjar-muted'
                }`}
              >
                {h}{info?.required ? '*' : ''}
              </span>
            )
          })}
          <button
            onClick={() => setShowColumnInfo((v) => !v)}
            className="ml-1 rounded-md p-0.5 text-porjar-muted transition-colors hover:text-porjar-text"
            title="Lihat keterangan kolom"
          >
            <Info size={14} weight="bold" />
          </button>
        </div>

        {/* Column descriptions table */}
        {showColumnInfo && (
          <div className="mt-3 overflow-hidden rounded-lg border border-porjar-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-porjar-bg">
                  <th className="px-3 py-2 text-left font-semibold text-porjar-text">Kolom</th>
                  <th className="px-3 py-2 text-center font-semibold text-porjar-text">Wajib</th>
                  <th className="px-3 py-2 text-left font-semibold text-porjar-text">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {COLUMN_DESCRIPTIONS.map((col) => (
                  <tr key={col.col} className="border-t border-porjar-border">
                    <td className="px-3 py-1.5">
                      <code className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px] font-mono text-porjar-red">
                        {col.col}
                      </code>
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      {col.required ? (
                        <span className="inline-flex items-center justify-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                          Ya
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-500">
                          Tidak
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-porjar-muted">{col.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Upload Area */}
        {!file && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-all ${
              dragOver
                ? 'border-porjar-red bg-red-50/50 shadow-inner'
                : 'border-porjar-border bg-porjar-bg hover:border-stone-400 hover:bg-stone-100'
            }`}
          >
            <div className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl transition-colors ${
              dragOver ? 'bg-porjar-red/10' : 'bg-stone-200/70'
            }`}>
              <FileCsv size={32} weight="duotone" className={dragOver ? 'text-porjar-red' : 'text-stone-400'} />
            </div>
            <p className="text-sm font-medium text-porjar-text">
              Drag & drop file CSV, atau <span className="text-porjar-red underline underline-offset-2">klik untuk browse</span>
            </p>
            <div className="mt-2 flex items-center justify-center gap-3 text-xs text-porjar-muted">
              <span className="inline-flex items-center gap-1 rounded-full border border-porjar-border bg-white px-2.5 py-0.5">
                Format: <strong>.csv</strong>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-porjar-border bg-white px-2.5 py-0.5">
                Maks: <strong>5 MB</strong>
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* File Info */}
        {file && (
          <div className="flex items-center gap-3 rounded-lg border border-porjar-border bg-porjar-bg p-3">
            <FileText size={20} className="text-blue-500" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-porjar-text">{file.name}</p>
              <div className="mt-0.5 flex items-center gap-3 text-xs">
                <span className="text-porjar-muted">
                  {preview?.rows.length ?? 0} baris data &middot; {(file.size / 1024).toFixed(1)} KB
                </span>
                {validations.length > 0 && (
                  <>
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle size={12} weight="fill" /> {validCount} valid
                    </span>
                    {invalidCount > 0 && (
                      <span className="flex items-center gap-1 text-red-600">
                        <XCircle size={12} weight="fill" /> {invalidCount} error
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
            <button
              onClick={clearFile}
              className="rounded-md p-1 text-porjar-muted transition-colors hover:bg-stone-200 hover:text-porjar-text"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Preview Table */}
        {preview && preview.rows.length > 0 && (
          <div className="max-h-80 overflow-auto rounded-lg border border-porjar-border">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-stone-800 text-white shadow-sm">
                <tr>
                  <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider">#</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider">Status</th>
                  {preview.headers.map((h) => (
                    <th key={h} className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 50).map((row, idx) => {
                  const validation = validations[idx]
                  const isValid = validation?.valid
                  return (
                    <tr
                      key={idx}
                      className={`border-t transition-colors ${
                        isValid
                          ? 'border-porjar-border bg-white hover:bg-green-50/30'
                          : 'border-red-200 bg-red-50/60 hover:bg-red-50'
                      }`}
                    >
                      <td className="px-3 py-1.5 font-mono text-porjar-muted">{idx + 1}</td>
                      <td className="px-3 py-1.5">
                        {isValid ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                            <CheckCircle size={12} weight="fill" />
                            OK
                          </span>
                        ) : (
                          <span
                            title={validation?.errors.join(', ')}
                            className="inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 cursor-help"
                          >
                            <XCircle size={12} weight="fill" />
                            Error
                          </span>
                        )}
                      </td>
                      {preview.headers.map((h) => (
                        <td
                          key={h}
                          className={`max-w-[180px] px-3 py-1.5 ${isValid ? 'text-porjar-text' : 'text-red-800'}`}
                          title={row[h] || undefined}
                        >
                          {row[h] ? (
                            <span className="block truncate">{truncateText(row[h], 30)}</span>
                          ) : (
                            <span className="text-stone-300">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {preview.rows.length > 50 && (
              <div className="bg-porjar-bg px-3 py-2 text-center text-xs text-porjar-muted">
                ... dan {preview.rows.length - 50} baris lainnya
              </div>
            )}
          </div>
        )}

        {/* Error details for invalid rows */}
        {validations.some((v) => !v.valid) && (
          <div className="max-h-40 overflow-auto rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-red-700">
              <WarningCircle size={14} weight="fill" />
              Detail Error ({invalidCount} baris):
            </p>
            <div className="space-y-1">
              {validations.map((v, i) =>
                !v.valid ? (
                  <p key={i} className="text-xs text-red-600">
                    <span className="font-medium">Baris {i + 1}:</span> {v.errors.join(', ')}
                  </p>
                ) : null
              )}
            </div>
          </div>
        )}

        {/* Import Button */}
        {file && !result && (
          <div className="flex items-center gap-3">
            <Button
              onClick={handleImport}
              disabled={importing || allInvalid}
              className={`gap-2 text-white ${
                allInvalid
                  ? 'bg-stone-400 cursor-not-allowed'
                  : 'bg-porjar-red hover:bg-porjar-red-dark'
              }`}
            >
              {importing ? (
                <>
                  <Spinner size={16} className="animate-spin" />
                  Mengimport...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Import {validCount} Data Valid
                </>
              )}
            </Button>
            {invalidCount > 0 && !allInvalid && (
              <p className="flex items-center gap-1.5 text-xs text-amber-600">
                <WarningCircle size={14} weight="fill" />
                {invalidCount} baris error akan dilewati
              </p>
            )}
            {allInvalid && (
              <p className="flex items-center gap-1.5 text-xs text-red-600">
                <XCircle size={14} weight="fill" />
                Semua baris mengandung error. Perbaiki CSV dan upload ulang.
              </p>
            )}
          </div>
        )}

        {/* Result Summary */}
        {result && (
          <div className="rounded-lg border border-porjar-border bg-porjar-bg p-5">
            <h3 className="mb-3 text-sm font-bold text-porjar-text">Hasil Import</h3>
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-green-500" />
                <span className="text-porjar-text">
                  <span className="font-bold text-green-600">{result.users_imported}</span> user diimport
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={18} className="text-blue-500" />
                <span className="text-porjar-text">
                  <span className="font-bold text-blue-600">{result.teams_created}</span> tim dibuat
                </span>
              </div>
              <div className="flex items-center gap-2">
                <WarningCircle size={18} className="text-amber-500" />
                <span className="text-porjar-text">
                  <span className="font-bold text-amber-600">{result.skipped}</span> dilewati
                </span>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="mt-3 max-h-32 overflow-auto">
                <p className="mb-1 text-xs font-medium text-red-600">Errors:</p>
                <div className="space-y-1">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-porjar-muted">{err}</p>
                  ))}
                </div>
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={clearFile}
              className="mt-4 border-porjar-border text-porjar-muted hover:bg-white"
            >
              Import Lagi
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
