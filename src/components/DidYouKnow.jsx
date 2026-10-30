import { useState, useEffect } from 'react'

// Founder-chosen people of today, with their own photos (hosted on the
// Hercules CDN). They always show first; the community-reviewed legends
// from /api/legends/featured follow after them.
const FEATURED_PEOPLE = [
  {
    category: 'Fashion & Design',
    title: 'Laduma Ngxokolo',
    image: 'https://hercules-cdn.com/file_4NMV0NmqdNJmx9GTZpSrWTGR',
    bodyText: 'The knitwear designer from Gqeberha behind MaXhosa Africa. He first created his patterns for amakrwala, the young men returning from ulwaluko, turning Xhosa beadwork into clothing now worn around the world.',
  },
  {
    category: 'Sport',
    title: 'Makazole Mapimpi',
    image: 'https://hercules-cdn.com/file_y2v6F6YojuJsH4hhsPAcwNRN',
    bodyText: 'The Springbok wing from Mdantsane who became the first Springbok to score a try in a Rugby World Cup final, in 2019. He went on to win a second World Cup with the Boks in 2023.',
  },
]

// Strip titles so "King Hintsa ka Khawuta" or "Dr. A.B. Xuma" find the right
// Wikipedia page.
const wikiName = (title) => title
  .replace(/^(King|Chief|Prof\.|Dr\.|The)\s+/i, '')
  .replace(/\s*\(.*\)\s*/g, ' ')
  .trim()

// Portraits come from Wikipedia's free image library, cached per session so
// the card only asks once per person. No photo means we show initials.
const portraitCache = new Map()
async function fetchPortrait(title) {
  if (portraitCache.has(title)) return portraitCache.get(title)
  const p = fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiName(title))}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => (d?.type === 'standard' ? d?.thumbnail?.source || null : null))
    .catch(() => null)
  portraitCache.set(title, p)
  return p
}

const initials = (title) => wikiName(title).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

function mergeLegends(fromServer) {
  const featuredTitles = new Set(FEATURED_PEOPLE.map((p) => p.title.toLowerCase()))
  return [...FEATURED_PEOPLE, ...fromServer.filter((l) => !featuredTitles.has(String(l.title || '').toLowerCase()))]
}

export default function DidYouKnow() {
  const [legends, setLegends] = useState(FEATURED_PEOPLE)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [portrait, setPortrait] = useState(null)

  useEffect(() => {
    fetch('/api/legends/featured')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setLegends(mergeLegends(data))
        else if (data && data.title) setLegends(mergeLegends([data]))
      })
      .catch(() => {})
  }, [])

  const current = legends[currentIndex] || FEATURED_PEOPLE[0]

  useEffect(() => {
    let alive = true
    setPortrait(current.image || null)
    if (!current.image && current.title && current.category !== 'Community Knowledge') {
      fetchPortrait(current.title).then((src) => { if (alive) setPortrait(src) })
    }
    return () => { alive = false }
  }, [current.title, current.category, current.image])

  const handleNext = () => setCurrentIndex((prev) => (prev + 1) % legends.length)
  const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + legends.length) % legends.length)

  const navBtn = 'w-11 h-11 rounded-full bg-terracotta/10 text-terracotta text-xl font-black flex items-center justify-center active:scale-95 transition-transform'

  return (
    <div className="relative select-none text-left">
      <div className="flex justify-between items-start gap-3 mb-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-ochre">
            Did you know? · {currentIndex + 1} of {legends.length}
          </p>
          <p className="font-display font-bold text-2xl text-brand-black leading-tight mt-0.5">Xhosa Greatness</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button type="button" onClick={handlePrev} className={navBtn} aria-label="Previous person">‹</button>
          <button type="button" onClick={handleNext} className={navBtn} aria-label="Next person">›</button>
        </div>
      </div>

      <div className="flex gap-4 items-start">
        <div className="w-24 h-32 rounded-2xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-terracotta to-brand-ochre flex items-center justify-center shadow-soft">
          {portrait ? (
            <img src={portrait} alt={current.title} className="w-full h-full object-cover object-top" loading="lazy"
              onError={() => setPortrait(null)} />
          ) : (
            <span className="font-display font-bold text-3xl text-white">{initials(current.title || 'iC')}</span>
          )}
        </div>
        <div className="min-w-0">
          {current.category && (
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-sage block">
              {current.category}
            </span>
          )}
          <p className="font-display font-bold text-lg text-brand-black leading-snug mt-0.5">{current.title}</p>
          <p className="text-sm text-brand-black/75 mt-1 leading-relaxed">{current.bodyText || current.text}</p>
        </div>
      </div>
      {portrait && !current.image && <p className="text-[9px] text-brand-black/40 mt-2">Photo: Wikipedia / Wikimedia Commons</p>}
    </div>
  )
}
