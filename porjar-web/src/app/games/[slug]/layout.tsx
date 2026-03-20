import type { Metadata } from 'next'

type Props = {
  params: Promise<{ slug: string }>
}

const GAME_NAMES: Record<string, string> = {
  hok: 'Honor of Kings',
  ml: 'Mobile Legends',
  ff: 'Free Fire',
  pubgm: 'PUBG Mobile',
  efootball: 'eFootball',
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const gameName = GAME_NAMES[slug] || slug.toUpperCase()

  return {
    title: gameName,
    description: `Turnamen ${gameName} - PORJAR Denpasar Esport 2026`,
    openGraph: {
      images: [{ url: `/api/og?title=${encodeURIComponent(gameName)}&subtitle=PORJAR+Denpasar+2026`, width: 1200, height: 630 }],
    },
  }
}

export default function GameSlugLayout({ children }: { children: React.ReactNode }) {
  return children
}
