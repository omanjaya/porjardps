'use client'

import { Phone } from '@phosphor-icons/react'
import { RED, LANDING_CONTACTS, type LandingContact } from '../constants'

interface ContactSectionProps {
  contacts?: LandingContact[]
}

export function ContactSection({ contacts }: ContactSectionProps) {
  const list = contacts && contacts.length > 0 ? contacts : LANDING_CONTACTS
  return (
    <section className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="rounded-xl border border-stone-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Phone size={18} weight="duotone" style={{ color: RED }} />
          <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700 dark:text-zinc-300">Contact Person</h3>
        </div>
        <div className="flex flex-wrap gap-3 sm:gap-6 text-sm text-stone-600 dark:text-zinc-400">
          {list.map((c) => (
            <div key={c.name}>
              <span className="font-bold text-stone-800 dark:text-zinc-200">{c.name}</span>
              {c.role ? <span className="ml-1 text-stone-500 dark:text-zinc-500">({c.role})</span> : null}
              {' · '}
              {c.phone}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
