import { Sword, ShieldStar, Crosshair, SoccerBall, Target } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import type { GameSlug } from '@/types'

export interface GameConfig {
  name: string
  icon: Icon
  logo: string
  bgImage: string
  color: string
  bgColor: string
  borderColor: string
  gradient: string
  accentBorder: string
  hoverBorder: string
  stripeBg: string
}

export const GAME_CONFIG: Record<GameSlug, GameConfig> = {
  hok: {
    name: 'Honor of Kings',
    icon: Sword,
    logo: '/images/games/hok-logo.webp',
    bgImage: '/images/games/hok-bg.webp',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/30',
    gradient: 'from-amber-500/20 to-amber-900/10',
    accentBorder: 'text-amber-400 border-amber-400',
    hoverBorder: 'hover:border-amber-500/50',
    stripeBg: 'bg-amber-500',
  },
  ml: {
    name: 'Mobile Legends',
    icon: ShieldStar,
    logo: '/images/games/ml-logo.webp',
    bgImage: '/images/games/ml-bg.webp',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    gradient: 'from-blue-500/20 to-blue-900/10',
    accentBorder: 'text-blue-400 border-blue-400',
    hoverBorder: 'hover:border-blue-500/50',
    stripeBg: 'bg-blue-500',
  },
  ff: {
    name: 'Free Fire',
    icon: Crosshair,
    logo: '/images/games/ff-logo.webp',
    bgImage: '/images/games/ff-bg.webp',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/30',
    gradient: 'from-orange-500/20 to-orange-900/10',
    accentBorder: 'text-orange-400 border-orange-400',
    hoverBorder: 'hover:border-orange-500/50',
    stripeBg: 'bg-orange-500',
  },
  pubgm: {
    name: 'PUBG Mobile',
    icon: Target,
    logo: '/images/games/pubgm-logo.webp',
    bgImage: '/images/games/pubgm-bg.webp',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/30',
    gradient: 'from-yellow-500/20 to-yellow-900/10',
    accentBorder: 'text-yellow-400 border-yellow-400',
    hoverBorder: 'hover:border-yellow-500/50',
    stripeBg: 'bg-yellow-500',
  },
  efootball: {
    name: 'eFootball',
    icon: SoccerBall,
    logo: '/images/games/efootball-logo.webp',
    bgImage: '/images/games/efootball-bg.webp',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30',
    gradient: 'from-green-500/20 to-green-900/10',
    accentBorder: 'text-green-400 border-green-400',
    hoverBorder: 'hover:border-green-500/50',
    stripeBg: 'bg-green-500',
  },
}
