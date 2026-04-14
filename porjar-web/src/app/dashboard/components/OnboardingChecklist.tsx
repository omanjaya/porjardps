'use client'

import Link from 'next/link'
import { X, CheckCircle, ArrowRight, Trophy, Circle } from '@phosphor-icons/react'
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

  // Find the first incomplete step index
  const currentStepIndex = steps.findIndex((s) => !s.done)

  // Progress indicator stats
  const doneCount = steps.filter((s) => s.done).length
  const totalCount = steps.length
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0

  return (
    <div
      className={`rounded-xl border shadow-sm ${
        isWelcome
          ? 'border-esi-red/30 bg-gradient-to-br from-esi-red/5 via-white to-blue-50/60 dark:from-esi-red/10 dark:via-zinc-900 dark:to-blue-950/20 p-5 sm:p-6 relative overflow-hidden'
          : 'border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-950/30 p-4'
      }`}
    >
      {/* Subtle decorative dots for welcome variant */}
      {isWelcome && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-esi-red/5" />
          <div className="absolute -left-2 bottom-8 h-16 w-16 rounded-full bg-blue-400/5" />
          <div className="absolute right-16 bottom-2 h-10 w-10 rounded-full bg-amber-400/5" />
        </div>
      )}

      <div className="relative flex items-start justify-between gap-3 mb-3">
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
          className="relative mb-4 flex items-center gap-3 rounded-lg border border-esi-red/20 bg-white dark:bg-zinc-900 p-3 transition-all hover:border-esi-red/40 hover:shadow-sm"
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

      {/* Progress indicator */}
      <div className="relative mb-4">
        <div className="flex justify-between text-xs text-stone-500 dark:text-zinc-400 mb-1">
          <span>Langkah {doneCount} dari {totalCount}</span>
          <span className="font-semibold text-esi-text">{Math.round(progress)}%</span>
        </div>
        <div
          className="h-2 bg-stone-200 dark:bg-zinc-800 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-esi-red transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="relative space-y-2">
        {steps.map((step, i) => {
          const StepIcon = step.icon
          const isCurrent = i === currentStepIndex
          return (
            <Link
              key={step.key}
              href={step.href}
              title={step.tooltip}
              className={`flex items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 transition-all ${
                step.done
                  ? 'border-l-green-500 bg-green-50/80 dark:bg-green-950/30 border-r border-t border-b border-r-green-200 border-t-green-200 border-b-green-200 dark:border-r-green-800/50 dark:border-t-green-800/50 dark:border-b-green-800/50'
                  : isCurrent
                    ? 'border-l-amber-500 bg-white dark:bg-zinc-900 border-r border-t border-b border-r-amber-200 border-t-amber-200 border-b-amber-200 dark:border-r-amber-800/50 dark:border-t-amber-800/50 dark:border-b-amber-800/50 hover:shadow-sm'
                    : 'border-l-stone-300 dark:border-l-zinc-600 bg-white dark:bg-zinc-900 border-r border-t border-b border-r-stone-200 border-t-stone-200 border-b-stone-200 dark:border-r-zinc-700 dark:border-t-zinc-700 dark:border-b-zinc-700 hover:border-l-stone-400 hover:shadow-sm'
              }`}
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  step.done
                    ? 'bg-green-100 dark:bg-green-900/40'
                    : isCurrent
                      ? 'bg-amber-100 dark:bg-amber-900/40'
                      : 'bg-stone-100 dark:bg-zinc-800'
                }`}
              >
                {step.done ? (
                  <CheckCircle size={16} weight="fill" className="text-green-600 dark:text-green-400" />
                ) : isCurrent ? (
                  <Circle size={14} weight="fill" className="text-amber-500" />
                ) : (
                  <Circle size={14} className="text-stone-400 dark:text-zinc-500" />
                )}
              </div>
              <span
                className={`flex-1 text-sm ${
                  step.done
                    ? 'text-green-700 dark:text-green-300 line-through'
                    : isCurrent
                      ? 'font-semibold text-esi-text'
                      : 'font-medium text-stone-500 dark:text-zinc-400'
                }`}
              >
                {step.label}
              </span>
              {!step.done && step.cta && (
                <span className="hidden sm:inline-flex px-3 py-1.5 rounded-lg bg-esi-red/10 text-esi-red text-xs font-semibold hover:bg-esi-red/20 transition-colors">
                  {step.cta}
                </span>
              )}
              {step.done ? (
                <CheckCircle size={16} weight="fill" className="text-green-500 sm:block hidden" />
              ) : (
                <ArrowRight size={14} className="text-stone-400 dark:text-zinc-500 sm:hidden" />
              )}
            </Link>
          )
        })}
      </div>

      <Link
        href="/cara-bertanding"
        className="mt-4 flex items-center gap-2 rounded-lg border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/50 px-3 py-2.5 text-xs font-semibold text-stone-600 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800 hover:text-esi-red dark:hover:text-esi-red transition-colors"
      >
        Masih bingung? Lihat Cara Bertanding <ArrowRight size={12} />
      </Link>
    </div>
  )
}
