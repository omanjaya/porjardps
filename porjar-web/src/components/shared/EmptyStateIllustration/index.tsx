'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface EmptyStateIllustrationProps {
  type: 'no-match' | 'no-team' | 'no-stats' | 'no-submission'
  title: string
  description: string
  action?: { label: string; href: string }
}

function NoMatchIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Trophy body */}
      <path
        d="M20 14h24v18c0 8-5.4 14-12 14s-12-6-12-14V14z"
        stroke="#d6d3d1"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="#fafaf9"
      />
      {/* Left handle */}
      <path
        d="M20 18h-4a6 6 0 0 0 0 12h4"
        stroke="#d6d3d1"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Right handle */}
      <path
        d="M44 18h4a6 6 0 0 1 0 12h-4"
        stroke="#d6d3d1"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Base */}
      <path
        d="M26 46h12v4H26z"
        stroke="#d6d3d1"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="#fafaf9"
      />
      <path
        d="M22 50h20"
        stroke="#d6d3d1"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Question mark */}
      <path
        d="M29 27c0-2.2 1.3-4 3-4s3 1.8 3 4c0 1.5-1.2 2.5-3 3v1"
        stroke="#a8a29e"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="32" cy="34" r="1" fill="#a8a29e" />
    </svg>
  )
}

function NoTeamIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Left person */}
      <circle cx="22" cy="22" r="6" stroke="#d6d3d1" strokeWidth="2.5" fill="#fafaf9" />
      <path
        d="M12 42c0-5.5 4.5-10 10-10s10 4.5 10 10"
        stroke="#d6d3d1"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Right person (faded) */}
      <circle cx="42" cy="22" r="6" stroke="#e7e5e4" strokeWidth="2.5" fill="#fafaf9" strokeDasharray="4 3" />
      <path
        d="M32 42c0-5.5 4.5-10 10-10s10 4.5 10 10"
        stroke="#e7e5e4"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="4 3"
        fill="none"
      />
      {/* Plus sign */}
      <circle cx="50" cy="14" r="7" fill="#fafaf9" stroke="#a8a29e" strokeWidth="2" />
      <path d="M50 11v6M47 14h6" stroke="#a8a29e" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function NoStatsIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Chart bars */}
      <rect x="10" y="34" width="8" height="18" rx="2" stroke="#d6d3d1" strokeWidth="2.5" fill="#fafaf9" />
      <rect x="22" y="24" width="8" height="28" rx="2" stroke="#d6d3d1" strokeWidth="2.5" fill="#fafaf9" />
      <rect x="34" y="30" width="8" height="22" rx="2" stroke="#d6d3d1" strokeWidth="2.5" fill="#fafaf9" />
      <rect x="46" y="18" width="8" height="34" rx="2" stroke="#e7e5e4" strokeWidth="2.5" fill="#fafaf9" strokeDasharray="4 3" />
      {/* Baseline */}
      <path d="M8 52h48" stroke="#d6d3d1" strokeWidth="2" strokeLinecap="round" />
      {/* Dots representing data points */}
      <circle cx="14" cy="28" r="2.5" fill="#a8a29e" />
      <circle cx="26" cy="18" r="2.5" fill="#a8a29e" />
      <circle cx="38" cy="22" r="2.5" fill="#a8a29e" />
      {/* Connecting line */}
      <path d="M14 28L26 18L38 22" stroke="#a8a29e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 3" />
    </svg>
  )
}

function NoSubmissionIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Document/upload box */}
      <rect x="14" y="10" width="36" height="44" rx="4" stroke="#d6d3d1" strokeWidth="2.5" fill="#fafaf9" />
      {/* Upload arrow */}
      <path
        d="M32 24v16"
        stroke="#a8a29e"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M26 30l6-6 6 6"
        stroke="#a8a29e"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Checkmark circle */}
      <circle cx="46" cy="46" r="9" fill="#fafaf9" stroke="#a8a29e" strokeWidth="2" />
      <path d="M42 46l3 3 5-5" stroke="#a8a29e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const iconMap = {
  'no-match': NoMatchIcon,
  'no-team': NoTeamIcon,
  'no-stats': NoStatsIcon,
  'no-submission': NoSubmissionIcon,
}

export function EmptyStateIllustration({
  type,
  title,
  description,
  action,
}: EmptyStateIllustrationProps) {
  const IconComponent = iconMap[type]

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-stone-50">
        <IconComponent />
      </div>
      <h3 className="text-base font-semibold text-stone-800">{title}</h3>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-stone-500">
        {description}
      </p>
      {action && (
        <Link href={action.href}>
          <Button
            className="mt-4 bg-esi-red text-white hover:bg-esi-red-dark"
            size="sm"
          >
            {action.label}
          </Button>
        </Link>
      )}
    </div>
  )
}
