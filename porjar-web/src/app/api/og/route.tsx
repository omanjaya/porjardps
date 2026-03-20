import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

const ACCENT_COLORS: Record<string, string> = {
  bracket: '#3B82F6',
  match: '#10B981',
  standings: '#F59E0B',
  default: '#3B82F6',
}

const MAX_TITLE = 80
const MAX_SUBTITLE = 120

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const title = (searchParams.get('title') || 'PORJAR Denpasar Esport').slice(0, MAX_TITLE)
  const subtitle = (searchParams.get('subtitle') || 'Pekan Olahraga Pelajar Kota Denpasar 2026').slice(0, MAX_SUBTITLE)
  const type = searchParams.get('type') || 'default'
  const accentColor = ACCENT_COLORS[type] || ACCENT_COLORS.default

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
          fontFamily: 'Inter, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background decorative elements */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${accentColor}15, transparent 70%)`,
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-80px',
            left: '-80px',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${accentColor}10, transparent 70%)`,
            display: 'flex',
          }}
        />

        {/* Top bar accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: `linear-gradient(90deg, ${accentColor}, #8B5CF6, ${accentColor})`,
            display: 'flex',
          }}
        />

        {/* Trophy icon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '80px',
            height: '80px',
            borderRadius: '20px',
            background: `linear-gradient(135deg, ${accentColor}30, ${accentColor}10)`,
            border: `2px solid ${accentColor}40`,
            marginBottom: '24px',
            fontSize: '40px',
          }}
        >
          🏆
        </div>

        {/* PORJAR badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
            padding: '6px 16px',
            borderRadius: '9999px',
            background: `${accentColor}20`,
            border: `1px solid ${accentColor}30`,
          }}
        >
          <span style={{ color: accentColor, fontSize: '14px', fontWeight: 700, letterSpacing: '2px' }}>
            PORJAR DENPASAR ESPORT
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: '900px',
            padding: '0 40px',
          }}
        >
          <h1
            style={{
              fontSize: title.length > 30 ? '42px' : '52px',
              fontWeight: 800,
              color: '#F8FAFC',
              textAlign: 'center',
              lineHeight: 1.2,
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: '22px',
              color: '#94A3B8',
              textAlign: 'center',
              marginTop: '12px',
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </p>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: 'absolute',
            bottom: '30px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#475569',
            fontSize: '14px',
          }}
        >
          <span>esport.porjar-denpasar.id</span>
          <span style={{ color: '#334155' }}>|</span>
          <span>2026</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
