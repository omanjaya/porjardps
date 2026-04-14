export type RundownLevel = 'SD' | 'SMP' | 'SMA' | 'SMP & SMA' | 'ALL' | null
export type RundownEventType = 'registration' | 'opening' | 'competition' | 'break' | 'ceremony'

export interface RundownEvent {
  time: string
  title: string
  level: RundownLevel
  arena: string | null
  type: RundownEventType
  game?: string
  matchNo?: number
}

export interface RundownDay {
  dateLabel: string
  shortLabel: string
  dateISO: string
  events: RundownEvent[]
}

function buildDay(
  dateLabel: string,
  shortLabel: string,
  dateISO: string,
  rawEvents: Omit<RundownEvent, 'matchNo'>[],
): RundownDay {
  let matchCounter = 0
  return {
    dateLabel,
    shortLabel,
    dateISO,
    events: rawEvents.map(ev =>
      ev.type === 'competition'
        ? { ...ev, matchNo: ++matchCounter }
        : ev,
    ),
  }
}

export const RUNDOWN_DAYS: RundownDay[] = [
  buildDay('KAMIS, 26 MARET 2026', 'Kam 26/3', '2026-03-26', [
    { time: '08.00 – 09.00', title: 'Registrasi Peserta ML', level: 'SMP', arena: null, type: 'registration' },
    { time: '09.00 – 09.30', title: 'Pembukaan / Opening Ceremony', level: null, arena: null, type: 'opening' },
    { time: '10.00 – 14.00', title: 'Mobile Legends Kualifikasi SMP Laki-Laki', level: 'SMP', arena: '1 & 2', type: 'competition', game: 'MLBB' },
    { time: '12.00 – 12.30', title: 'Break', level: null, arena: null, type: 'break' },
    { time: '13.00 – 14.00', title: 'Registrasi PUBGM', level: 'SMP', arena: null, type: 'registration' },
    { time: '14.00 – 17.00', title: 'Mobile Legends 16 Besar – Semi Final SMP Laki-Laki', level: 'SMP', arena: '1', type: 'competition', game: 'MLBB' },
    { time: '14.30 – 18.00', title: 'Final PUBGM SMP', level: 'SMP', arena: '2', type: 'competition', game: 'PUBGM' },
  ]),

  buildDay('JUMAT, 27 MARET 2026', 'Jum 27/3', '2026-03-27', [
    { time: '08.00 – 09.00', title: 'Registrasi Peserta FF & HOK', level: 'SMP', arena: null, type: 'registration' },
    { time: '09.00 – 09.30', title: 'Pembukaan', level: null, arena: null, type: 'opening' },
    { time: '09.30 – 12.30', title: 'Final Free Fire SMP Ladies', level: 'SMP', arena: '1', type: 'competition', game: 'FF' },
    { time: '09.30 – 17.00', title: 'HOK Kualifikasi SMP & SMA', level: 'SMP & SMA', arena: '2', type: 'competition', game: 'HOK' },
    { time: '12.00 – 12.30', title: 'Break', level: null, arena: null, type: 'break' },
    { time: '12.00 – 12.30', title: 'Registrasi Peserta FF (Pot 1–2)', level: 'SMP', arena: null, type: 'registration' },
    { time: '13.00 – 15.00', title: 'Free Fire Kualifikasi Pot 1–2 SMP Laki-Laki', level: 'SMP', arena: '1', type: 'competition', game: 'FF' },
    { time: '15.30 – 16.00', title: 'Registrasi Peserta FF & EFO', level: 'SMP', arena: null, type: 'registration' },
    { time: '16.00 – 18.00', title: 'Free Fire Kualifikasi Pot 3–6 SMP Laki-Laki', level: 'SMP', arena: '1 & 2', type: 'competition', game: 'FF' },
    { time: '16.10 – 18.10', title: 'Final & Bronze eFootball Solo & Duo SMP', level: 'SMP', arena: null, type: 'competition', game: 'EFO' },
  ]),

  buildDay('SABTU, 28 MARET 2026', 'Sab 28/3', '2026-03-28', [
    { time: '08.00 – 09.00', title: 'Registrasi Peserta ML & HOK', level: 'SMP', arena: null, type: 'registration' },
    { time: '09.00 – 09.30', title: 'Pembukaan', level: null, arena: null, type: 'opening' },
    { time: '09.30 – 12.50', title: 'HOK Bronze & Final SMP & SMA', level: 'SMP & SMA', arena: '2', type: 'competition', game: 'HOK' },
    { time: '09.30 – 14.10', title: 'Mobile Legends Kualifikasi – Final SMP Ladies', level: 'SMP', arena: '1', type: 'competition', game: 'MLBB' },
    { time: '12.00 – 13.00', title: 'Registrasi Peserta FF', level: 'SMP', arena: null, type: 'registration' },
    { time: '12.50 – 13.20', title: 'Break', level: null, arena: null, type: 'break' },
    { time: '14.10 – 16.10', title: 'Free Fire Semi Final SMP Laki-Laki', level: 'SMP', arena: '1 & 2', type: 'competition', game: 'FF' },
    { time: '15.00 – 16.00', title: 'Registrasi Peserta ML', level: 'SMP', arena: null, type: 'registration' },
    { time: '16.20 – 18.00', title: 'Mobile Legends Final & Bronze SMP Laki-Laki', level: 'SMP', arena: '1', type: 'competition', game: 'MLBB' },
    { time: '16.20 – 19.40', title: 'Free Fire Final SMP Laki-Laki', level: 'SMP', arena: '2', type: 'competition', game: 'FF' },
  ]),

  buildDay('MINGGU, 29 MARET 2026', 'Min 29/3', '2026-03-29', [
    { time: '08.00 – 09.00', title: 'Registrasi Peserta ML', level: 'SMA', arena: null, type: 'registration' },
    { time: '09.00 – 09.30', title: 'Pembukaan', level: null, arena: null, type: 'opening' },
    { time: '09.30 – 11.30', title: 'Mobile Legends Kualifikasi SMA Laki-Laki', level: 'SMA', arena: '1 & 2', type: 'competition', game: 'MLBB' },
    { time: '10.30 – 11.30', title: 'Registrasi Peserta FF', level: 'SMA', arena: null, type: 'registration' },
    { time: '11.30 – 14.30', title: 'Mobile Legends 16 Besar – Semi Final SMA Laki-Laki', level: 'SMA', arena: '1', type: 'competition', game: 'MLBB' },
    { time: '11.30 – 16.30', title: 'Free Fire Kualifikasi SMA Laki-Laki', level: 'SMA', arena: '2', type: 'competition', game: 'FF' },
    { time: '12.00 – 12.30', title: 'Break', level: null, arena: null, type: 'break' },
    { time: '15.30 – 16.30', title: 'Registrasi Peserta PUBGM', level: 'SMA', arena: null, type: 'registration' },
    { time: '16.30 – 18.10', title: 'PUBGM Semi Final SMA', level: 'SMA', arena: '1 & 2', type: 'competition', game: 'PUBGM' },
  ]),

  buildDay('SENIN, 30 MARET 2026', 'Sen 30/3', '2026-03-30', [
    { time: '08.00 – 09.00', title: 'Registrasi Peserta FF & ML', level: 'SMA', arena: null, type: 'registration' },
    { time: '09.00 – 09.30', title: 'Pembukaan', level: null, arena: null, type: 'opening' },
    { time: '09.30 – 12.30', title: 'Free Fire Semi Final SMA Laki-Laki', level: 'SMA', arena: '1', type: 'competition', game: 'FF' },
    { time: '09.30 – 13.30', title: 'Mobile Legends Kualifikasi – Semi Final SMA Ladies', level: 'SMA', arena: '2', type: 'competition', game: 'MLBB' },
    { time: '12.00 – 12.30', title: 'Registrasi FF & PUBGM', level: 'SMA', arena: null, type: 'registration' },
    { time: '12.30 – 13.00', title: 'Break', level: null, arena: null, type: 'break' },
    { time: '12.30 – 15.30', title: 'Final Free Fire Ladies SMA', level: 'SMA', arena: '1', type: 'competition', game: 'FF' },
    { time: '13.30 – 17.30', title: 'PUBGM Final SMA', level: 'SMA', arena: '2', type: 'competition', game: 'PUBGM' },
    { time: '15.30 – 18.30', title: 'Final Free Fire Laki-Laki SMA', level: 'SMA', arena: '1', type: 'competition', game: 'FF' },
    { time: '16.00 – 18.00', title: 'Final & Bronze eFootball Solo & Duo SMA', level: 'SMA', arena: null, type: 'competition', game: 'EFO' },
  ]),

  buildDay('SELASA, 31 MARET 2026', 'Sel 31/3', '2026-03-31', [
    { time: '08.00 – 09.00', title: 'Registrasi Peserta FF, ML & EFO', level: 'SD', arena: null, type: 'registration' },
    { time: '09.00 – 09.30', title: 'Pembukaan', level: null, arena: null, type: 'opening' },
    { time: '09.30 – 10.30', title: 'Final eFootball Solo SD', level: 'SD', arena: '3', type: 'competition', game: 'EFO' },
    { time: '09.30 – 12.30', title: 'Free Fire Final SD', level: 'SD', arena: '1', type: 'competition', game: 'FF' },
    { time: '09.30 – 14.00', title: 'Mobile Legends Kualifikasi – Final SD', level: 'SD', arena: '2', type: 'competition', game: 'MLBB' },
    { time: '10.00 – 11.00', title: 'Registrasi Peserta ML Ladies', level: 'SMA', arena: null, type: 'registration' },
    { time: '11.00 – 12.00', title: 'Final eFootball Duo SD', level: 'SD', arena: '3', type: 'competition', game: 'EFO' },
    { time: '12.30 – 13.00', title: 'Break', level: null, arena: null, type: 'break' },
    { time: '12.30 – 14.00', title: 'ML Final & Bronze SMA Ladies', level: 'SMA', arena: '1', type: 'competition', game: 'MLBB' },
    { time: '13.00 – 14.00', title: 'Registrasi Peserta ML Laki-Laki', level: 'SMA', arena: null, type: 'registration' },
    { time: '14.30 – 16.00', title: 'Final & Bronze ML SMA Laki-Laki', level: 'SMA', arena: '2', type: 'competition', game: 'MLBB' },
    { time: '16.00 – 17.00', title: 'Ceremony Juara', level: 'ALL', arena: null, type: 'ceremony' },
  ]),
]

export const GAME_LABELS: Record<string, string> = {
  MLBB: 'Mobile Legends',
  FF: 'Free Fire',
  PUBGM: 'PUBG Mobile',
  HOK: 'Honor of Kings',
  EFO: 'eFootball',
}

export const GAME_COLORS: Record<string, string> = {
  MLBB: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  FF: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  PUBGM: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  HOK: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  EFO: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
}

export const LEVEL_COLORS: Record<string, string> = {
  SD:          'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  SMP:         'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  SMA:         'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  'SMP & SMA': 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800',
  ALL:         'bg-stone-100 text-stone-600 dark:bg-zinc-800 dark:text-zinc-400 border-stone-200 dark:border-zinc-700',
}
