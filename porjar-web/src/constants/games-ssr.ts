import { Sword, ShieldStar, Crosshair, SoccerBall, Target } from '@phosphor-icons/react/dist/ssr'
import type { Icon } from '@phosphor-icons/react'
import type { GameSlug } from '@/types'

export interface GameConfigSSR {
  name: string
  icon: Icon
  color: string
  bgColor: string
  borderColor: string
  gradient: string
  hoverBorder: string
  image: string
}

export const GAME_CONFIG_SSR: Record<GameSlug, GameConfigSSR> = {
  hok: {
    name: 'Honor of Kings',
    icon: Sword,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/30',
    gradient: 'from-amber-500/20 to-amber-900/10',
    hoverBorder: 'hover:border-amber-500/50',
    image: '/images/games/hok-bg.webp',
  },
  ml: {
    name: 'Mobile Legends',
    icon: ShieldStar,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    gradient: 'from-blue-500/20 to-blue-900/10',
    hoverBorder: 'hover:border-blue-500/50',
    image: '/images/games/ml-bg.webp',
  },
  ff: {
    name: 'Free Fire',
    icon: Crosshair,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/30',
    gradient: 'from-orange-500/20 to-orange-900/10',
    hoverBorder: 'hover:border-orange-500/50',
    image: '/images/games/ff-bg.webp',
  },
  pubgm: {
    name: 'PUBG Mobile',
    icon: Target,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/30',
    gradient: 'from-yellow-500/20 to-yellow-900/10',
    hoverBorder: 'hover:border-yellow-500/50',
    image: '/images/games/pubgm-bg.webp',
  },
  efootball: {
    name: 'eFootball',
    icon: SoccerBall,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30',
    gradient: 'from-green-500/20 to-green-900/10',
    hoverBorder: 'hover:border-green-500/50',
    image: '/images/games/efootball-bg.webp',
  },
}
