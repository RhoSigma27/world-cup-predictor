/** @type {import('next').NextConfig} */

const cspHeader = [
  // Default fallback — only allow same origin
  "default-src 'self'",

  // Scripts — Next.js App Router requires unsafe-inline for its hydration bootstrap.
  // unsafe-eval is included defensively; remove it if no console errors appear in production.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",

  // Styles — Tailwind uses inline styles
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

  // API / WebSocket connections
  // *.supabase.co      — Supabase REST + Auth
  // wss://*.supabase.co — Supabase Realtime (WebSocket)
  // *.lemonsqueezy.com — Lemon Squeezy checkout API
  // vitals.vercel-insights.com — Vercel Analytics
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.lemonsqueezy.com https://vitals.vercel-insights.com",

  // Images
  // flagcdn.com        — country flag images
  // *.supabase.co      — league logos / banners from Supabase Storage
  // data:              — canvas toDataURL(), base64 images
  // blob:              — any blob URLs generated client-side
  "img-src 'self' data: blob: https://flagcdn.com https://*.supabase.co",

  // Fonts — self-hosted only
  "font-src 'self' https://fonts.gstatic.com",

  // Frames — Lemon Squeezy checkout may open in a frame/popup
  // www.loom.com       — Loom video embed on /businesses page
  "frame-src https://*.lemonsqueezy.com https://www.loom.com",

  // Prevent your site being embedded in iframes elsewhere (clickjacking defence)
  "frame-ancestors 'none'",

  // Prevent base tag injection attacks
  "base-uri 'self'",

  // Prevent forms being submitted to external URLs
  "form-action 'self' https://*.lemonsqueezy.com",

  // Upgrade any accidental http:// requests to https://
  "upgrade-insecure-requests",
].join('; ')

const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Content Security Policy — see above
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          // Belt-and-braces clickjacking protection (older browsers that ignore CSP frame-ancestors)
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Prevent browsers guessing MIME types (e.g. treating a .txt as executable)
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Only send the origin (not the full URL) in Referer headers to external sites
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Disable browser features you don't use
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
}

export default nextConfig