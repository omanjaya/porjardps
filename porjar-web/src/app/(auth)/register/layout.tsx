import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Daftar',
  description: 'Daftar akun ESI Denpasar Esport untuk mendaftarkan tim',
  robots: { index: false, follow: false },
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
