'use client'

import { forwardRef, useState } from 'react'
import { Trophy, Users, Buildings, Medal, Lightning, Star, GameController, Question, CaretDown, Info } from '@phosphor-icons/react'
import { RED } from '../constants'
import type { LandingAboutItem, LandingFaq } from '../hooks/useLandingData'

const ICON_MAP: Record<string, any> = {
  trophy: Trophy,
  users: Users,
  buildings: Buildings,
  medal: Medal,
  lightning: Lightning,
  star: Star,
}
const getIcon = (name: string) => ICON_MAP[name?.toLowerCase()] ?? GameController

const DEFAULT_ITEMS: LandingAboutItem[] = [
  {
    icon: 'trophy',
    title: 'Kompetisi Resmi',
    description: 'Menyelenggarakan turnamen esport resmi bagi pelajar SD, SMP, dan SMA se-Kota Denpasar',
  },
  {
    icon: 'users',
    title: 'Pembinaan Atlet',
    description: 'Membina bakat esport pelajar melalui program pelatihan dan pendampingan yang terstruktur',
  },
  {
    icon: 'buildings',
    title: 'Kolaborasi',
    description: 'Bekerja sama dengan Dinas Pemuda dan Olahraga serta sekolah-sekolah di Kota Denpasar',
  },
]

const DEFAULT_FAQS: LandingFaq[] = [
  { question: 'Siapa yang boleh ikut?', answer: 'Pelajar SD/SMP/SMA se-Kota Denpasar dengan dokumen valid (NISN/kartu pelajar).' },
  { question: 'Cabang apa saja yang dipertandingkan?', answer: 'Mobile Legends, Free Fire, PUBG Mobile, eFootball, dan Honor of Kings.' },
  { question: 'Bagaimana cara mendaftar?', answer: 'Daftar akun, buat tim bersama anggota sekolahmu, lalu pilih event yang sedang membuka pendaftaran.' },
  { question: 'Berapa biaya pendaftaran?', answer: 'Gratis untuk semua peserta. Tidak ada biaya pendaftaran.' },
  { question: 'Hadiah apa yang didapat?', answer: 'Trofi, sertifikat, dan hadiah dari sponsor untuk para juara di setiap cabang.' },
  { question: 'Bagaimana jika bermasalah saat match?', answer: 'Hubungi admin via contact person yang tersedia di bagian bawah halaman.' },
]

interface AboutFaqSectionProps {
  aboutItems?: LandingAboutItem[]
  faqs?: LandingFaq[]
}

export const AboutFaqSection = forwardRef<HTMLElement, AboutFaqSectionProps>(function AboutFaqSection({ aboutItems, faqs }, ref) {
  const [tab, setTab] = useState<'a' | 'b'>('a')
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const items = aboutItems && aboutItems.length > 0 ? aboutItems : DEFAULT_ITEMS
  const faqItems = faqs && faqs.length > 0 ? faqs : DEFAULT_FAQS

  return (
    <section id="about" ref={ref} className="about-faq-section mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 scroll-mt-20">
      <div className="mb-8 sm:mb-10 text-center">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-stone-900 dark:text-zinc-100">Tentang ESI Denpasar</h2>
        <p className="mt-2 text-sm sm:text-base text-stone-500 dark:text-zinc-400 max-w-lg mx-auto">
          Esports Indonesia (ESI) Kota Denpasar merupakan organisasi resmi yang menaungi kegiatan esport di Kota Denpasar
        </p>
      </div>

      <div className="mb-6 flex justify-center">
        <div className="inline-flex rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1">
          <button
            onClick={() => setTab('a')}
            className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-bold transition ${
              tab === 'a'
                ? 'bg-esi-red text-white shadow-sm'
                : 'text-stone-600 dark:text-zinc-300 hover:text-esi-red'
            }`}
          >
            <Info size={14} weight="duotone" className="mr-1 inline" />
            Tentang Kami
          </button>
          <button
            onClick={() => setTab('b')}
            className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-bold transition ${
              tab === 'b'
                ? 'bg-esi-red text-white shadow-sm'
                : 'text-stone-600 dark:text-zinc-300 hover:text-esi-red'
            }`}
          >
            <Question size={14} weight="duotone" className="mr-1 inline" />
            FAQ
          </button>
        </div>
      </div>

      {tab === 'a' && (
        <div className="grid gap-6 sm:grid-cols-3">
          {items.map((item) => {
            const Icon = getIcon(item.icon)
            return (
              <div key={item.title} className="about-item anim-card rounded-2xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 text-center transition-all hover:shadow-md">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950">
                  <Icon size={24} weight="duotone" style={{ color: RED }} />
                </div>
                <h3 className="font-bold text-stone-900 dark:text-zinc-100">{item.title}</h3>
                <p className="mt-2 text-sm text-stone-500 dark:text-zinc-400">{item.description}</p>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'b' && (
        <div className="mx-auto max-w-3xl space-y-3">
          {faqItems.map((item, idx) => {
            const open = openFaq === idx
            return (
              <div key={item.question} className="faq-item anim-fade rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(open ? null : idx)}
                  className="flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-stone-50 dark:hover:bg-zinc-800/50"
                >
                  <span className="text-sm font-bold text-stone-900 dark:text-zinc-100">{item.question}</span>
                  <CaretDown size={16} className={`flex-shrink-0 text-stone-400 dark:text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                  <div className="px-4 pb-4 text-sm text-stone-600 dark:text-zinc-400">{item.answer}</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
})
