'use client'

import { useState } from 'react'
import { Users, Trophy, Buildings, DownloadSimple, Spinner } from '@phosphor-icons/react'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { api } from '@/lib/api'

type ExportKey = 'participants' | 'teams' | 'schools'

type ExportCard = {
  key: ExportKey
  title: string
  description: string
  endpoint: string
  filename: string
  Icon: React.ComponentType<{ size?: number; weight?: 'regular' | 'bold' | 'fill' }>
}

const CARDS: ExportCard[] = [
  {
    key: 'participants',
    title: 'Peserta',
    description:
      'Semua pemain (role=player) dengan NISN, email, sekolah, nomor HP, dan tim.',
    endpoint: '/admin/export/participants.csv',
    filename: 'participants.csv',
    Icon: Users,
  },
  {
    key: 'teams',
    title: 'Tim',
    description:
      'Semua tim dengan game, sekolah, kapten, jumlah anggota, dan status.',
    endpoint: '/admin/export/teams.csv',
    filename: 'teams.csv',
    Icon: Trophy,
  },
  {
    key: 'schools',
    title: 'Sekolah',
    description:
      'Semua sekolah dengan level, alamat, nomor HP pelatih, dan jumlah tim.',
    endpoint: '/admin/export/schools.csv',
    filename: 'schools.csv',
    Icon: Buildings,
  },
]

export default function AdminExportPage() {
  const [loading, setLoading] = useState<ExportKey | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleDownload(card: ExportCard) {
    setError(null)
    setLoading(card.key)
    try {
      const blob = await api.getBlob(card.endpoint)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = card.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengunduh file'
      setError(`${card.title}: ${msg}`)
    } finally {
      setLoading(null)
    }
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Export Data"
        description="Download data peserta, tim, sekolah dalam format CSV"
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => {
          const isLoading = loading === card.key
          return (
            <div
              key={card.key}
              className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <card.Icon size={28} weight="bold" />
              </div>
              <h3 className="mb-1 text-lg font-semibold text-gray-900">
                {card.title}
              </h3>
              <p className="mb-4 flex-1 text-sm text-gray-600">
                {card.description}
              </p>
              <button
                type="button"
                onClick={() => handleDownload(card)}
                disabled={isLoading || loading !== null}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {isLoading ? (
                  <>
                    <Spinner size={18} className="animate-spin" />
                    Mengunduh...
                  </>
                ) : (
                  <>
                    <DownloadSimple size={18} weight="bold" />
                    Download CSV
                  </>
                )}
              </button>
            </div>
          )
        })}
      </div>

      <p className="mt-6 text-xs text-gray-500">
        File CSV menggunakan encoding UTF-8 dan dapat dibuka langsung di
        Microsoft Excel, Google Sheets, atau LibreOffice Calc.
      </p>
    </AdminLayout>
  )
}
