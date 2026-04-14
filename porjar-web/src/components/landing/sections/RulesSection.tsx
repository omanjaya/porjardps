// Wiring: import RulesSection from '@/components/landing/sections/RulesSection'
// Usage:  <RulesSection games={games} /> (games optional; falls back to GAME_ICONS)
'use client'

import Link from 'next/link'
import { BookOpen, Download, ArrowRight } from '@phosphor-icons/react'
import { GAME_ICONS } from '../constants'

export type Game = { slug: string; name: string; iconName?: string }

interface RulesSectionProps {
  games?: Game[]
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function iconForGame(name: string) {
  const match = GAME_ICONS.find(g => g.name.toLowerCase() === name.toLowerCase())
  return match ?? GAME_ICONS[0]
}

export default function RulesSection({ games = [] }: RulesSectionProps) {
  const list: Game[] =
    games && games.length > 0
      ? games.slice(0, 5)
      : GAME_ICONS.map(g => ({ slug: slugify(g.name), name: g.name }))

  return (
    <section className="rules-section relative py-12 sm:py-16 lg:py-20 px-5 sm:px-6 lg:px-8 bg-esi-bg dark:bg-zinc-950">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-esi-fg dark:text-white mb-4">
            Peraturan Permainan
          </h2>
          <p className="text-sm sm:text-base text-esi-muted dark:text-zinc-400 max-w-2xl mx-auto">
            Pelajari aturan resmi setiap cabang sebelum bertanding
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-10">
          {list.map(game => {
            const meta = iconForGame(game.name)
            const Icon = meta.icon
            return (
              <Link
                key={game.slug}
                href={`/games/${game.slug}`}
                className="rule-card anim-card group relative flex flex-col items-center text-center p-6 rounded-2xl border border-esi-border dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-esi-accent hover:shadow-lg transition-all"
              >
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${meta.color}1a` }}
                >
                  <Icon size={36} weight="duotone" color={meta.color} />
                </div>
                <h3 className="text-base font-semibold text-esi-fg dark:text-white mb-3 line-clamp-2">
                  {game.name}
                </h3>
                <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-esi-accent group-hover:gap-2 transition-all">
                  Lihat Peraturan
                  <ArrowRight size={14} weight="bold" />
                </span>
              </Link>
            )
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Link
            href="/rules"
            className="rule-card anim-card group flex items-center gap-4 p-6 rounded-2xl border border-esi-border dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-esi-accent hover:shadow-lg transition-all"
          >
            <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-esi-accent/10 shrink-0">
              <BookOpen size={28} weight="duotone" className="text-esi-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-esi-fg dark:text-white">Rules Lengkap</h3>
              <p className="text-sm text-esi-muted dark:text-zinc-400">
                Baca seluruh peraturan turnamen ESI Denpasar
              </p>
            </div>
            <ArrowRight
              size={22}
              weight="bold"
              className="text-esi-accent group-hover:translate-x-1 transition-transform shrink-0"
            />
          </Link>

          <a
            href="/rules.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="rule-card anim-card group flex items-center gap-4 p-6 rounded-2xl border border-esi-border dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-esi-accent hover:shadow-lg transition-all"
          >
            <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-esi-accent/10 shrink-0">
              <Download size={28} weight="duotone" className="text-esi-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-esi-fg dark:text-white">Download Rules Book PDF</h3>
              <p className="text-sm text-esi-muted dark:text-zinc-400">
                Unduh buku peraturan resmi dalam format PDF
              </p>
            </div>
            <ArrowRight
              size={22}
              weight="bold"
              className="text-esi-accent group-hover:translate-x-1 transition-transform shrink-0"
            />
          </a>
        </div>
      </div>
    </section>
  )
}
