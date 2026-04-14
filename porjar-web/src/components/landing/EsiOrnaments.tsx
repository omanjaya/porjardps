'use client'

const RED = '#C41E2A'
const RED_DARK = '#8B0000'

/** Corner bracket marks — esport HUD style */
export function CornerMarks({
  size = 24,
  thickness = 2.5,
  color = RED,
  className = '',
}: {
  size?: number
  thickness?: number
  color?: string
  className?: string
}) {
  const d = size
  const t = thickness
  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`}>
      {/* Top-left */}
      <svg width={d} height={d} className="absolute left-0 top-0" viewBox={`0 0 ${d} ${d}`} fill="none">
        <path d={`M0 ${d} L0 0 L${d} 0`} stroke={color} strokeWidth={t} fill="none" strokeLinecap="square" />
      </svg>
      {/* Top-right */}
      <svg width={d} height={d} className="absolute right-0 top-0" viewBox={`0 0 ${d} ${d}`} fill="none">
        <path d={`M0 0 L${d} 0 L${d} ${d}`} stroke={color} strokeWidth={t} fill="none" strokeLinecap="square" />
      </svg>
      {/* Bottom-left */}
      <svg width={d} height={d} className="absolute bottom-0 left-0" viewBox={`0 0 ${d} ${d}`} fill="none">
        <path d={`M${d} ${d} L0 ${d} L0 0`} stroke={color} strokeWidth={t} fill="none" strokeLinecap="square" />
      </svg>
      {/* Bottom-right */}
      <svg width={d} height={d} className="absolute bottom-0 right-0" viewBox={`0 0 ${d} ${d}`} fill="none">
        <path d={`M${d} 0 L${d} ${d} L0 ${d}`} stroke={color} strokeWidth={t} fill="none" strokeLinecap="square" />
      </svg>
    </div>
  )
}

/** Full-section background ornament for the hero */
export function HeroOrnamentLayer() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Diagonal slash — right side, poster-style vertical panel */}
      <svg className="absolute right-0 top-0 h-full w-[220px] opacity-[0.06]" preserveAspectRatio="none" viewBox="0 0 220 800" fill="none">
        <polygon points="60,0 220,0 220,800 0,800" fill={RED} />
      </svg>

      {/* Diagonal slash — left side */}
      <svg className="absolute left-0 bottom-0 h-[60%] w-[120px] opacity-[0.04]" preserveAspectRatio="none" viewBox="0 0 120 500" fill="none">
        <polygon points="0,0 80,0 120,500 0,500" fill={RED} />
      </svg>

      {/* Diagonal cross-lines — top right */}
      <svg className="absolute right-8 top-16 opacity-[0.08]" width="120" height="120" viewBox="0 0 120 120" fill="none">
        {[0, 16, 32, 48, 64].map((offset) => (
          <line key={offset} x1={offset} y1="0" x2={120} y2={120 - offset} stroke={RED} strokeWidth="1" />
        ))}
        {[0, 16, 32, 48, 64].map((offset) => (
          <line key={`b${offset}`} x1="0" y1={offset} x2={120 - offset} y2={120} stroke={RED} strokeWidth="1" />
        ))}
      </svg>

      {/* Angular bracket — bottom left */}
      <svg className="absolute bottom-12 left-6 opacity-10" width="80" height="80" viewBox="0 0 80 80" fill="none">
        <path d="M0 80 L0 0 L80 0" stroke={RED} strokeWidth="2" fill="none" strokeLinecap="square" />
        <path d="M12 80 L12 12 L80 12" stroke={RED} strokeWidth="1" fill="none" strokeLinecap="square" opacity="0.5" />
      </svg>

      {/* Angular bracket — top right */}
      <svg className="absolute right-6 top-20 opacity-10" width="80" height="80" viewBox="0 0 80 80" fill="none">
        <path d="M80 0 L80 80 L0 80" stroke={RED} strokeWidth="2" fill="none" strokeLinecap="square" />
        <path d="M68 0 L68 68 L0 68" stroke={RED} strokeWidth="1" fill="none" strokeLinecap="square" opacity="0.5" />
      </svg>

      {/* Horizontal rule with diamond — centered */}
      <svg className="absolute bottom-0 left-1/2 -translate-x-1/2 opacity-[0.08]" width="400" height="20" viewBox="0 0 400 20" fill="none">
        <line x1="0" y1="10" x2="175" y2="10" stroke={RED} strokeWidth="1" />
        <rect x="193" y="4" width="14" height="14" transform="rotate(45 200 11)" fill={RED} />
        <line x1="225" y1="10" x2="400" y2="10" stroke={RED} strokeWidth="1" />
      </svg>
    </div>
  )
}

/** Thin horizontal divider with red diamond in center */
export function RedDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`relative flex items-center ${className}`}>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-300 to-red-200" />
      <svg width="12" height="12" viewBox="0 0 12 12" className="mx-2 flex-shrink-0">
        <rect x="1" y="1" width="10" height="10" transform="rotate(45 6 6)" fill={RED} />
      </svg>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-red-300 to-red-200" />
    </div>
  )
}

/** Section ornament background — for non-hero sections */
export function SectionOrnament({ side = 'right' }: { side?: 'left' | 'right' }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Diagonal hash lines */}
      <svg
        className={`absolute top-0 ${side === 'right' ? 'right-0' : 'left-0'} h-full w-32 opacity-[0.035]`}
        preserveAspectRatio="none"
        viewBox="0 0 128 400"
        fill="none"
      >
        {Array.from({ length: 10 }).map((_, i) => (
          <line
            key={i}
            x1={side === 'right' ? 128 - i * 14 : i * 14}
            y1="0"
            x2={side === 'right' ? 128 : 0}
            y2={(i + 1) * 40}
            stroke={RED_DARK}
            strokeWidth="12"
          />
        ))}
      </svg>

      {/* Corner mark */}
      <svg
        className={`absolute top-4 ${side === 'right' ? 'right-4' : 'left-4'} opacity-[0.12]`}
        width="40"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
      >
        {side === 'right' ? (
          <path d="M40 0 L40 40 L0 40" stroke={RED} strokeWidth="2.5" fill="none" strokeLinecap="square" />
        ) : (
          <path d="M0 0 L0 40 L40 40" stroke={RED} strokeWidth="2.5" fill="none" strokeLinecap="square" />
        )}
      </svg>
    </div>
  )
}

/** Decorative number/rank label — poster style */
export function PosterLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`inline-flex items-center gap-0 ${className}`}>
      <div className="h-5 w-1.5 -skew-x-6" style={{ background: RED }} />
      <span className="ml-1.5 text-xs font-black uppercase tracking-widest" style={{ color: RED }}>
        {children}
      </span>
      <div className="ml-1.5 h-5 w-1.5 -skew-x-6" style={{ background: RED }} />
    </div>
  )
}
