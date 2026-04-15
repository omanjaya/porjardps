import type { Metadata } from "next";
import { Rajdhani, Orbitron } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { JsonLd } from "@/components/shared/JsonLd";
import { PwaProvider } from "@/components/shared/PwaProvider";
import { SessionWatcher } from "@/components/shared/SessionWatcher";
import { ObservabilityInit } from "@/components/shared/ObservabilityInit";
import "./globals.css";

const rajdhani = Rajdhani({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-rajdhani",
  display: "swap",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://esidenpasar.com'),
  title: {
    default: 'ESI Kota Denpasar — Turnamen Esport Pelajar',
    template: '%s | ESI Denpasar',
  },
  description: 'Platform resmi turnamen esport pelajar se-Kota Denpasar. Kompetisi Mobile Legends, Free Fire, PUBG, eFootball, Honor of Kings.',
  keywords: ['esi denpasar', 'esports denpasar', 'turnamen esport pelajar', 'mobile legends denpasar', 'free fire denpasar', 'bali esports'],
  authors: [{ name: 'ESI Kota Denpasar' }],
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: 'https://esidenpasar.com',
    siteName: 'ESI Kota Denpasar',
    title: 'ESI Kota Denpasar — Turnamen Esport Pelajar',
    description: 'Platform resmi turnamen esport pelajar se-Kota Denpasar. Kompetisi Mobile Legends, Free Fire, PUBG, eFootball, Honor of Kings.',
    images: [{ url: '/images/logo/esi-denpasar.webp', width: 1200, height: 630, alt: 'ESI Kota Denpasar' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ESI Kota Denpasar — Turnamen Esport Pelajar',
    description: 'Platform resmi turnamen esport pelajar se-Kota Denpasar. Kompetisi Mobile Legends, Free Fire, PUBG, eFootball, Honor of Kings.',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://esidenpasar.com' },
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
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('esi_theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}` }} />
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes esi-fadeSlideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
          @keyframes esi-scaleIn{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}
          .hero-logos{animation:esi-fadeSlideUp .6s ease-out .2s both}
          .hero-title{animation:esi-fadeSlideUp .8s ease-out .3s both}
          .hero-badge{animation:esi-scaleIn .5s ease-out calc(.5s + var(--badge-index,0) * .08s) both}
          .hero-cta{animation:esi-fadeSlideUp .5s ease-out .7s both}
        ` }} />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#C41E2A" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/images/logo/esi-denpasar.webp" />
        {/* TODO: implement nonce-based CSP via Next.js middleware — a static meta
            CSP with script-src 'self' would block Next.js runtime inline scripts
            and Google Fonts. Use middleware.ts to inject a per-request nonce and
            pass it through next/headers to Script/style tags instead. */}
      </head>
      <body className={`${rajdhani.variable} ${orbitron.variable} font-sans antialiased bg-esi-bg text-esi-text`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:rounded-lg focus:bg-esi-red focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
        >
          Lewati ke konten utama
        </a>
        <TooltipProvider>
          <div id="main-content">{children}</div>
          <Toaster position="top-right" richColors />
          <PwaProvider />
          <SessionWatcher />
          <ObservabilityInit />
        </TooltipProvider>
        <JsonLd data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "ESI Kota Denpasar",
          "url": "https://esidenpasar.com",
          "description": "Platform resmi turnamen esport pelajar se-Kota Denpasar. Kompetisi Mobile Legends, Free Fire, PUBG, eFootball, Honor of Kings.",
          "publisher": {
            "@type": "Organization",
            "name": "ESI Kota Denpasar",
            "url": "https://esidenpasar.com"
          }
        }} />
      </body>
    </html>
  );
}
