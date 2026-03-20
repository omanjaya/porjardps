import type { Metadata } from "next";
import { Rajdhani, Orbitron } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { JsonLd } from "@/components/shared/JsonLd";
import { PwaProvider } from "@/components/shared/PwaProvider";
import { SessionWatcher } from "@/components/shared/SessionWatcher";
import "./globals.css";

const rajdhani = Rajdhani({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-rajdhani",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
});

export const metadata: Metadata = {
  title: { default: 'PORJAR Denpasar Esport 2026', template: '%s | PORJAR Denpasar' },
  description: 'Platform turnamen esport Pekan Olahraga Pelajar Kota Denpasar - HOK, ML, FF, PUBGM, eFootball',
  keywords: ['esport', 'porjar', 'denpasar', 'turnamen', 'mobile legends', 'free fire', 'pubg mobile', 'honor of kings', 'efootball'],
  authors: [{ name: 'Panitia PORJAR Denpasar' }],
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    siteName: 'PORJAR Denpasar Esport',
    images: [{ url: '/api/og?title=PORJAR+Denpasar+Esport+2026&subtitle=Pekan+Olahraga+Pelajar', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3B82F6" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        {/* TODO: implement nonce-based CSP via Next.js middleware — a static meta
            CSP with script-src 'self' would block Next.js runtime inline scripts
            and Google Fonts. Use middleware.ts to inject a per-request nonce and
            pass it through next/headers to Script/style tags instead. */}
      </head>
      <body className={`${rajdhani.variable} ${orbitron.variable} font-sans antialiased bg-porjar-bg text-porjar-text`}>
        <TooltipProvider>
          {children}
          <Toaster position="top-right" richColors />
          <PwaProvider />
          <SessionWatcher />
        </TooltipProvider>
        <JsonLd data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "PORJAR Denpasar Esport",
          "url": "https://esport.porjar-denpasar.id",
          "description": "Platform turnamen esport Pekan Olahraga Pelajar Kota Denpasar",
          "publisher": {
            "@type": "Organization",
            "name": "Panitia PORJAR Denpasar",
            "url": "https://esport.porjar-denpasar.id"
          }
        }} />
      </body>
    </html>
  );
}
