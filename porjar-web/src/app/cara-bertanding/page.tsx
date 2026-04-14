'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  UserCircle,
  UserPlus,
  IdentificationBadge,
  UsersThree,
  Trophy,
  CalendarCheck,
  CaretDown,
  DeviceMobile,
  GameController,
  FileText,
  WhatsappLogo,
  House,
  CaretRight,
  ArrowRight,
} from '@phosphor-icons/react'
import { PublicLayout } from '@/components/layouts/PublicLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { cn } from '@/lib/utils'
import type { Event } from '@/types'

interface ContactPerson {
  name: string
  role: string
  phone: string
}

const CONTACTS: ContactPerson[] = [
  { name: 'Bagus Eka', role: 'Ketua Panitia', phone: '6281237000000' },
  { name: 'Arik', role: 'Koordinator Peserta', phone: '6281237000001' },
  { name: 'Geni', role: 'Sekretariat', phone: '6281237000002' },
]

const FAQS: { q: string; a: string }[] = [
  { q: 'Berapa biaya pendaftaran?', a: 'Gratis.' },
  { q: 'Apakah harus satu sekolah?', a: 'Ya, semua anggota tim harus dari sekolah sama.' },
  {
    q: 'Bagaimana kalau saya tidak bisa bermain?',
    a: 'Minta kapten tim mencari pengganti atau laporkan ke panitia.',
  },
  { q: 'Apakah ada batas usia?', a: 'Sesuai jenjang sekolah (SD/SMP/SMA).' },
  {
    q: 'Di mana turnamennya?',
    a: 'Sesuai informasi event, biasanya offline di Denpasar + beberapa match online.',
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left font-semibold text-stone-800 dark:text-zinc-200 hover:bg-stone-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <span className="text-sm">{q}</span>
        <CaretDown
          size={16}
          className={cn(
            'shrink-0 text-stone-400 dark:text-zinc-500 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div className="border-t border-stone-200 dark:border-zinc-700 px-4 py-3 text-sm text-stone-600 dark:text-zinc-400">
          {a}
        </div>
      )}
    </div>
  )
}

interface Step {
  icon: React.ComponentType<{ size?: number; className?: string; weight?: 'fill' | 'duotone' | 'bold' }>
  title: string
  desc: string
  ctaLabel: string
  ctaHref: string
  authOnly?: boolean
}

export default function CaraBertandingPage() {
  const { isAuthenticated } = useAuthStore()
  const [activeSlug, setActiveSlug] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<Event[]>('/events')
      .then((events) => {
        if (!Array.isArray(events)) return
        const active = events.find((e) => e.registration_open) ?? events[0]
        if (active?.slug) setActiveSlug(active.slug)
      })
      .catch(() => setActiveSlug(null))
  }, [])

  const eventRegisterHref = activeSlug ? `/events/${activeSlug}/register` : '/events'
  const eventScheduleHref = activeSlug ? `/events/${activeSlug}/schedule` : '/schedule'

  const steps: Step[] = [
    {
      icon: UserPlus,
      title: 'Buat Akun',
      desc: 'Daftar akun di ESI Denpasar menggunakan email dan password. Gratis.',
      ctaLabel: 'Buat Akun Sekarang',
      ctaHref: '/register',
    },
    {
      icon: IdentificationBadge,
      title: 'Lengkapi Profil',
      desc: 'Setelah login, lengkapi data NISN, nama lengkap, dan sekolah di halaman Profil.',
      ctaLabel: 'Ke Profil',
      ctaHref: '/dashboard/profile',
      authOnly: true,
    },
    {
      icon: UsersThree,
      title: 'Buat Tim atau Gabung Tim',
      desc: 'Buat tim baru (kamu jadi kapten) atau minta kapten tim mengundang kamu. Setiap cabang punya jumlah pemain berbeda.',
      ctaLabel: 'Buat Tim',
      ctaHref: '/dashboard/teams/create',
    },
    {
      icon: Trophy,
      title: 'Registrasi Tim ke Event',
      desc: 'Pilih event aktif (ESI Denpasar 2026) dan daftarkan tim kamu. Tunggu verifikasi panitia.',
      ctaLabel: 'Lihat Event Aktif',
      ctaHref: eventRegisterHref,
    },
    {
      icon: CalendarCheck,
      title: 'Cek Jadwal & Siap Bertanding',
      desc: 'Cek jadwal pertandingan di halaman Jadwal. Hadir tepat waktu. Submit hasil match.',
      ctaLabel: 'Lihat Jadwal',
      ctaHref: eventScheduleHref,
    },
  ]

  const needs = [
    {
      emoji: '📱',
      title: 'Akun & Device',
      desc: 'Smartphone atau komputer yang kompatibel dengan game pilihan.',
    },
    {
      emoji: '🎮',
      title: 'Akun Game',
      desc: 'Mobile Legends ID, Free Fire UID, PUBG Mobile ID, dll sesuai cabang.',
    },
    {
      emoji: '📋',
      title: 'Dokumen',
      desc: 'NISN, kartu pelajar, dan surat izin orang tua/wali.',
    },
  ]

  return (
    <PublicLayout>
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-stone-500 dark:text-zinc-400">
        <Link href="/" className="flex items-center gap-1 hover:text-esi-red transition-colors">
          <House size={14} weight="fill" />
          Beranda
        </Link>
        <CaretRight size={12} />
        <span className="font-semibold text-stone-700 dark:text-zinc-300">Cara Bertanding</span>
      </nav>

      <PageHeader
        title="Cara Bertanding di ESI Denpasar"
        description="Panduan lengkap dari daftar akun hingga menang turnamen"
      />

      {/* Section 1: Siapa yang Boleh Ikut */}
      <section className="mb-10 rounded-2xl border border-esi-red/20 bg-gradient-to-br from-esi-red/5 via-white to-stone-50 dark:from-esi-red/10 dark:via-zinc-900 dark:to-zinc-950 p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-esi-red/10">
            <UserCircle size={28} weight="duotone" className="text-esi-red" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-zinc-100 mb-1">
              Siapa yang Boleh Ikut?
            </h2>
            <p className="text-sm text-stone-600 dark:text-zinc-400 leading-relaxed">
              Pelajar aktif SD, SMP, atau SMA/SMK se-Kota Denpasar dengan kartu pelajar/NISN valid.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: 5 Steps timeline */}
      <section className="mb-12">
        <h2 className="mb-6 text-xl font-bold text-stone-900 dark:text-zinc-100">
          5 Langkah Bertanding
        </h2>

        <ol className="relative space-y-5 border-l-2 border-dashed border-esi-red/30 pl-6 ml-3 sm:ml-4">
          {steps.map((step, i) => {
            const Icon = step.icon
            if (step.authOnly && !isAuthenticated) {
              // still show but without CTA
            }
            return (
              <li key={i} className="relative">
                <span
                  className="absolute -left-[37px] sm:-left-[41px] flex h-8 w-8 items-center justify-center rounded-full bg-esi-red text-white text-xs font-black shadow-md ring-4 ring-white dark:ring-zinc-950"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 sm:p-5 shadow-sm transition-all hover:border-esi-red/40 hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-esi-red/10">
                      <Icon size={22} weight="duotone" className="text-esi-red" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-zinc-100">
                        {step.title}
                      </h3>
                      <p className="mt-1 text-sm text-stone-600 dark:text-zinc-400 leading-relaxed">
                        {step.desc}
                      </p>
                      {(!step.authOnly || isAuthenticated) && (
                        <Link
                          href={step.ctaHref}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-esi-red px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:brightness-110"
                        >
                          {step.ctaLabel}
                          <ArrowRight size={12} weight="bold" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      {/* Section 3: Needs */}
      <section className="mb-12">
        <h2 className="mb-4 text-xl font-bold text-stone-900 dark:text-zinc-100">
          Apa yang Dibutuhkan?
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {needs.map((n) => (
            <div
              key={n.title}
              className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 shadow-sm"
            >
              <div className="text-3xl mb-2" aria-hidden>
                {n.emoji}
              </div>
              <h3 className="font-bold text-sm text-stone-900 dark:text-zinc-100 mb-1">
                {n.title}
              </h3>
              <p className="text-xs text-stone-600 dark:text-zinc-400 leading-relaxed">{n.desc}</p>
            </div>
          ))}
        </div>
        {/* Hidden icon imports for tree-shaking friendliness */}
        <div className="hidden">
          <DeviceMobile />
          <GameController />
          <FileText />
        </div>
      </section>

      {/* Section 4: FAQ */}
      <section className="mb-12">
        <h2 className="mb-4 text-xl font-bold text-stone-900 dark:text-zinc-100">FAQ Singkat</h2>
        <div className="space-y-2.5">
          {FAQS.map((f) => (
            <FaqItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </section>

      {/* Section 5: Help */}
      <section className="mb-10 rounded-2xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-bold text-stone-900 dark:text-zinc-100">Butuh Bantuan?</h2>
        <p className="mb-4 text-sm text-stone-600 dark:text-zinc-400">
          Hubungi panitia lewat kontak berikut:
        </p>
        <div className="space-y-2 mb-4">
          {CONTACTS.map((c) => (
            <div
              key={c.phone}
              className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/50 px-4 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-stone-900 dark:text-zinc-100 truncate">
                  {c.name}
                </p>
                <p className="text-xs text-stone-500 dark:text-zinc-400">{c.role}</p>
              </div>
              <a
                href={`https://wa.me/${c.phone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 transition-colors"
              >
                <WhatsappLogo size={14} weight="fill" />
                WhatsApp
              </a>
            </div>
          ))}
        </div>
        <p className="text-xs text-stone-500 dark:text-zinc-400">
          Kontak lengkap tersedia di footer halaman.
        </p>
      </section>
    </PublicLayout>
  )
}
