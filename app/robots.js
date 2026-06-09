// app/robots.js
// Next.js App Router robots — auto-served at /robots.txt

export default function robots() {
  const siteUrl = 'https://thematchpredictor.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Keep dashboard, admin, and auth pages out of search results
        disallow: ['/dashboard/', '/admin/', '/auth/', '/api/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}