import { useEffect, useMemo, useState } from 'react'
import Icon from '../Icon.jsx'
import AddressField from './AddressField.jsx'
import NearbyPoolList from './NearbyPoolList.jsx'
import { CATEGORY_LABEL, poolCategoryForSku } from '../../data/poolCategories.js'

const MODES = [
  { id: 'POOL', title: 'Buy together', blurb: 'Pool with people near the address. Bigger group order, better merchant offers.', icon: 'users' },
  { id: 'SOLO', title: 'Buy on my own', blurb: 'A normal order just for you. Merchants send offers straight away.', icon: 'package' },
]

const tomorrow = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

// The whole checkout in three plain steps: how you're buying, where it's
// going, and (for pooling) which pool. Starts from the profile address so
// most people just tap the button — no trip to Edit Profile needed.
export default function CheckoutPanel({
  accessToken, user, items, totalZAR, joiningPool, onDismissJoiningPool, submitting, onSubmit, areaMissing, onSaveAddress,
}) {
  const profileDelivery = useMemo(() => {
    const address = (user?.address || user?.location || '').trim()
    return address
      ? { address, area: user?.location || '', latitude: user?.latitude ?? null, longitude: user?.longitude ?? null }
      : null
  }, [user])

  const [mode, setMode] = useState('POOL')
  const [delivery, setDelivery] = useState(profileDelivery)
  const [editingAddress, setEditingAddress] = useState(!profileDelivery)
  const [pools, setPools] = useState([])
  const [loadingPools, setLoadingPools] = useState(false)
  const [chosenIds, setChosenIds] = useState(joiningPool ? [joiningPool.id] : [])
  const [targetDate, setTargetDate] = useState('')
  const [saveAddress, setSaveAddress] = useState(!profileDelivery)

  // The kinds of item in the cart decide which pools are relevant.
  const cartCategories = useMemo(
    () => [...new Set(items.map((item) => poolCategoryForSku(item.sku)))],
    [items],
  )

  useEffect(() => {
    if (joiningPool) setChosenIds((ids) => (ids.includes(joiningPool.id) ? ids : [...ids, joiningPool.id]))
  }, [joiningPool])

  useEffect(() => {
    if (areaMissing) setEditingAddress(true)
  }, [areaMissing])

  const categoriesKey = cartCategories.join(',')
  const addressKey = delivery ? `${delivery.address}|${delivery.latitude}|${delivery.longitude}` : ''

  // Look up pools near the address whenever it settles.
  useEffect(() => {
    if (mode !== 'POOL' || !delivery?.address || delivery.address.trim().length < 3) {
      setPools([])
      return undefined
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      setLoadingPools(true)
      const params = new URLSearchParams({ categories: categoriesKey })
      if (delivery.latitude != null && delivery.longitude != null) {
        params.set('lat', String(delivery.latitude))
        params.set('lon', String(delivery.longitude))
      }
      params.set('area', delivery.area || guessArea(delivery.address))
      try {
        const res = await fetch(`/api/basket/pools/near?${params}`, { headers: { Authorization: `Bearer ${accessToken}` } })
        const data = await res.json()
        if (cancelled) return
        const found = Array.isArray(data.pools) ? data.pools : []
        setPools(found)
        // Anticipate: if you're already in a pool near here, it's pre-picked.
        setChosenIds((ids) => {
          const keep = ids.filter((id) => found.some((p) => p.id === id) || id === joiningPool?.id)
          const taken = new Set(found.filter((p) => keep.includes(p.id)).map((p) => p.category))
          const mine = found.filter((p) => p.isMine && !taken.has(p.category) && taken.add(p.category))
          return [...keep, ...mine.map((p) => p.id)]
        })
      } catch {
        if (!cancelled) setPools([])
      } finally {
        if (!cancelled) setLoadingPools(false)
      }
    }, 500)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // addressKey/categoriesKey capture the delivery and cart fields that matter.
  }, [mode, addressKey, categoriesKey, accessToken])

  const togglePool = (pool) => {
    setChosenIds((ids) => {
      if (ids.includes(pool.id)) return ids.filter((id) => id !== pool.id)
      // One pool per kind of item.
      const sameKind = new Set(pools.filter((p) => p.category === pool.category).map((p) => p.id))
      return [...ids.filter((id) => !sameKind.has(id)), pool.id]
    })
    if (joiningPool && pool.id === joiningPool.id) onDismissJoiningPool()
  }

  const chosenPools = pools.filter((p) => chosenIds.includes(p.id))
  const hasAddress = Boolean(delivery?.address?.trim())
  const areaLabel = delivery?.area || guessArea(delivery?.address)
  const summary = buildSummary({ mode, cartCategories, chosenPools, joiningPool, areaLabel })

  const submit = async () => {
    if (!hasAddress) {
      setEditingAddress(true)
      return
    }
    if (saveAddress && onSaveAddress) await onSaveAddress({ ...delivery, area: areaLabel })
    onSubmit({
      mode,
      delivery: { ...delivery, area: delivery.area || '' },
      joinPoolIds: mode === 'POOL' ? chosenIds : [],
      targetDate: targetDate || undefined,
    })
  }

  return (
    <div className="card-paper p-4 space-y-5">
      {/* Step 1: how */}
      <section>
        <StepLabel n={1} text="How do you want to buy?" />
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="How do you want to buy?">
          {MODES.map((m) => {
            const active = mode === m.id
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setMode(m.id)}
                className={`cursor-pointer text-left rounded-soft border-2 p-3 transition-all active:scale-[0.98] ${active ? 'border-terracotta bg-gradient-to-br from-terracotta/10 to-brand-ochre/10 shadow-soft' : 'border-cream-dark bg-white'}`}
              >
                <span className={`inline-flex w-8 h-8 rounded-full items-center justify-center mb-1.5 ${active ? 'bg-terracotta' : 'bg-cream-dark'}`}>
                  <Icon name={m.icon} size={16} color={active ? '#fff' : '#2b2620'} />
                </span>
                <p className="text-sm font-black text-ink">{m.title}</p>
                <p className="text-[11px] text-ink-muted leading-snug mt-0.5">{m.blurb}</p>
              </button>
            )
          })}
        </div>
      </section>

      {/* Step 2: where */}
      <section>
        <StepLabel n={2} text="Where should it be delivered?" />
        {editingAddress || !hasAddress ? (
          <>
            <AddressField
              accessToken={accessToken}
              value={delivery}
              onChange={setDelivery}
              autoFocus={!profileDelivery}
              highlight={areaMissing}
            />
            <p className="text-[11px] text-ink-muted mt-2">
              It can be anywhere: you can live in Joburg and send this to family in Gqeberha.
            </p>
            {areaMissing && (
              <p role="alert" className="text-xs font-bold text-terracotta mt-1">Type the delivery address so we know where this order goes.</p>
            )}
            <label className="mt-2 flex items-center gap-2 text-xs text-ink cursor-pointer">
              <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="accent-sage-500 w-4 h-4" />
              Save as my usual address
            </label>
          </>
        ) : (
          <div className="flex items-center gap-3 rounded-soft bg-sage-50 border border-sage-200 p-3">
            <span className="w-9 h-9 rounded-full bg-sage-500 flex items-center justify-center shrink-0">
              <Icon name="mapPin" size={16} color="#fff" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink truncate">{areaLabel || delivery.address}</p>
              <p className="text-[11px] text-ink-muted truncate">{delivery.address}</p>
            </div>
            <button type="button" onClick={() => setEditingAddress(true)} className="cursor-pointer text-xs font-black text-sage-700 underline shrink-0">
              Change
            </button>
          </div>
        )}
      </section>

      {/* Step 3: which pool (pooling only) */}
      {mode === 'POOL' && hasAddress && (
        <section>
          <StepLabel n={3} text={`Pools near ${areaLabel || 'this address'}`} />
          <NearbyPoolList pools={pools} loading={loadingPools} chosenIds={chosenIds} onToggle={togglePool} areaLabel={areaLabel} />
          {pools.length > 0 && (
            <p className="text-[11px] text-ink-muted mt-2">
              Tap a pool to join it. Not picking one? We'll put you in the closest open pool for each kind of item.
            </p>
          )}
        </section>
      )}

      <details className="group">
        <summary className="cursor-pointer list-none text-xs font-bold text-ink-muted flex items-center gap-1">
          <Icon name="calendar" size={13} /> {mode === 'SOLO' ? 'Need it by a certain date?' : 'Planning ahead? Set a target date'}
          <Icon name="chevron-down" size={13} className="group-open:rotate-180 transition-transform" />
        </summary>
        <input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          min={tomorrow()}
          className="mt-2 w-full border border-cream-dark rounded-soft px-3 py-2.5 bg-cream text-xs font-bold text-ink"
        />
        {mode === 'POOL' && <p className="text-[11px] text-ink-muted mt-1">Only used if this starts a new pool.</p>}
      </details>

      {/* Summary + action */}
      <div className="rounded-soft bg-ink text-cream p-4">
        <p className="text-[10px] font-black uppercase tracking-wider text-cream/60 mb-1">What happens next</p>
        <ul className="space-y-1 mb-3">
          {summary.map((line) => (
            <li key={line} className="text-xs leading-snug flex gap-1.5">
              <Icon name="check" size={12} color="#9bb89b" className="mt-0.5 shrink-0" /> <span>{line}</span>
            </li>
          ))}
          <li className="text-xs leading-snug flex gap-1.5">
            <Icon name="shieldCheck" size={12} color="#9bb89b" className="mt-0.5 shrink-0" />
            <span>iCamagu never holds your money. You pay the merchant once their offer is confirmed.</span>
          </li>
        </ul>
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="cursor-pointer w-full bg-terracotta hover:brightness-110 text-white font-black py-3.5 rounded-pill shadow-terracotta active:scale-[0.97] transition-transform text-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? 'Placing your order…' : (
            <>
              {!hasAddress ? 'Add a delivery address' : mode === 'SOLO' ? `Place my order · R${totalZAR.toFixed(2)}` : chosenPools.length ? 'Join pool' + (chosenPools.length > 1 ? 's' : '') : 'Join the nearest pool'}
              <Icon name="arrowRight" size={15} color="#fff" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function StepLabel({ n, text }) {
  return (
    <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-ink mb-2">
      <span className="w-5 h-5 rounded-full bg-terracotta text-white text-[10px] flex items-center justify-center">{n}</span>
      {text}
    </p>
  )
}

function guessArea(address) {
  const parts = String(address || '').split(',').map((p) => p.trim()).filter(Boolean)
  return parts.find((p) => !/\d/.test(p)) || parts[parts.length - 1] || ''
}

function buildSummary({ mode, cartCategories, chosenPools, joiningPool, areaLabel }) {
  const place = areaLabel || 'your address'
  if (mode === 'SOLO') {
    return [
      `Your order is placed straight away for delivery to ${place}.`,
      'Merchants send offers on it, and the best one is confirmed for you.',
    ]
  }
  return cartCategories.map((category) => {
    const label = CATEGORY_LABEL[category]
    const picked = chosenPools.find((p) => p.category === category)
      || (joiningPool?.category === category ? joiningPool : null)
    if (picked) return `${label} join the pool near ${picked.area} (${picked.currentCases}/${picked.moqTarget}).`
    return `${label} join the closest open pool near ${place}, or start one there.`
  })
}
