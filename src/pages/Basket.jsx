import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import Icon from '../components/Icon.jsx'
import { DEPARTMENTS, departmentOf } from '../data/storeTaxonomy.js'
import { unitOf, quantityLabel } from '../data/bulkUnits.js'
import { resolveOrderStage } from '../data/orderStages.js'
import { OrderStageTracker } from '../components/ui/OrderStageTracker.jsx'
import { CATEGORY_LABEL } from '../data/poolCategories.js'

// A pool only has a deadline at all when whoever opened it set a real
// target date (e.g. "this is for December") — no more fixed universal
// window. Real data from BulkPool.deadline, no fabricated countdown. Close
// in (hours/days) reads fine for a near-term deadline; a target date
// that's genuinely far out reads better as the actual date than as
// "closes in 83 days".
function windowClosesLabel(windowDeadline) {
  const deadline = new Date(windowDeadline)
  const msLeft = deadline.getTime() - Date.now()
  if (msLeft <= 0) return 'The target date has passed — new members are joining a fresh pool.'
  const hoursLeft = Math.ceil(msLeft / (60 * 60 * 1000))
  if (hoursLeft <= 1) return 'This pool closes to new members in under an hour.'
  if (hoursLeft < 24) return `This pool closes to new members in ${hoursLeft}h.`
  const daysLeft = Math.round(hoursLeft / 24)
  if (daysLeft <= 14) return `This pool closes to new members in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`
  return `Pooling until ${deadline.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' })}.`
}

// A tier's real value, worded for whichever basis this pool uses — a
// case price for a pallet pool, a discount percentage for an amount pool.
// Null (no real quote entered yet) renders as nothing, never a guessed number.
function tierValueLabel(tier, basis) {
  if (!tier || tier.value == null) return ''
  return basis === 'AMOUNT' ? `${Number(tier.value)}% off` : `R${Number(tier.value).toFixed(2)}/case`
}

export default function Basket({ onBack, onBasketChanged, onGoToOrders }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()

  const [basketData, setBasketData] = useState({ basket: null, items: [], totalCases: 0, totalZAR: 0 })
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [targetDate, setTargetDate] = useState('')
  // A single cart submission can now split into more than one pool — one
  // per category (drinks, meat & livestock, groceries, produce), since a
  // pool is always one category. So this is a list, not one.
  const [poolStatuses, setPoolStatuses] = useState([])
  const [cancellingId, setCancellingId] = useState(null)
  const [invitedId, setInvitedId] = useState(null)
  // Set when this member arrived via a real "join this pool" invite link
  // (see inviteToSmartMatch below and /pool/:id in App.jsx) and hasn't
  // submitted yet — null once dismissed or consumed by a submission.
  const [joiningPool, setJoiningPool] = useState(null)

  const fetchPoolStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/basket/pool-status/my', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      setPoolStatuses(res.ok && Array.isArray(data) ? data : [])
    } catch {
      setPoolStatuses([])
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
  }, [fetchBasket, fetchPoolStatus])

  useEffect(() => {
    const pendingId = localStorage.getItem('icamagu_join_pool_id')
    if (!pendingId || !accessToken) return
    fetch(`/api/basket/pool/${pendingId}/summary`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        // A pool that's gone or no longer OPEN can't be joined — don't
        // keep prompting for it.
        if (data && data.status === 'OPEN') setJoiningPool(data)
        else localStorage.removeItem('icamagu_join_pool_id')
      })
      .catch(() => localStorage.removeItem('icamagu_join_pool_id'))
  }, [accessToken])

  const dismissJoiningPool = () => {
    localStorage.removeItem('icamagu_join_pool_id')
    setJoiningPool(null)
  }

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

  // No partner picker — a member has no real basis to choose between
  // outlets, so the app matches each item to the right pool itself, based
  // on category, location, and which pool is already closest to unlocking.
  const submitToPool = async () => {
    if (!basketData.basket?.id) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/basket/submit-to-pool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          basketId: basketData.basket.id,
          targetDate: targetDate || undefined,
          joinPoolId: joiningPool?.id || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit cart.')
      showToast(data.message || 'Cart submitted successfully!', 'success')
      setTargetDate('')
      // The join attempt is consumed either way — whether it landed them
      // in the invited pool or, honestly, a fresh one because the invite
      // had gone stale (see the message itself for which happened).
      if (joiningPool) dismissJoiningPool()
      fetchBasket()
      fetchPoolStatus()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const cancelParkedBasket = async (basketId) => {
    if (!basketId) return
    setCancellingId(basketId)
    try {
      const res = await fetch('/api/basket/pool/cancel-basket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ basketId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not withdraw cart')
      showToast(data.message || 'Withdrawn from pool', 'info')
      setPoolStatuses((prev) => prev.filter((p) => p.basketId !== basketId))
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setCancellingId(null)
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
  // showing tiers at all. Every number here is real (real cases or Rand,
  // real partner/area); a tier's value only appears when a real negotiated
  // figure exists for it, never a guessed discount.
  const inviteToSmartMatch = (poolStatus) => {
    const sm = poolStatus.smartMatch
    const isAmount = sm.basis === 'AMOUNT'
    const standing = isAmount
      ? `R${sm.currentAmountZAR.toFixed(2)} pooled so far`
      : `${sm.pallets.toFixed(1)} pallets pooled so far`
    const lines = [
      `Pooling a ${CATEGORY_LABEL[poolStatus.category].toLowerCase()} bulk order${poolStatus.partnerName ? ` with ${poolStatus.partnerName}` : ''} near ${poolStatus.area} on iCamagu SmartMatch.`,
      sm.currentTier
        ? `We're at ${sm.currentTier.name} — ${standing}${tierValueLabel(sm.currentTier, sm.basis) ? ` (${tierValueLabel(sm.currentTier, sm.basis)})` : ''}.`
        : `We're at ${standing}${sm.nextTier ? ', working toward our first tier' : ''}.`,
      sm.nextTier &&
        `${isAmount ? `R${sm.toNextTier}` : `${sm.toNextTier} more cases`} unlocks ${sm.nextTier.name}${tierValueLabel(sm.nextTier, sm.basis) ? ` at ${tierValueLabel(sm.nextTier, sm.basis)}` : ''} for everyone in the pool.`,
      // Tier names like "Amazibazana Goal" are a fixed, standard ladder
      // used across every alcohol pool platform-wide — not specific to
      // this group — spelled out here since it reads as a mismatched
      // group name otherwise.
      !isAmount && (sm.currentTier || sm.nextTier) &&
        `(Tier names are standard across every iCamagu drinks pool, not specific to this group.)`,
      `Join and add your order:`,
      // The actual point of the message — without this, "Join and add
      // your order" had nothing to tap. Only buildable now that poolId
      // comes back from /pool-status/my; tapping it lands the recipient
      // in this exact pool, not just "somewhere in their own area."
      poolStatus.poolId ? `${window.location.origin}/pool/${poolStatus.poolId}` : null,
    ].filter(Boolean)
    const text = lines.join('\n\n')

    if (navigator.share) {
      navigator.share({ title: 'Join our SmartMatch pool', text }).catch(() => {})
    } else {
      navigator.clipboard.writeText(text)
      setInvitedId(poolStatus.basketId)
      showToast('Invite copied — paste it into WhatsApp', 'info')
      setTimeout(() => setInvitedId(null), 2000)
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
            className="bg-terracotta text-cream text-xs font-black px-3 py-1.5 rounded-pill shadow-soft active:scale-95 transition-transform flex items-center gap-1.5"
          >
            {copied ? 'Copied!' : <><Icon name="share" size={12} color="#fdf8f0" /> Share Cart</>}
          </button>
        )}
      </div>

      <h2 className="font-display font-bold text-2xl text-ink mb-4 flex items-center gap-2">
        <Icon name="cart" size={22} color="#2b2620" /> My Cart
      </h2>

      {joiningPool && (
        <div className="bg-white border-2 border-sage-600 rounded-soft p-4 mb-4 shadow-soft">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-sage-700">
              You were invited to a pool
            </p>
            <button type="button" onClick={dismissJoiningPool} className="text-ink/40 hover:text-ink/70 text-xs font-bold shrink-0">
              Not now
            </button>
          </div>
          <p className="text-sm font-bold text-ink mb-1">
            {CATEGORY_LABEL[joiningPool.category]} pool near {joiningPool.area}
            {joiningPool.partnerName ? ` with ${joiningPool.partnerName}` : ''}
          </p>
          <p className="text-xs text-ink/60">
            Add {CATEGORY_LABEL[joiningPool.category].toLowerCase()} items and submit your cart to join this exact pool — not just a new one in your own area.
          </p>
        </div>
      )}

      {poolStatuses.map((poolStatus) => (
        <div key={poolStatus.basketId} className="bg-gradient-to-br from-terracotta to-brand-ochre text-white rounded-soft p-4 mb-4 shadow-soft">
          <p className="text-[10px] font-black uppercase tracking-wider text-white/80 mb-1">
            Smart Match — {CATEGORY_LABEL[poolStatus.category]}
          </p>
          {poolStatus.partnerName && (
            <p className="text-[11px] font-bold text-white/90 mb-1 flex items-center gap-1">
              <Icon name="check" size={11} color="#fff" /> Confirmed supplier: {poolStatus.partnerName}
            </p>
          )}
          <p className="text-sm font-bold mb-2">
            {poolStatus.poolStatus === 'OPEN'
              ? `Pooling with other members near ${poolStatus.area}${poolStatus.partnerName ? ` via ${poolStatus.partnerName}` : ''} — the more members join, the bigger the discount.`
              : poolStatus.poolStatus === 'FULFILLED'
                ? `Delivered/collected — your order${poolStatus.partnerName ? ` from ${poolStatus.partnerName}` : ''} is complete.`
                : `Matched! Your order pooled with other members${poolStatus.partnerName ? ` via ${poolStatus.partnerName}` : ''}.`}
          </p>

          <div className="mb-3">
            <OrderStageTracker currentIndex={resolveOrderStage(poolStatus.poolStatus, poolStatus.payment)} tone="dark" />
          </div>

          {poolStatus.poolStatus !== 'OPEN' && (
            <div className="mb-3 pt-3 border-t border-white/20">
              {poolStatus.poolStatus === 'FULFILLED' ? (
                <p className="text-xs text-white/90 mb-2">This order is done — see the full record any time in My Orders.</p>
              ) : poolStatus.payment?.status === 'CLEARED' ? (
                <p className="text-xs text-white/90 mb-2">Your payment is confirmed — waiting on the supplier to fulfil the order.</p>
              ) : poolStatus.payment?.hasReference ? (
                <p className="text-xs text-white/90 mb-2">Your EFT reference is in — waiting on the supplier to confirm receipt.</p>
              ) : !poolStatus.partnerName ? (
                <p className="text-xs text-white/90 mb-2">
                  MOQ reached! We're finalizing a supplier for this pool now — payment details will show here as soon as one is confirmed.
                </p>
              ) : (
                <p className="text-xs text-white/90 mb-2">
                  MOQ reached — pay your share (R{poolStatus.payment?.amountZAR ? Number(poolStatus.payment.amountZAR).toFixed(2) : '—'}) via EFT and enter your reference in My Orders.
                </p>
              )}
              {onGoToOrders && (
                <button
                  type="button"
                  onClick={onGoToOrders}
                  className="bg-white text-terracotta text-xs font-black px-3 py-1.5 rounded-pill shadow-soft active:scale-95 transition-transform"
                >
                  Track my order →
                </button>
              )}
            </div>
          )}

          {poolStatus.poolStatus === 'OPEN' && poolStatus.smartMatch && (() => {
            const sm = poolStatus.smartMatch
            const isAmount = sm.basis === 'AMOUNT'
            // A band's own label — pallets read as "1-3P"; Rand thresholds
            // read as a plain "R" figure, since there's no universal unit
            // to abbreviate them to.
            const bandLabel = (tier, i, ladder) => {
              if (!isAmount) return `${tier.min}${i === ladder.length - 1 ? '+' : `-${ladder[i + 1].min - 1}`}P`
              return `R${tier.min.toLocaleString('en-ZA')}+`
            }
            return (
              <>
                {sm.currentTier && (
                  <p className="text-[11px] font-black uppercase tracking-wide text-white bg-white/20 inline-flex items-center gap-1 px-2 py-1 rounded-pill mb-2">
                    <Icon name="check" size={11} color="#fff" strokeWidth={2.5} /> {sm.currentTier.name} unlocked
                    {tierValueLabel(sm.currentTier, sm.basis) && ` · ${tierValueLabel(sm.currentTier, sm.basis)}`}
                  </p>
                )}

                {/* The tier ladder: one segment per band, in whichever unit
                    this pool is measured — pallets (alcohol) or Rand pooled
                    (groceries, livestock). Filled tiers are behind us, the
                    current tier fills to how far through its own band we
                    are, tiers ahead sit empty. A tier's value shows only
                    when a real quote has been entered for it — otherwise
                    "TBC", never a guessed number. An AMOUNT pool with no
                    ladder at all shows a plain running total instead, since
                    there's no honest default band structure to draw. */}
                {sm.ladder ? (
                  <div className="grid gap-1 mb-1.5" style={{ gridTemplateColumns: `repeat(${sm.ladder.length}, minmax(0, 1fr))` }}>
                    {sm.ladder.map((tier, i) => {
                      const metric = isAmount ? sm.currentAmountZAR : sm.pallets
                      const isCurrent = sm.currentTier?.id === tier.id
                      // The open-ended top tier has no real ceiling to size its
                      // band against, so it borrows the previous band's width —
                      // a visual nicety only, it doesn't affect any real number.
                      const prevSpan = i > 0 ? tier.min - sm.ladder[i - 1].min : isAmount ? 1000 : 4
                      const nextMin = i + 1 < sm.ladder.length ? sm.ladder[i + 1].min : tier.min + prevSpan
                      const span = Math.max(1, nextMin - tier.min)
                      const withinBand = Math.min(1, Math.max(0, (metric - tier.min) / span))
                      const fillFraction = metric < tier.min ? 0 : isCurrent ? withinBand : 1
                      return (
                        <div key={tier.id} className="min-w-0">
                          <div className="h-1.5 w-full bg-white/25 rounded-pill overflow-hidden">
                            <div
                              className="h-full bg-white rounded-pill transition-all"
                              style={{ width: `${Math.round(fillFraction * 100)}%` }}
                            />
                          </div>
                          <p className="text-[9px] text-white/80 mt-0.5 truncate">{bandLabel(tier, i, sm.ladder)}</p>
                          <p className="text-[9px] font-bold text-white truncate">
                            {tier.value != null ? (isAmount ? `${tier.value}%` : `R${Number(tier.value).toFixed(0)}`) : 'TBC'}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-white/90 mb-1.5">Volume discount tiers aren't set up for this pool yet.</p>
                )}

                {sm.ladder && !isAmount && (
                  <p className="text-[10px] text-white/60 mb-1.5">
                    Tier names like "{sm.ladder[0].name}" are standard across every iCamagu drinks pool — not specific to this group.
                  </p>
                )}

                <p className="text-xs text-white/90 mb-1">
                  {isAmount
                    ? `R${sm.currentAmountZAR.toFixed(2)} pooled`
                    : `${poolStatus.currentCases} cases pooled (${sm.pallets.toFixed(1)} pallets)`}
                  {sm.nextTier && (
                    <> — {isAmount ? `R${sm.toNextTier}` : `${sm.toNextTier} more cases`} unlocks {sm.nextTier.name}</>
                  )}
                </p>
                {sm.ladder && !sm.nextTier && (
                  <p className="text-xs text-white/90 mb-1">Top tier reached — thank the people who joined you.</p>
                )}
                {poolStatus.windowDeadline && (
                  <p className="text-[11px] text-white/75 mb-2">{windowClosesLabel(poolStatus.windowDeadline)}</p>
                )}
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => inviteToSmartMatch(poolStatus)}
                    className="bg-white text-terracotta text-xs font-black px-3 py-1.5 rounded-pill shadow-soft active:scale-95 transition-transform flex items-center gap-1.5"
                  >
                    {invitedId === poolStatus.basketId ? 'Copied!' : <><Icon name="send" size={12} color="#c45c26" /> Invite on WhatsApp</>}
                  </button>
                  <button
                    type="button"
                    onClick={() => cancelParkedBasket(poolStatus.basketId)}
                    disabled={cancellingId === poolStatus.basketId}
                    className="text-xs font-bold text-white/90 underline disabled:opacity-50"
                  >
                    {cancellingId === poolStatus.basketId ? 'Withdrawing...' : 'Withdraw from this pool'}
                  </button>
                </div>
              </>
            )
          })()}
        </div>
      ))}

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
                              <Icon name={g === 'beverages' ? 'cocktail' : 'package'} size={20} color="#c45c26" />
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
                              aria-label={`Decrease quantity of ${item.sku?.name || 'item'}`}
                              className="w-11 h-11 rounded-pill bg-cream-dark text-ink font-bold active:scale-90 transition-transform"
                            >
                              −
                            </button>
                            <span className="font-bold text-sm w-5 text-center text-ink">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              aria-label={`Increase quantity of ${item.sku?.name || 'item'}`}
                              className="w-11 h-11 rounded-pill bg-sage-500 text-white font-bold active:scale-90 transition-transform"
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

          {/* Submit to Bulk Pool — no partner picker. Which outlet a
              member's order pools with isn't something they have a real
              basis to choose (it depends on who's nearby and whose pool is
              already closest to unlocking) — the app matches it automatically. */}
          <div className="bg-white border border-cream-dark rounded-soft p-4 shadow-soft">
            <p className="text-xs font-black uppercase text-ink-muted mb-1">Smart Match — Join a Bulk Order</p>
            <p className="text-xs text-ink-muted mb-3">
              iCamagu automatically pools your cart with other members buying the same kind of thing nearby — even across different stokvels — and matches you to whichever pool gets you to bulk pricing soonest. Drinks and other items are matched to their own pools.
            </p>

            <label className="block text-[11px] font-bold text-ink-muted mb-1">
              Planning ahead? Set a target date (optional)
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}
              className="w-full border border-cream-dark rounded-soft px-3 py-2.5 mb-1 bg-cream text-xs font-bold text-ink"
            />
            <p className="text-[11px] text-ink-muted mb-3">
              {targetDate
                ? `Only applies if this starts a brand-new pool — it'll stay open to new members until then instead of closing quickly.`
                : `Leave blank to pool as soon as possible — only applies if this starts a brand-new pool, not one you're joining.`}
            </p>

            <button
              type="button"
              onClick={submitToPool}
              disabled={submitting}
              className="w-full bg-sage-500 hover:bg-sage-600 text-white font-bold py-3 rounded-pill shadow-glow active:scale-[0.96] transition-transform text-sm disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Cart to Bulk Pool'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
