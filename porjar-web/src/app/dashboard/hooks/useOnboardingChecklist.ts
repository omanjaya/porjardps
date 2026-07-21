'use client'

import { useEffect, useMemo, useState } from 'react'
import { UserCircle, Trophy, UsersThree, ClipboardText, Calendar, CheckCircle, type Icon } from '@phosphor-icons/react'
import { api } from '@/lib/api'
import type { Event } from '@/types'

const ONBOARDING_DISMISSED_KEY = 'porjar_onboarding_dismissed'
const ONBOARDING_EVENT_SELECTED = 'onboarding_event_selected'
const ONBOARDING_SCHEDULE_VIEWED = 'onboarding_schedule_viewed'

export interface OnboardingUser {
  needs_password_change?: boolean
  phone?: string | null
  full_name?: string
  nisn?: string | null
  // Optional future fields — checklist tolerates absence
  school_id?: string | null
  date_of_birth?: string | null
}

export interface OnboardingStep {
  key: string
  label: string
  done: boolean
  href: string
  icon: Icon
  cta?: string
  tooltip?: string
}

export function useOnboardingChecklist(
  user: OnboardingUser | null,
  hasTeam: boolean,
  opts: { activeEvent?: Event | null; teamRegistered?: boolean } = {}
) {
  const [dismissed, setDismissed] = useState(false)
  const [eventSelected, setEventSelected] = useState(false)
  const [scheduleViewed, setScheduleViewed] = useState(false)
  const [fetchedEvent, setFetchedEvent] = useState<Event | null>(null)

  useEffect(() => {
    setDismissed(localStorage.getItem(ONBOARDING_DISMISSED_KEY) === '1')
    setEventSelected(!!localStorage.getItem(ONBOARDING_EVENT_SELECTED))
    setScheduleViewed(!!localStorage.getItem(ONBOARDING_SCHEDULE_VIEWED))
  }, [])

  // Fetch active event if not provided via props
  useEffect(() => {
    if (opts.activeEvent !== undefined) return
    let cancelled = false
    api
      .get<Event[]>('/events')
      .then((events) => {
        if (cancelled) return
        const active =
          events.find((e) => e.status === 'ongoing') ||
          events.find((e) => e.status === 'published') ||
          events[0] ||
          null
        setFetchedEvent(active)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [opts.activeEvent])

  const activeEvent = opts.activeEvent ?? fetchedEvent
  const activeSlug = activeEvent?.slug ?? ''

  function handleDismiss() {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, '1')
    setDismissed(true)
  }

  function markEventSelected() {
    localStorage.setItem(ONBOARDING_EVENT_SELECTED, '1')
    setEventSelected(true)
  }

  const steps: OnboardingStep[] = useMemo(() => {
    if (!user) return []
    // Profile is "done" only when core identity fields are filled.
    // NISN is mandatory for member verification; full_name + phone are needed
    // so admins can contact the user. school_id is checked when present.
    const hasName = !!user.full_name && user.full_name.trim().length >= 2
    const hasNisn = !!user.nisn && user.nisn.trim().length > 0
    const hasSchoolOrPhone = !!user.school_id || !!user.phone
    const profileDone = hasNisn && hasName && hasSchoolOrPhone
    return [
      {
        key: 'account',
        label: 'Akun dibuat',
        done: true,
        href: '/dashboard',
        icon: CheckCircle,
      },
      {
        key: 'profile',
        label: 'Isi data profil (NISN, nama, sekolah)',
        done: profileDone,
        href: '/dashboard/profile',
        icon: UserCircle,
        cta: 'Lengkapi Profil',
      },
      {
        key: 'event',
        label: 'Pilih event aktif',
        done: eventSelected,
        href: activeSlug ? `/events/${activeSlug}` : '/events',
        icon: Trophy,
        cta: 'Masuk ke Event',
      },
      {
        key: 'team',
        label: 'Buat atau gabung tim',
        done: hasTeam,
        href: '/dashboard/teams/create',
        icon: UsersThree,
        cta: 'Buat Tim',
        tooltip: 'Atau minta kapten tim untuk mengundang kamu',
      },
      {
        key: 'registration',
        label: 'Registrasi tim ke event',
        done: !!opts.teamRegistered,
        href: activeSlug ? `/events/${activeSlug}/register` : '/events',
        icon: ClipboardText,
        cta: 'Registrasi Tim',
      },
      {
        key: 'schedule',
        label: 'Lihat jadwal pertandingan',
        done: scheduleViewed,
        href: activeSlug ? `/events/${activeSlug}/schedule` : '/schedule',
        icon: Calendar,
        cta: 'Lihat Jadwal',
      },
    ]
  }, [user, hasTeam, eventSelected, activeEvent, activeSlug, scheduleViewed, opts.teamRegistered])

  // All "required" steps = everything except schedule (informational)
  const requiredDone = steps
    .filter((s) => s.key !== 'schedule')
    .every((s) => s.done)

  const visible = !!user && !dismissed && !requiredDone
  const allDone = steps.every((s) => s.done)

  return {
    steps,
    visible,
    allDone,
    requiredDone,
    activeEvent,
    handleDismiss,
    markEventSelected,
  }
}
