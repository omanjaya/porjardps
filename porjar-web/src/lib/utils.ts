import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  try {
    const parsed = new URL(url, 'https://placeholder.com')
    if (['http:', 'https:'].includes(parsed.protocol)) return url
  } catch {}
  return undefined
}

export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  if (path.startsWith('/uploads/')) {
    const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:9090/api/v1').replace(/\/api\/v1$/, '')
    return `${base}${path}`
  }
  return path
}
