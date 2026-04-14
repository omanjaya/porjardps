'use client'

import { useState } from 'react'
import { Question, CaretDown } from '@phosphor-icons/react'
import { RED } from '../constants'
import type { LandingFaq } from '../hooks/useLandingData'

const FAQ_ITEMS: LandingFaq[] = [
  { question: 'Siapa yang boleh ikut?', answer: 'Pelajar SD/SMP/SMA se-Kota Denpasar dengan dokumen valid (NISN/kartu pelajar).' },
  { question: 'Cabang apa saja yang dipertandingkan?', answer: 'Mobile Legends, Free Fire, PUBG Mobile, eFootball, dan Honor of Kings.' },
  { question: 'Bagaimana cara mendaftar?', answer: 'Daftar akun, buat tim bersama anggota sekolahmu, lalu pilih event yang sedang membuka pendaftaran.' },
  { question: 'Berapa biaya pendaftaran?', answer: 'Gratis untuk semua peserta. Tidak ada biaya pendaftaran.' },
  { question: 'Hadiah apa yang didapat?', answer: 'Trofi, sertifikat, dan hadiah dari sponsor untuk para juara di setiap cabang.' },
  { question: 'Bagaimana jika bermasalah saat match?', answer: 'Hubungi admin via contact person yang tersedia di bagian bawah halaman.' },
]

interface FaqSectionProps {
  faqs?: LandingFaq[]
}

export function FaqSection({ faqs }: FaqSectionProps = {}) {
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const items = faqs && faqs.length > 0 ? faqs : FAQ_ITEMS
  return (
    <section className="faq-section mx-auto max-w-3xl px-5 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
      <div className="mb-8 sm:mb-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1 mb-2">
          <Question size={12} weight="duotone" style={{ color: RED }} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-stone-600 dark:text-zinc-300">FAQ</span>
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-stone-900 dark:text-zinc-100">Pertanyaan Umum</h2>
      </div>
      <div className="space-y-3">
        {items.map((item, idx) => {
          const open = openFaq === idx
          return (
            <div key={item.question} className="faq-item rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
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
    </section>
  )
}
