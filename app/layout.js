import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import HelpButton from "./components/HelpButton";
import CookieBanner from './components/CookieBanner'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = 'https://thematchpredictor.com'

export const metadata = {
  // Title template — page-level metadata uses %s, fallback shown on pages with no metadata
  title: {
    default: 'The Match Predictor — World Cup 2026 Prediction League',
    template: '%s | The Match Predictor',
  },
  description: 'Create a free World Cup 2026 prediction league and compete with friends, colleagues or your local pub. Predict all 104 matches and climb the leaderboard.',
  keywords: [
    'world cup 2026 predictor',
    'world cup 2026 prediction game',
    'world cup prediction league',
    'world cup 2026 sweepstake',
    'FIFA 2026 predictor',
    'football prediction game',
    'world cup 2026 free game',
  ],
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: siteUrl,
  },

  // Open Graph
  openGraph: {
    title: 'The Match Predictor — World Cup 2026 Prediction League',
    description: 'Create a free prediction league, predict all 104 matches, and compete with friends. Free to play — no sign-up faff.',
    url: siteUrl,
    siteName: 'The Match Predictor',
    locale: 'en_GB',
    type: 'website',
    images: [
      {
        url: '/og-image.png', // 1200×630 — create this image in /public
        width: 1200,
        height: 630,
        alt: 'The Match Predictor — World Cup 2026 Prediction League',
      },
    ],
  },

  // Twitter / X card
  twitter: {
    card: 'summary_large_image',
    title: 'The Match Predictor — World Cup 2026 Prediction League',
    description: 'Free World Cup 2026 prediction league. Predict all 104 matches and compete with friends.',
    images: ['/og-image.png'],
  },

  // PWA / mobile
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Match Predictor',
  },

  // Indexing
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export const viewport = {
  themeColor: '#e8c96b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Match Predictor" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <HelpButton />
        <CookieBanner />
      </body>
    </html>
  );
}