import { useState, useEffect } from 'react'

const FALLBACK_LEGENDS = [
  {
    category: 'Community Knowledge',
    title: 'A living heritage',
    bodyText: 'iCamagu is building a community-reviewed record of Xhosa history, heroes, heroines, language and ceremony for future generations.',
  },
]

export default function DidYouKnow() {
  const [legends, setLegends] = useState(FALLBACK_LEGENDS)
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    fetch('/api/legends/featured')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setLegends(data)
        } else if (data && data.title) {
          setLegends([data])
        }
      })
      .catch(() => {})
  }, [])

  const handleNext = () => setCurrentIndex((prev) => (prev + 1) % legends.length)
  const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + legends.length) % legends.length)

  const current = legends[currentIndex] || FALLBACK_LEGENDS[0]

  return (
    <div className="relative select-none text-left">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-black uppercase tracking-wider text-brand-ochre">
          Did You Know? ({currentIndex + 1}/{legends.length})
        </span>
        <div className="flex gap-2">
          {/* Visually a 20px dot (matches the compact header row), but the
              actual tap target is a full 44px square via an invisible
              ::after that extends past the button's own box — clicking
              anywhere on it still fires the button's onClick. */}
          <button
            type="button"
            onClick={handlePrev}
            className="relative w-5 h-5 rounded-full bg-brand-sage/10 text-brand-sage text-xs font-black flex items-center justify-center active:scale-95 after:content-[''] after:absolute after:-inset-3"
            aria-label="Previous legend"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="relative w-5 h-5 rounded-full bg-brand-sage/10 text-brand-sage text-xs font-black flex items-center justify-center active:scale-95 after:content-[''] after:absolute after:-inset-3"
            aria-label="Next legend"
          >
            ›
          </button>
        </div>
      </div>

      {current.category && (
        <span className="text-[9px] font-extrabold uppercase tracking-widest text-brand-sage block">
          {current.category}
        </span>
      )}
      <p className="font-extrabold text-xs text-brand-black mt-0.5">{current.title}</p>
      <p className="text-[11px] text-brand-black/70 mt-0.5 leading-snug">{current.bodyText || current.text}</p>
    </div>
  )
}
