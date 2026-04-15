/**
 * Returns Indonesian relative time like "Baru saja", "5m lalu", "2j lalu", "3h lalu"
 */
export function relativeTime(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Baru saja'
  if (mins < 60) return `${mins}m lalu`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}j lalu`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}h lalu`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}bln lalu`
  return `${Math.floor(months / 12)}thn lalu`
}

/** Format a date for display: "6 Apr 2026" */
export function formatDateShort(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Format full date with weekday: "Senin, 6 April 2026" */
export function formatDateFull(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

/** Format long date without weekday: "6 April 2026" */
export function formatDateLong(iso: string | Date | null | undefined): string {
  if (!iso) return '-'
  try {
    const d = typeof iso === 'string' ? new Date(iso) : iso
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return String(iso)
  }
}

/** Format time: "14:30" */
export function formatTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

/** Format a date range: "6-10 Apr 2026" (same month) or "6 Apr - 3 Mei 2026" (different months) */
export function formatDateRange(start?: string | null, end?: string | null): string {
  if (!start) return ''
  const s = new Date(start)
  const e = end ? new Date(end) : null
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
  if (!e) return s.toLocaleDateString('id-ID', opts)
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()
  if (sameMonth) {
    return `${s.getDate()}-${e.getDate()} ${e.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}`
  }
  return `${s.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${e.toLocaleDateString('id-ID', opts)}`
}
