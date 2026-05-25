'use client'

import { useState, useEffect } from 'react'

const LINES = [
  "Give your regulars something to shout about",
  "Get the office talking for 64 matches",
  "The ultimate club sweepstake",
  "Set up in 2 minutes. Runs for 6 weeks.",
]

export default function HeroSubtitle() {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIndex(i => (i + 1) % LINES.length)
        setVisible(true)
      }, 400)
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  return (
    <p
      className="text-sm font-semibold text-yellow-400 uppercase tracking-widest mb-4"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 400ms ease-in-out',
        minHeight: '1.25rem',
      }}
    >
      {LINES[index]}
    </p>
  )
}