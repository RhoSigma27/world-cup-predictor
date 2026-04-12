'use client'

export default function CopyButton({ text }) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text)}
      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors whitespace-nowrap"
    >
      Copy
    </button>
  )
}