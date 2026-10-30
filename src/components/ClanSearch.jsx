import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { Skeleton } from './ui/Skeleton.jsx'
import Icon from './Icon.jsx'

const PAGE_SIZE = 40
const AVATAR_COLORS = ['bg-terracotta', 'bg-sage-500', 'bg-ochre', 'bg-sage-700']
const EMPTY = { status: 'idle', results: [], total: 0, suggestions: false }

// Same rules as the server, so "AmaCirha" and "Cirha" count as one clan.
function normalise(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^(?:abakwa|akwa|ama|aba|abe|oo|o)\s*/i, '')
    .replace(/[^a-z0-9]/g, '')
}

function avatarColor(name) {
  const sum = [...name].reduce((total, ch) => total + ch.charCodeAt(0), 0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

function ClanTile({ clan, isMine, open, onToggle, onPickClan }) {
  return (
    <div className={`bg-white rounded-soft border-2 p-3 shadow-soft ${isMine ? 'border-sage-500' : 'border-terracotta/15'}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full flex items-start gap-3 text-left cursor-pointer">
        <span className={`w-11 h-11 rounded-full ${avatarColor(clan.head)} text-white font-display font-bold text-lg flex items-center justify-center flex-shrink-0`}>
          {clan.head.charAt(0).toUpperCase()}
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2">
            <span className="font-display font-bold text-lg text-ink truncate">{clan.head}</span>
            {isMine && <span className="text-[10px] font-black uppercase tracking-wide text-white bg-sage-500 px-2 py-0.5 rounded-pill flex-shrink-0">Your clan</span>}
          </span>
          {clan.matchedAs === 'alias' && (
            <span className="block text-xs font-bold text-terracotta">Found by praise name: {clan.matchedName}</span>
          )}
          <span className={`block text-xs text-ink-muted mt-0.5 ${open ? '' : 'line-clamp-2'}`}>
            {clan.praises.length ? clan.praises.join(' · ') : 'No praise names recorded yet'}
          </span>
        </span>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#6b6259" />
      </button>
      {open && onPickClan && !isMine && (
        <button type="button" onClick={onPickClan}
          className="mt-3 w-full bg-sage-500 text-white font-bold py-2.5 rounded-pill text-sm cursor-pointer transition-transform duration-100 active:scale-[0.96]">
          This is my clan: add it to my profile
        </button>
      )}
    </div>
  )
}

// Search bar for "Find your clan": type any clan or praise name and matching
// clans show straight away, like the Bulk Buy search. Every clan is shown
// under the one Xhosa umbrella, with no sub-group headings.
export default function ClanSearch({ onPickClan }) {
  const { accessToken, user } = useAuth()
  const [query, setQuery] = useState('')
  const [browsing, setBrowsing] = useState(false)
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [retry, setRetry] = useState(0)
  const [openId, setOpenId] = useState(null)
  const [state, setState] = useState(EMPTY)

  const trimmed = query.trim()
  const active = trimmed.length > 0 || browsing

  const myClanKeys = useMemo(() => new Set(
    [user?.paternalIziduko, user?.maternalIziduko, user?.paternalGrandmotherIziduko, user?.maternalGrandmotherIziduko]
      .map(normalise)
      .filter(Boolean),
  ), [user])

  useEffect(() => {
    if (!active || !accessToken) {
      setState(EMPTY)
      return undefined
    }
    let cancelled = false
    setState((s) => ({ ...s, status: 'loading' }))
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: trimmed, limit: String(limit) })
        const res = await fetch(`/api/iziduko/clans?${params}`, { headers: { Authorization: `Bearer ${accessToken}` } })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Could not search clans')
        if (!cancelled) setState({ status: 'ready', results: data.results || [], total: data.total || 0, suggestions: !!data.suggestions })
      } catch {
        if (!cancelled) setState({ ...EMPTY, status: 'error' })
      }
    }, trimmed ? 250 : 0)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [trimmed, active, limit, retry, accessToken])

  const onType = (value) => {
    setQuery(value)
    setLimit(PAGE_SIZE)
    setOpenId(null)
  }

  const close = () => {
    setQuery('')
    setBrowsing(false)
    setLimit(PAGE_SIZE)
    setOpenId(null)
  }

  const isMine = (clan) => myClanKeys.has(normalise(clan.head)) || clan.praises.some((p) => myClanKeys.has(normalise(p)))
  const firstLoad = state.status === 'loading' && state.results.length === 0

  return (
    <section className="mb-5">
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <Icon name="search" size={18} color="#6b6259" />
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => onType(e.target.value)}
          placeholder="Search clans or praise names, e.g. Tshawe"
          aria-label="Search clans"
          autoComplete="off"
          maxLength={120}
          className="w-full min-h-12 rounded-pill border-2 border-terracotta/25 bg-white pl-11 pr-11 py-3 text-base text-ink shadow-soft focus:outline-none focus:border-sage-500"
        />
        {query && (
          <button type="button" onClick={() => onType('')} aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-cream flex items-center justify-center cursor-pointer">
            <Icon name="close" size={14} color="#2b2620" />
          </button>
        )}
      </div>

      {!active && (
        <button type="button" onClick={() => setBrowsing(true)}
          className="mt-2 text-sm font-bold text-sage-700 underline cursor-pointer">
          Browse all clans A to Z
        </button>
      )}

      {active && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-black uppercase tracking-wide text-ink-muted">
              {state.status !== 'ready' ? 'Searching clans' : trimmed ? `${state.total} clan${state.total === 1 ? '' : 's'} found` : `All clans (${state.total})`}
            </p>
            <button type="button" onClick={close} className="text-xs font-bold text-terracotta cursor-pointer">Close</button>
          </div>

          {firstLoad ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : state.status === 'error' ? (
            <div className="bg-white border-2 border-terracotta/25 rounded-soft p-4 text-center">
              <p className="text-sm font-bold text-ink">Clan search is not working right now</p>
              <button type="button" onClick={() => setRetry((n) => n + 1)}
                className="mt-2 bg-terracotta text-white text-sm font-bold px-5 py-2 rounded-pill cursor-pointer">
                Try again
              </button>
            </div>
          ) : state.results.length === 0 ? (
            <div className="bg-white border-2 border-cream-dark rounded-soft p-4">
              <p className="text-sm font-bold text-ink">No clan matches "{trimmed}"</p>
              <p className="text-xs text-ink-muted mt-1">Check the spelling, or add your clan in your profile. New names go to the community for review.</p>
              {onPickClan && (
                <button type="button" onClick={onPickClan}
                  className="mt-3 w-full bg-sage-500 text-white font-bold py-2.5 rounded-pill text-sm cursor-pointer">
                  Add my clan
                </button>
              )}
            </div>
          ) : (
            <>
              {state.suggestions && (
                <p className="text-xs text-ink-muted mb-2">No exact match. Did you mean one of these?</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {state.results.map((clan) => (
                  <ClanTile
                    key={clan.id}
                    clan={clan}
                    isMine={isMine(clan)}
                    open={openId === clan.id}
                    onToggle={() => setOpenId(openId === clan.id ? null : clan.id)}
                    onPickClan={onPickClan}
                  />
                ))}
              </div>
              {state.results.length < state.total && (
                <button type="button" onClick={() => setLimit((n) => Math.min(n + PAGE_SIZE, 100))}
                  disabled={state.status === 'loading' || limit >= 100}
                  className="mt-3 w-full bg-white border-2 border-terracotta/25 text-ink font-bold py-2.5 rounded-pill text-sm cursor-pointer disabled:opacity-50">
                  {limit >= 100 ? 'Type a name to narrow the list' : state.status === 'loading' ? 'Loading...' : 'Show more clans'}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </section>
  )
}
