export function BracketBackground() {
  return (
    <style>{`
      @keyframes live-glow {
        0%, 100% { box-shadow: 0 0 12px rgba(196, 30, 42, 0.12); }
        50% { box-shadow: 0 0 20px rgba(196, 30, 42, 0.25); }
      }
    `}</style>
  )
}
