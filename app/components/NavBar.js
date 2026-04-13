import Link from 'next/link'

export default function NavBar({ title, backHref, backLabel, actions }) {
  return (
    <nav className="border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 bg-gray-950 z-40">
      <div className="flex items-center gap-3">
        {backHref && (
          <Link href={backHref} className="text-gray-400 hover:text-white text-sm transition-colors">
            ← {backLabel || 'Back'}
          </Link>
        )}
        {title && (
          <span className="font-bold text-yellow-400 text-sm">{title}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {actions}
      </div>
    </nav>
  )
}