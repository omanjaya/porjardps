import { Sword, ShieldStar, Crosshair, Target, SoccerBall, GameController } from '@phosphor-icons/react'
import type { ComponentType } from 'react'

type IconEntry = { icon: ComponentType<any>; color: string }

// Map game slug (or icon_name) → Phosphor icon + brand color
export const GAME_ICON_MAP: Record<string, IconEntry> = {
  'mobile-legends': { icon: ShieldStar, color: '#2563eb' },
  'mlbb': { icon: ShieldStar, color: '#2563eb' },
  'free-fire': { icon: Crosshair, color: '#ea580c' },
  'ff': { icon: Crosshair, color: '#ea580c' },
  'pubg-mobile': { icon: Target, color: '#ca8a04' },
  'pubgm': { icon: Target, color: '#ca8a04' },
  'efootball': { icon: SoccerBall, color: '#16a34a' },
  'honor-of-kings': { icon: Sword, color: '#d97706' },
  'hok': { icon: Sword, color: '#d97706' },
  'valorant': { icon: Target, color: '#dc2626' },
  'dota-2': { icon: Sword, color: '#7c2d12' },
  'sword': { icon: Sword, color: '#d97706' },
  'shield-star': { icon: ShieldStar, color: '#2563eb' },
  'crosshair': { icon: Crosshair, color: '#ea580c' },
  'target': { icon: Target, color: '#ca8a04' },
  'soccer-ball': { icon: SoccerBall, color: '#16a34a' },
}

export function getGameIcon(slugOrIcon?: string): IconEntry {
  if (!slugOrIcon) return { icon: GameController, color: '#6b7280' }
  return GAME_ICON_MAP[slugOrIcon] ?? { icon: GameController, color: '#6b7280' }
}
