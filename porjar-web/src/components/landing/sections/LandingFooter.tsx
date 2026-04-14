'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Globe, EnvelopeSimple, InstagramLogo, Phone } from '@phosphor-icons/react'
import { FooterCredit } from '@/components/shared/FooterCredit'
import { LANDING_CONTACTS, type LandingContact } from '../constants'
import type { Event } from '@/types'

interface Props {
  events: Event[]
  contacts?: LandingContact[]
}

export function LandingFooter({ events, contacts }: Props) {
  const contactList = contacts && contacts.length > 0 ? contacts : LANDING_CONTACTS
  return (
    <footer className="footer-section border-t-2 border-stone-200 dark:border-zinc-700 bg-stone-100 dark:bg-zinc-900">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid gap-8 grid-cols-1 divide-y divide-stone-200 dark:divide-zinc-800 sm:divide-y-0 sm:grid-cols-2 lg:grid-cols-5">
          <div className="footer-col anim-fade lg:col-span-1">
            <div className="mb-3 flex items-center gap-2">
              <Image src="/images/logo/kota-denpasar.webp" alt="Kota Denpasar" width={32} height={32} className="h-8 w-8 object-contain" />
              <Image src="/images/logo/esi-denpasar.webp" alt="ESI Denpasar" width={32} height={32} className="h-8 w-8 object-contain" />
              <span className="ml-1 font-bold text-stone-900 dark:text-zinc-100">ESI Denpasar</span>
            </div>
            <p className="text-sm text-stone-600 dark:text-zinc-400">Platform resmi turnamen esport pelajar Kota Denpasar. Dikelola oleh ESI Kota Denpasar.</p>
          </div>
          <div className="footer-col anim-fade pt-4 sm:pt-0">
            <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-stone-400 dark:text-zinc-500"><span className="border-b-2 border-esi-red pb-1">Kompetisi</span></h4>
            <div className="flex flex-col gap-2 text-sm text-stone-500 dark:text-zinc-400">
              <Link href="/tournaments" className="transition hover:text-esi-red">Turnamen</Link>
              <Link href="/schedule" className="transition hover:text-esi-red">Jadwal</Link>
              <Link href="/leaderboards" className="transition hover:text-esi-red">Leaderboard</Link>
              <Link href="/matches/live" className="transition hover:text-esi-red">Bracket Live</Link>
              <Link href="/rundown" className="transition hover:text-esi-red">Rundown</Link>
            </div>
          </div>
          <div className="footer-col anim-fade">
            <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-stone-400 dark:text-zinc-500"><span className="border-b-2 border-esi-red pb-1">Informasi</span></h4>
            <div className="flex flex-col gap-2 text-sm text-stone-500 dark:text-zinc-400">
              <Link href="/games" className="transition hover:text-esi-red">Games</Link>
              <Link href="/rules" className="transition hover:text-esi-red">Rules</Link>
              <Link href="/gallery" className="transition hover:text-esi-red">Galeri</Link>
              <Link href="/achievements" className="transition hover:text-esi-red">Prestasi</Link>
            </div>
          </div>
          <div className="footer-col anim-fade">
            <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-stone-400 dark:text-zinc-500"><span className="border-b-2 border-esi-red pb-1">Komunitas</span></h4>
            <div className="flex flex-col gap-2 text-sm text-stone-500 dark:text-zinc-400">
              <Link href="/teams" className="transition hover:text-esi-red">Tim</Link>
              <Link href="/players" className="transition hover:text-esi-red">Pemain</Link>
              <Link href="/schools" className="transition hover:text-esi-red">Sekolah</Link>
              <Link href="/schools/standings" className="transition hover:text-esi-red">Klasemen Sekolah</Link>
            </div>
          </div>
          <div className="footer-col anim-fade">
            <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-stone-400 dark:text-zinc-500"><span className="border-b-2 border-esi-red pb-1">Event</span></h4>
            <div className="flex flex-col gap-2 text-sm text-stone-500 dark:text-zinc-400">
              <Link href="/events" className="transition hover:text-esi-red">Semua Event</Link>
              {events.slice(0, 4).map(e => (
                <Link key={e.id} href={`/events/${e.slug}`} className="transition hover:text-esi-red">{e.short_name || e.name}</Link>
              ))}
              <Link href="#about" className="transition hover:text-esi-red">Tentang</Link>
            </div>
          </div>
          <div className="footer-col anim-fade sm:col-span-2 lg:col-span-5 border-t border-stone-200 dark:border-zinc-800 pt-6">
            <div className="mb-2 flex items-center gap-2">
              <Phone size={14} weight="duotone" className="text-esi-red" />
              <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-stone-400 dark:text-zinc-500">Contact Person</h4>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-stone-600 dark:text-zinc-400">
              {contactList.map((c) => (
                <div key={c.name} className="rounded-lg bg-white dark:bg-zinc-800 p-3">
                  <span className="font-semibold text-stone-800 dark:text-zinc-200">{c.name}</span>
                  {c.role ? <span className="ml-1 text-stone-500 dark:text-zinc-500">({c.role})</span> : null}
                  {' · '}
                  {c.phone}
                </div>
              ))}
            </div>
          </div>
          <div className="footer-col anim-fade sm:col-span-2 lg:col-span-5 border-t border-stone-200 dark:border-zinc-800 pt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image src="/images/logo/esi-denpasar.webp" alt="ESI Denpasar" width={28} height={28} className="h-7 w-7 object-contain" />
              <div>
              <p className="text-sm font-semibold text-stone-700 dark:text-zinc-300">ESI Kota Denpasar</p>
              <p className="text-xs text-stone-500 dark:text-zinc-400">Dinas Pemuda dan Olahraga · Kota Denpasar, Bali</p>
              </div>
            </div>
            <h4 className="sr-only">Ikuti Kami</h4>
            <div className="flex gap-2">
              <a href="https://instagram.com/esi.denpasar" target="_blank" rel="noopener noreferrer" aria-label="Instagram ESI Denpasar" className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 dark:border-zinc-700 text-stone-400 dark:text-zinc-500 transition hover:border-pink-300 hover:bg-gradient-to-br hover:from-pink-500/10 hover:to-purple-500/10 hover:text-pink-500">
                <InstagramLogo size={16} />
              </a>
              <a href="mailto:info@esidenpasar.com" aria-label="Email ESI Denpasar" className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 dark:border-zinc-700 text-stone-400 dark:text-zinc-500 transition hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-500">
                <EnvelopeSimple size={16} />
              </a>
              <a href="https://esidenpasar.com" aria-label="Website ESI Denpasar" className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 dark:border-zinc-700 text-stone-400 dark:text-zinc-500 transition hover:border-green-300 hover:bg-green-50 dark:hover:bg-green-950/30 hover:text-green-500">
                <Globe size={16} />
              </a>
            </div>
          </div>
        </div>
        <div className="mt-10 pt-6 text-center text-[11px] text-stone-500 dark:text-zinc-500" style={{ borderTop: '1px solid transparent', borderImage: 'linear-gradient(to right, transparent, #d6d3d1, transparent) 1' }}>
          <p>&copy; 2026 ESI Kota Denpasar &middot; Platform Turnamen Esport Pelajar</p>
          <FooterCredit />
        </div>
      </div>
    </footer>
  )
}
