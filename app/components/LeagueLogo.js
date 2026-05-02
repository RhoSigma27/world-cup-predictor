// components/LeagueLogo.js
// Shared logo display component used in dashboard cards, league page header, standings header.
// Shows the uploaded logo if present, otherwise a stable coloured initial circle.

export default function LeagueLogo({ name, logoUrl, size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-9 h-9 text-sm',    // dashboard card row
    md: 'w-12 h-12 text-lg',  // standings header
    lg: 'w-16 h-16 text-2xl', // league page header
  }
  const sizeClass = sizes[size] || sizes.md

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`${name} logo`}
        className={`${sizeClass} rounded-full object-cover border border-gray-700 flex-shrink-0 ${className}`}
      />
    )
  }

  // Stable colour derived from first character of league name
  const colours = [
    'bg-yellow-700', 'bg-blue-700', 'bg-green-700', 'bg-purple-700',
    'bg-rose-700',   'bg-cyan-700', 'bg-orange-700','bg-teal-700',
  ]
  const bg = colours[(name?.charCodeAt(0) || 0) % colours.length]

  return (
    <div className={`${sizeClass} ${bg} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 ${className}`}>
      {name?.charAt(0).toUpperCase() || '?'}
    </div>
  )
}