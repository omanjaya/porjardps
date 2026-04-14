import Link from 'next/link'
import { Compass, House, BookOpen, Trophy, Calendar, Ranking, UsersThree, Question } from '@phosphor-icons/react/dist/ssr'
import { LandingNavbar } from '@/components/landing/sections/LandingNavbar'
import { LandingFooter } from '@/components/landing/sections/LandingFooter'

const suggestions = [
  { href: '/tournaments', label: 'Turnamen', Icon: Trophy },
  { href: '/schedule', label: 'Jadwal', Icon: Calendar },
  { href: '/leaderboards', label: 'Leaderboard', Icon: Ranking },
  { href: '/teams', label: 'Tim', Icon: UsersThree },
  { href: '/#faq', label: 'FAQ', Icon: Question },
]

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-zinc-950">
      <LandingNavbar />
      <main className="flex-1 flex items-center justify-center px-5 sm:px-6 py-16 sm:py-24">
        <div className="w-full max-w-2xl text-center">
          <div className="inline-flex items-center justify-center mb-6 h-16 w-16 rounded-full bg-esi-red/10 text-esi-red">
            <Compass size={36} weight="duotone" />
          </div>
          <h1 className="text-7xl sm:text-8xl font-black tracking-tight text-esi-red leading-none">
            404
          </h1>
          <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-stone-900 dark:text-zinc-100">
            Halaman tidak ditemukan
          </h2>
          <p className="mt-3 text-base sm:text-lg text-stone-600 dark:text-zinc-400 max-w-lg mx-auto">
            Halaman yang kamu cari mungkin sudah dipindahkan atau tidak ada.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-esi-red px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-esi-red/90 focus:outline-none focus:ring-2 focus:ring-esi-red focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
            >
              <House size={18} weight="bold" />
              Kembali ke Beranda
            </Link>
            <Link
              href="/cara-bertanding"
              className="inline-flex items-center gap-2 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-5 py-3 text-sm font-semibold text-stone-900 dark:text-zinc-100 shadow-sm transition hover:bg-stone-100 dark:hover:bg-zinc-800"
            >
              <BookOpen size={18} weight="bold" />
              Lihat Cara Bertanding
            </Link>
          </div>

          <div className="mt-12">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-stone-400 dark:text-zinc-500 mb-4">
              Atau kunjungi halaman populer
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {suggestions.map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex flex-col items-center gap-2 rounded-lg border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-4 text-sm font-medium text-stone-700 dark:text-zinc-300 transition hover:border-esi-red/40 hover:text-esi-red dark:hover:text-esi-red"
                >
                  <Icon size={22} weight="duotone" className="text-stone-500 dark:text-zinc-500 group-hover:text-esi-red transition" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
      <LandingFooter events={[]} />
    </div>
  )
}
