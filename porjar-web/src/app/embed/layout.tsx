import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'PORJAR Embed',
  robots: { index: false, follow: false },
}

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-porjar-bg text-stone-900">
      <div className="relative">
        {children}
      </div>
      {/* Watermark */}
      <div className="fixed bottom-1 right-2 z-50 flex items-center gap-1 opacity-40 hover:opacity-70 transition-opacity">
        <span className="text-[9px] font-medium text-stone-500 tracking-wider">
          Powered by{' '}
          <a
            href="https://esport.porjar-denpasar.id"
            target="_blank"
            rel="noopener noreferrer"
            className="text-porjar-red hover:text-red-600"
          >
            PORJAR
          </a>
        </span>
      </div>
    </div>
  )
}
