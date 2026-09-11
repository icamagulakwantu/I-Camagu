import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import Icon from '../components/Icon.jsx'
import { DEPARTMENTS, departmentOf } from '../data/storeTaxonomy.js'
import { TIERS } from '../data/smartMatchTiers.js'
import { unitOf, quantityLabel } from '../data/bulkUnits.js'

// This pool's rolling window closes on windowDeadline — after that, new
// baskets join a fresh pool instead of piling onto this one. Real data
// from BulkPool.deadline, no fabricated countdown.
function windowClosesLabel(windowDeadline) {
  const msLeft = new Date(windowDeadline).getTime() - Date.now()
  if (msLeft <= 0) return 'This window has closed — new members are joining a fresh pool.'
  const hoursLeft = Math.ceil(msLeft / (60 * 60 * 1000))
  if (hoursLeft <= 1) return 'This pooling window closes in under an hour.'
  if (hoursLeft < 24) return `This pooling window closes in ${hoursLeft}h.`
  return `This pooling window closes in ${Math.round(hoursLeft / 24)} day${Math.round(hoursLeft / 24) === 1 ? '' : 's'}.`
}

export default function Basket({ onBack, onBasketChanged }) {
  const { accessToken, user } = useAuth()
  const { showToast } = useToast()
  
  const [basketData, setBasketData] = useState({ basket: null, items: [], totalCases: 0, totalZAR: 0 })
  const [loading, setLoading] = useState(true)
  const [partners, setPartners] = useState([])
  const [selectedPartner, setSelectedPartner] = useState('')
  const [copied, setCopied] = useState(false)
  const [poolStatus, setPoolStatus] = useState(null)

  const fetchPoolStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/basket/pool-status/my', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      setPoolStatus(res.ok ? data : null)
    } catch {
      setPoolStatus(null)
    }
  }, [accessToken])

  const fetchBasket = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/basket', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      
      const formattedData = {
        basket: data.basket || data,
        items: data.items || [],
        totalCases: data.totalCases || 0,
        totalZAR: data.totalZAR || 0,
      }
      
      setBasketData(formattedData)
      if (onBasketChanged) onBasketChanged(formattedData.totalCases)
    } catch {
      showToast('Could not load basket', 'error')
    } finally {
      setLoading(false)
    }
  }, [accessToken, onBasketChanged, showToast])

  useEffect(() => {
    fetchBasket()
    fetchPoolStatus()
    const geoQuery = user?.latitude != null && user?.longitude != null
      ? `?lat=${user.latitude}&lng=${user.longitude}`
      : ''
    fetch(`/api/basket/partners${geoQuery}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setPartners(Array.isArray(data) ? data : []))
      .catch(() => setPartners([]))
  }, [accessToken, fetchBasket, fetchPoolStatus, user?.latitude, user?.longitude])

  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return removeItem(itemId)
    try {
      const res = await fetch(`/api/basket/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ quantity: newQuantity }),
      })
      if (!res.ok) throw new Error()
      fetchBasket()
    } catch {
      showToast('Could not update quantity', 'error')
    }
  }

  const removeItem = async (itemId) => {
    try {
      await fetch(`/api/basket/items/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      showToast('Item removed from cart', 'info')
      fetchBasket()
    } catch {
      showToast('Could not remove item', 'error')
    }
  }

  const submitToPool = async () => {
    if (!selectedPartner) return showToast('Choose a partner tavern/butchery first', 'error')
    try {
      const res = await fetch('/api/basket/submit-to-pool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ basketId: basketData.basket?.id, partnerId: selectedPartner }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit cart.')
      showToast(data.message || 'Cart submitted successfully!', 'success')
      fetchBasket()
      fetchPoolStatus()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const [cancellingPool, setCancellingPool] = useState(false)
  const cancelParkedBasket = async () => {
    if (!poolStatus?.basketId) return
    setCancellingPool(true)
    try {
      const res = await fetch('/api/basket/pool/cancel-basket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ basketId: poolStatus.basketId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not withdraw cart')
      showToast(data.message || 'Withdrawn from pool', 'info')
      setPoolStatus(null)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setCancellingPool(false)
    }
  }

  const shareBasket = () => {
    if (!basketData.items || basketData.items.length === 0) return
    const text = basketData.items
      .map((i) => `${i.sku?.name || 'Item'} x${quantityLabel(i.sku, i.quantity)}`)
      .join('\n')
    const summary = `My Wholesale Cart:\n\n${text}\n\nTotal units: ${basketData.totalCases}\nTotal: R${basketData.totalZAR.toFixed(2)}`

    if (navigator.share) {
      navigator.share({ title: 'My Wholesale Cart', text: summary }).catch(() => {})
    } else {
      navigator.clipboard.writeText(summary)
      setCopied(true)
      showToast('Cart copied to clipboard', 'info')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Recruits more people into this SmartMatch pool — the whole point of
  // showing tiers at all. Every number here is real (real cases, real
  // pallets, real partner/area); the price line only appears when a real
  // negotiated case price exists for that tier, never a guessed discount.
  const [invited, setInvited] = useState(false)
  const inviteToSmartMatch = () => {
    if (!poolStatus) return
    const sm = poolStatus.smartMatch
    const pallets = sm.pallets.toFixed(1)
    const lines = [
      `Pooling a bulk order with ${poolStatus.partnerName} near ${poolStatus.area} on iCamagu SmartMatch.`,
      sm.currentTier
        ? `We're at ${sm.currentTier.name} — ${pallets} pallets so far${sm.currentTier.casePriceZAR ? ` (R${Number(sm.currentTier.casePriceZAR).toFixed(2)}/case)` : ''}.`
        : `We're at ${pallets} pallets so far, working toward our first tier.`,
      sm.nextTier &&
        `${sm.casesToNextTier} more cases unlocks ${sm.nextTier.name}${sm.nextTier.casePriceZAR ? ` at R${Number(sm.nextTier.casePriceZAR).toFixed(2)}/case` : ''} for everyone in the pool.`,
      `Join and add your order:`,
    ].filter(Boolean)
    const text = lines.join('\n\n')

    if (navigator.share) {
      navigator.share({ title: 'Join our SmartMatch pool', text }).catch(() => {})
    } else {
      navigator.clipboard.writeText(text)
      setInvited(true)
      showToast('Invite copied — paste it into WhatsApp', 'info')
      setTimeout(() => setInvited(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pb-24 bg-cream px-4 pt-6 space-y-3 max-w-md mx-auto">
        <Skeleton className="h-20 w-full rounded-soft" />
        <Skeleton className="h-20 w-full rounded-soft" />
        <Skeleton className="h-20 w-full rounded-soft" />
      </div>
    )
  }

  const itemsList = basketData.items || []
  // Only counts items with a real, researched retailPriceZAR comparable —
  // never a fabricated "you saved" figure.
  const totalSavings = itemsList.reduce((sum, item) => {
    const retail = item.sku?.retailPriceZAR ? parseFloat(item.sku.retailPriceZAR) : null
    const casePrice = parseFloat(item.sku?.casePriceZAR || 0)
    if (!retail || retail <= casePrice) return sum
    return sum + (retail - casePrice) * item.quantity
  }, 0)
  const groupedItems = itemsList.reduce((map, item) => {
    const g = departmentOf(item.sku).id
    if (!map[g]) map[g] = []
    map[g].push(item)
    return map
  }, {})

  return (
    <div className="min-h-screen pb-24 bg-cream px-4 pt-6 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold text-sage-600 hover:text-sage-700 uppercase tracking-wider flex items-center gap-1"
        >
          ← Back to Store
        </button>
        {itemsList.length > 0 && (
          <button
            type="button"
            onClick={shareBasket}
            className="bg-terracotta text-cream text-xs font-black px-3 py-1.5 rounded-pill shadow-soft active:scale-95 transition-transform"
          >
            {copied ? 'Copied!' : 'Share Cart 🔗'}
          </button>
        )}
      </div>

      <h2 className="font-display font-bold text-2xl text-ink mb-4">My Cart 🛒</h2>

      {poolStatus && (
        <div className="bg-gradient-to-br from-terracotta to-brand-ochre text-white rounded-soft p-4 mb-4 shadow-soft">
          <p className="text-[10px] font-black uppercase tracking-wider text-white/80 mb-1">Smart Match</p>
          <p className="text-sm font-bold mb-2">
            {poolStatus.poolStatus === 'MATCHED'
              ? `Matched! Your order pooled with other members via ${poolStatus.partnerName}.`
              : `Pooling with other members near ${poolStatus.area} via ${poolStatus.partnerName} — the more members join, the bigger the discount.`}
          </p>
          {poolStatus.poolStatus !== 'MATCHED' && poolStatus.smartMatch && (
            <>
              {poolStatus.smartMatch.currentTier && (
                <p className="text-[11px] font-black uppercase tracking-wide text-white bg-white/20 inline-block px-2 py-1 rounded-pill mb-2">
                  🌟 {poolStatus.smartMatch.currentTier.name} unlocked — {poolStatus.smartMatch.pallets.toFixed(1)} pallets
                  {poolStatus.smartMatch.currentTier.casePriceZAR ? ` · R${Number(poolStatus.smartMatch.currentTier.casePriceZAR).toFixed(2)}/case` : ''}
                </p>
              )}

              {/* 4-tier ladder: one segment per pallet band. Filled tiers are
                  behind us, the current tier fills to how far through its own
                  band we are, tiers ahead sit empty. Price shows only when a
                  real quote has been entered for that tier — otherwise "TBC",
                  never a guessed number. */}
              <div className="grid grid-cols-4 gap-1 mb-1.5">
                {TIERS.map((tier) => {
                  const pallets = poolStatus.smartMatch.pallets
                  const isCurrent = poolStatus.smartMatch.currentTier?.id === tier.id
                  // A band spans from its own minimum to the next tier's minimum
                  // (the open-ended top tier gets a nominal 4-pallet span just
                  // so its bar has something to fill toward).
                  const span = (tier.maxPallets === Infinity ? tier.minPallets + 4 : tier.maxPallets + 1) - tier.minPallets
                  const withinBand = Math.min(1, Math.max(0, (pallets - tier.minPallets) / span))
                  const fillFraction = pallets < tier.minPallets ? 0 : isCurrent ? withinBand : 1
                  const price = poolStatus.smartMatch.tierCasePricing?.[String(tier.id)]
                  return (
                    <div key={tier.id} className="min-w-0">
                      <div className="h-1.5 w-full bg-white/25 rounded-pill overflow-hidden">
                        <div
                          className="h-full bg-white rounded-pill transition-all"
                          style={{ width: `${Math.round(fillFraction * 100)}%` }}
                        />
                      </div>
                      <p className="text-[9px] text-white/80 mt-0.5 truncate">{tier.minPallets}{tier.maxPallets === Infinity ? '+' : `-${tier.maxPallets}`}P</p>
                      <p className="text-[9px] font-bold text-white truncate">{price ? `R${Number(price).toFixed(0)}` : 'TBC'}</p>
                    </div>
                  )
                })}
              </div>

              <p className="text-xs text-white/90 mb-1">
                {poolStatus.currentCases} cases pooled ({poolStatus.smartMatch.pallets.toFixed(1)} pallets)
                {poolStatus.smartMatch.nextTier && (
                  <> — {poolStatus.smartMatch.casesToNextTier} more cases unlocks {poolStatus.smartMatch.nextTier.name}</>
                )}
              </p>
              {!poolStatus.smartMatch.nextTier && (
                <p className="text-xs text-white/90 mb-1">Top tier reached — thank the people who joined you.</p>
              )}
              {poolStatus.windowDeadline && (
                <p className="text-[11px] text-white/75 mb-2">{windowClosesLabel(poolStatus.windowDeadline)}</p>
              )}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={inviteToSmartMatch}
                  className="bg-white text-terracotta text-xs font-black px-3 py-1.5 rounded-pill shadow-soft active:scale-95 transition-transform"
                >
                  {invited ? 'Copied!' : 'Invite on WhatsApp 📲'}
                </button>
                <button
                  type="button"
                  onClick={cancelParkedBasket}
                  disabled={cancellingPool}
                  className="text-xs font-bold text-white/90 underline disabled:opacity-50"
                >
                  {cancellingPool ? 'Withdrawing...' : 'Withdraw from this pool'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {itemsList.length === 0 ? (
        <EmptyState
          emoji="🛒"
          title="Your cart is empty"
          description="Browse the Store to add items toward a collective order."
          primaryLabel="Go to Store"
          onPrimary={onBack}
        />
      ) : (
        <>
          {/* Cart Items, segmented by group like the Store */}
          <div className="space-y-5 mb-4">
            {DEPARTMENTS.filter((d) => groupedItems[d.id]?.length).map((d) => {
              const g = d.id
              const groupItems = groupedItems[g]
              const groupSubtotal = groupItems.reduce(
                (sum, item) => sum + item.quantity * parseFloat(item.sku?.casePriceZAR || 0),
                0
              )
              return (
                <div key={g}>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <p className="eyebrow text-terracotta">{d.name}</p>
                    <p className="text-xs font-bold text-ink-muted">R{groupSubtotal.toFixed(2)}</p>
                  </div>
                  <div className="space-y-3">
                    {groupItems.map((item) => {
                      const imgSrc = item?.sku?.imageUrl || null
                      return (
                        <div
                          key={item.id}
                          className="card-paper flex items-center gap-3 p-3"
                        >
                          {imgSrc ? (
                            <img
                              src={imgSrc}
                              alt={item.sku?.name || 'Item'}
                              className="w-14 h-14 object-cover rounded-soft shrink-0"
                              onError={(e) => { e.target.style.display = 'none' }}
                            />
                          ) : (
                            <span className="w-14 h-14 rounded-soft bg-terracotta/10 flex items-center justify-center shrink-0">
                              <Icon name={g === 'meat' ? 'users' : g === 'beverages' ? 'cocktail' : 'package'} size={20} color="#c45c26" />
                            </span>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-sm text-ink truncate">{item.sku?.name || 'Item'}</h3>
                            <p className="text-xs text-ink-muted">{item.sku?.bottleFormat || 'Standard Wholesale'}</p>
                            <p className="text-sm font-bold text-sage-600">
                              R{parseFloat(item.sku?.casePriceZAR || 0).toFixed(2)} / {unitOf(item.sku)}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="w-8 h-8 rounded-pill bg-cream-dark text-ink font-bold active:scale-90 transition-transform"
                            >
                              −
                            </button>
                            <span className="font-bold text-sm w-5 text-center text-ink">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-8 h-8 rounded-pill bg-sage-500 text-white font-bold active:scale-90 transition-transform"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Totals Summary */}
          <div className="bg-sage-50 border-2 border-sage-500 rounded-soft p-4 mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-ink-light">Total units</span>
              <span className="font-bold text-ink">{basketData.totalCases}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-ink-light">Total Value</span>
              <span className="font-display font-extrabold text-lg text-sage-700">
                R{basketData.totalZAR.toFixed(2)}
              </span>
            </div>
            {totalSavings > 0 && (
              <div className="flex justify-between items-center mt-1 pt-1 border-t border-sage-200">
                <span className="text-xs font-bold text-sage-700">vs. retail price</span>
                <span className="text-sm font-black text-sage-700">You're saving R{totalSavings.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Partner Bulk Pool Section */}
          <div className="bg-white border border-cream-dark rounded-soft p-4 shadow-soft">
            <p className="text-xs font-black uppercase text-ink-muted mb-1">Smart Match — Join a Bulk Order</p>
            <p className="text-xs text-ink-muted mb-2">
              iCamagu pools your cart with other members buying alcohol or livestock/meat from the same partner, so everyone unlocks bulk pricing sooner — even across different stokvels.
            </p>
            <select
              value={selectedPartner}
              onChange={(e) => setSelectedPartner(e.target.value)}
              className="w-full border border-cream-dark rounded-soft px-3 py-2.5 mb-3 bg-cream text-xs font-bold text-ink"
            >
              <option value="">Choose a partner tavern/butchery</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.area}){p.distanceKm != null ? ` · ${p.distanceKm}km away` : ''}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={submitToPool}
              className="w-full bg-sage-500 hover:bg-sage-600 text-white font-bold py-3 rounded-pill shadow-glow active:scale-[0.96] transition-transform text-sm"
            >
              Submit Cart to Bulk Pool
            </button>
          </div>
        </>
      )}
    </div>
  )
}
