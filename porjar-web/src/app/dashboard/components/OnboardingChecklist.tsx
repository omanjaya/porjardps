'use client'

import Link from 'next/link'
import { X, CheckCircle, ArrowRight, Trophy } from '@phosphor-icons/react'
import { useOnboardingChecklist, type OnboardingUser } from '../hooks/useOnboardingChecklist'
import type { Event } from '@/types'

interface OnboardingChecklistProps {
  user: OnboardingUser | null
  hasTeam: boolean
  activeEvent?: Event | null
  teamRegistered?: boolean
  variant?: 'default' | 'welcome'
}

export function OnboardingChecklist({
  user,
  hasTeam,
  activeEvent,
  teamRegistered,
  variant = 'default',
}: OnboardingChecklistProps) {
  const {
    steps,
    visible,
    activeEvent: resolvedEvent,
    handleDismiss,
  } = useOnboardingChecklist(user, hasTeam, { activeEvent, teamRegistered })

  if (!visible) return null

  const isWelcome = variant === 'welcome'
  const event = activeEvent ?? resolvedEvent

  return (
    <div
      className={`rounded-xl border shadow-sm ${
        isWelcome
          ? 'border-esi-red/30 bg-gradient-to-br from-esi-red/5 via-white to-blue-50/60 dark:from-esi-red/10 dark:via-zinc-900 dark:to-blue-950/20 p-5 sm:p-6'
          : 'border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-950/30 p-4'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          {isWelcome ? (
            <>
              <h2 className="text-lg sm:text-xl font-bold text-esi-text">
                Selamat datang di ESI Denpasar!
              </h2>
              <p className="mt-1 text-sm text-esi-muted">
                Yuk mulai dari sini supaya siap ikut turnamen.
              </p>
            </>
          ) : (
            <h2 className="flex items-center gap-2 text-sm font-bold text-esi-text">
              <CheckCircle size={18} weight="bold" className="text-blue-600" />
              Langkah Awal
            </h2>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-md p-1 text-stone-400 dark:text-zinc-500 hover:bg-stone-200 dark:hover:bg-zinc-700 hover:text-stone-600 dark:hover:text-zinc-300 transition-colors"
          aria-label="Tutup checklist"
          title="Sembunyikan"
        >
          <X size={16} />
        </button>
      </div>

      {/* Active event card */}
      {isWelcome && event && (
        <Link
          href={`/events/${event.slug}`}
          className="mb-4 flex items-center gap-3 rounded-lg border border-esi-red/20 bg-white dark:bg-zinc-900 p-3 transition-all hover:border-esi-red/40 hover:shadow-sm"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-esi-red/10">
            <Trophy size={20} weight="duotone" className="text-esi-red" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-esi-red">
              Event Aktif
            </p>
            <p className="truncate text-sm font-bold text-esi-text">{event.name}</p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-esi-red px-3 py-1.5 text-xs font-semibold text-white">
            Masuk ke Event <ArrowRight size={12} />
          </span>
        </Link>
      )}

      <div className="space-y-2">
        {steps.map((step) => {
          const StepIcon = step.icon
          return (
            <Link
              key={step.key}
              href={step.href}
              title={step.tooltip}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${
                step.done
                  ? 'bg-green-50/80 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50'
                  : 'bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
              }`}
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  step.done ? 'bg-green-100' : 'bg-blue-100'
                }`}
              >
                {step.done ? (
                  <CheckCircle size={16} weight="fill" className="text-green-600" />
                ) : (
                  <StepIcon size={14} className="text-blue-600" />
                )}
              </div>
              <span
                className={`flex-1 text-sm ${
                  step.done
                    ? 'text-green-700 dark:text-green-300 line-through'
                    : 'font-medium text-esi-text'
                }`}
              >
                {step.label}
              </span>
              {!step.done && step.cta && (
                <span className="hidden sm:inline text-xs font-semibold text-blue-600">
                  {step.cta}
                </span>
              )}
              {step.done ? (
                <CheckCircle size={16} weight="fill" className="text-green-500" />
              ) : (
                <ArrowRight size={14} className="text-blue-500" />
              )}
            </Link>
          )
        })}
      </div>

      <Link
        href="/cara-bertanding"
        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
      >
        Masih bingung? Lihat Cara Bertanding <ArrowRight size={12} />
      </Link>
    </div>
  )
}
