import { useEffect, useRef, useState } from 'react'
import Icon from '../Icon.jsx'
import { captureLocation } from '../../lib/geolocation.js'

const SEARCH_DELAY_MS = 450

// Type any delivery address — suggestions appear as you type, or tap
// "Use my location". Calls onChange({ address, area, latitude, longitude });
// coordinates are null when the member typed without picking a suggestion.
export default function AddressField({ accessToken, value, onChange, autoFocus = false, highlight = false }) {
  const [text, setText] = useState(value?.address || '')
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [locating, setLocating] = useState(false)
  const [hint, setHint] = useState('')
  const inputRef = useRef(null)
  const requestId = useRef(0)

  useEffect(() => {
    if (highlight) inputRef.current?.focus()
  }, [highlight])

  // Debounced address search; stale responses are ignored.
  useEffect(() => {
    const query = text.trim()
    if (query.length < 3 || query === value?.address) {
      setSuggestions([])
      return undefined
    }
    const id = ++requestId.current
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/basket/address/search?q=${encodeURIComponent(query)}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        const data = await res.json()
        if (id !== requestId.current) return
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : [])
        setOpen(true)
      } catch {
        if (id === requestId.current) setSuggestions([])
      } finally {
        if (id === requestId.current) setSearching(false)
      }
    }, SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [text, accessToken, value?.address])

  const typeAddress = (next) => {
    setText(next)
    setHint('')
    // Typing without a suggestion still works: the server guesses the suburb.
    onChange({ address: next, area: '', latitude: null, longitude: null })
  }

  const pick = (place) => {
    setText(place.address)
    setSuggestions([])
    setOpen(false)
    onChange({ address: place.address, area: place.area, latitude: place.latitude, longitude: place.longitude })
  }

  const useMyLocation = async () => {
    setLocating(true)
    setHint('')
    try {
      const { latitude, longitude } = await captureLocation()
      const res = await fetch(`/api/basket/address/reverse?lat=${latitude}&lon=${longitude}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      const place = data.place || {}
      const address = place.address || 'My current location'
      setText(address)
      onChange({ address, area: place.area || '', latitude, longitude })
      if (!place.address) setHint('Got your location. Add your street or suburb so the merchant can find you.')
    } catch (err) {
      setHint(err.message === 'Location permission denied'
        ? 'Location is blocked. Allow it in your browser settings, or just type the address.'
        : 'Could not get your location. Please type the address instead.')
    } finally {
      setLocating(false)
    }
  }

  return (
    <div className="relative">
      <div className={`flex items-center gap-2 bg-cream border-2 rounded-soft px-3 transition-colors ${highlight ? 'border-terracotta' : 'border-cream-dark focus-within:border-sage-500'}`}>
        <Icon name="mapPin" size={16} color="#4a7a4a" />
        <input
          ref={inputRef}
          type="text"
          value={text}
          autoFocus={autoFocus}
          autoComplete="street-address"
          onChange={(e) => typeAddress(e.target.value)}
          onFocus={() => suggestions.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="e.g. 12 Ncedo St, Motherwell, Gqeberha"
          aria-label="Delivery address"
          className="flex-1 min-w-0 bg-transparent py-3 text-sm font-semibold text-ink placeholder:text-ink/35 outline-none"
        />
        {searching && <span className="text-[10px] font-bold text-ink-muted">Searching…</span>}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-cream-dark rounded-soft shadow-soft overflow-hidden" role="listbox">
          {suggestions.map((place) => (
            <li key={`${place.label}-${place.latitude}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(place)}
                className="cursor-pointer w-full text-left px-3 py-2.5 hover:bg-sage-50 flex items-start gap-2"
              >
                <Icon name="mapPin" size={14} color="#c45c26" className="mt-0.5 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-ink truncate">{place.area || place.label}</span>
                  <span className="block text-[11px] text-ink-muted truncate">{place.label}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={useMyLocation}
        disabled={locating}
        className="cursor-pointer mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-sage-700 hover:text-sage-600 disabled:opacity-60"
      >
        <Icon name="compass" size={13} color="#4a7a4a" /> {locating ? 'Finding you…' : 'Use my current location'}
      </button>
      {hint && <p className="text-[11px] text-ink-muted mt-1">{hint}</p>}
    </div>
  )
}
