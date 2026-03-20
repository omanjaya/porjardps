import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Masuk',
  description: 'Masuk ke akun PORJAR Denpasar Esport',
  robots: { index: false, follow: false },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
