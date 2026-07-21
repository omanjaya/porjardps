import {
  Trophy,
  House,
  UsersThree,
  UserCircle,
  CalendarBlank,
  GearSix,
  ClockCounterClockwise,
  ChartLineUp,
  Checks,
  UploadSimple,
  DownloadSimple,
  WebhooksLogo,
  GraduationCap,
  BookOpen,
  Lightning,
  Medal,
  Newspaper,
  Megaphone,
  PaintBrush,
  WhatsappLogo,
  Warning,
  Timer,
  ClipboardText,
} from '@phosphor-icons/react'
import type { LayoutConfig } from './types'

export const adminConfig: LayoutConfig = {
  role: 'admin',
  roleLabel: 'Admin',
  baseHref: '/admin',
  allowedRoles: ['admin', 'superadmin'],
  defaultUserLabel: 'Admin',
  navItems: [
    // ── Utama ─────────────────────────────────────────────
    { label: 'Dashboard',      href: '/admin',            icon: House,                section: 'Utama' },
    { label: 'Analitik',       href: '/admin/analytics',  icon: ChartLineUp },
    { label: 'Log Aktivitas',  href: '/admin/activity',   icon: ClockCounterClockwise },
    { label: 'Kalender',       href: '/admin/calendar',   icon: CalendarBlank },

    // ── Event & Kompetisi ──────────────────────────────────
    { label: 'Events',         href: '/admin/events',      icon: Medal,    section: 'Event & Kompetisi' },
    { label: 'Turnamen',       href: '/admin/tournaments', icon: Trophy },
    { label: 'Jadwal Match',   href: '/admin/schedules',   icon: Timer },
    { label: 'Live Score',     href: '/admin/live',        icon: Lightning },

    // ── Peserta ────────────────────────────────────────────
    { label: 'Daftar Tim',     href: '/admin/approvals',   icon: ClipboardText,   section: 'Peserta' },
    { label: 'Verifikasi Skor',href: '/admin/submissions', icon: Checks },
    { label: 'Tim',            href: '/admin/teams',       icon: UsersThree },
    { label: 'Sekolah',        href: '/admin/schools',     icon: GraduationCap, superadminOnly: true },
    { label: 'Pengguna',       href: '/admin/users',       icon: UserCircle, superadminOnly: true },

    // ── Konten ────────────────────────────────────────────
    { label: 'Berita',         href: '/admin/news',          icon: Newspaper,  section: 'Konten' },
    { label: 'Pengumuman',     href: '/admin/announcements', icon: Megaphone },
    { label: 'Aturan',         href: '/admin/rules',         icon: BookOpen },
    { label: 'Broadcast WA',   href: '/admin/broadcast',     icon: WhatsappLogo },

    // ── Data ──────────────────────────────────────────────
    { label: 'Import Peserta', href: '/admin/import', icon: UploadSimple,   section: 'Data' },
    { label: 'Export Data',    href: '/admin/export',  icon: DownloadSimple },

    // ── Sistem ────────────────────────────────────────────
    { label: 'Tampilan Situs', href: '/admin/site-settings',       icon: PaintBrush,  section: 'Sistem' },
    { label: 'Penalti',        href: '/admin/settings/penalties',  icon: Warning },
    { label: 'Webhooks',       href: '/admin/webhooks',            icon: WebhooksLogo },
    { label: 'Pengaturan',     href: '/admin/settings',            icon: GearSix },
  ],
}
