import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "World Cup Predictor 2026",
  description: "Predict every match of the 2026 World Cup and compete with friends in private leagues",
  manifest: "/manifest.json",
  themeColor: "#e8c96b",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WCP26",
  },
  openGraph: {
    title: "World Cup Predictor 2026",
    description: "Predict with mates. No fluff. Just bragging rights.",
    type: "website",
  },
};

export const viewport = {
  themeColor: "#e8c96b",
  width: "device-width",
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
        <meta name="apple-mobile-web-app-title" content="WCP26" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}