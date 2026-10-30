import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useCommunity } from '../context/CommunityContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import Icon from '../components/Icon.jsx'
import { DEPARTMENTS, departmentOf } from '../data/storeTaxonomy.js'
import { unitOf, quantityLabel } from '../data/bulkUnits.js'
import { resolveOrderStage } from '../data/orderStages.js'
import { OrderStageTracker } from '../components/ui/OrderStageTracker.jsx'
import { CATEGORY_LABEL } from '../data/poolCategories.js'
import CheckoutPanel from '../components/checkout/CheckoutPanel.jsx'

// Same key the /pool/:id invite route uses — "Add to this pool" reuses it,
// so a member's own pool and an invited pool follow exactly one join path.
const JOIN_POOL_KEY = 'icamagu_join_pool_id'

// A pool only has a deadline when whoever opened it set a real target date.
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

// A tier's real value — a case price (pallet pool) or % off (amount pool).
// Null (no real quote entered yet) renders as nothing, never a guessed number.
function tierValueLabel(tier, basis) {
  if (!tier || tier.value == null) return ''
  return basis === 'AMOUNT' ? `${Number(tier.value)}% off` : `R${Number(tier.value).toFixed(2)}/case`
}

export default function Basket({ onBack, onBasketChanged, onGoToOrders }) {
  const { accessToken, user, updateUser } = useAuth()
  const { refreshPools } = useCommunity()
  const { showToast } = useToast()

  const [basketData, setBasketData] = useState({ basket: null, items: [], totalCases: 0, totalZAR: 0 })
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // One entry per pool the member is in (the server groups their baskets).
  const [poolStatuses, setPoolStatuses] = useState([])
  const [cancellingId, setCancellingId] = useState(null)
  const [invitedId, setInvitedId] = useState(null)
  // The pool this cart is being shopped for — set by an invite link OR the
  // "Add to this pool" button. Null means "match me automatically".
  const [joiningPool, setJoiningPool] = useState(null)
  const [areaMissing, setAreaMissing] = useState(false)

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
    const pendingId = localStorage.getItem(JOIN_POOL_KEY)
    if (!pendingId || !accessToken) return
    fetch(`/api/basket/pool/${pendingId}/summary`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        // A pool that's gone or no longer OPEN can't be joined.
        if (data && data.status === 'OPEN') setJoiningPool(data)
        else localStorage.removeItem(JOIN_POOL_KEY)
      })
      .catch(() => localStorage.removeItem(JOIN_POOL_KEY))
  }, [accessToken])

  const dismissJoiningPool = () => {
    localStorage.removeItem(JOIN_POOL_KEY)
    setJoiningPool(null)
  }

  // "Add to this pool": remember the pool, then send the member shopping.
  // Whatever they submit next goes into this exact pool.
  const shopForPool = (poolStatus) => {
    localStorage.setItem(JOIN_POOL_KEY, poolStatus.poolId)
    setJoiningPool({
      id: poolStatus.poolId,
      category: poolStatus.category,
      area: poolStatus.area,
      status: 'OPEN',
      currentCases: poolStatus.currentCases,
      moqTarget: poolStatus.moqTarget,
      isMine: true,
    })
    const label = CATEGORY_LABEL[poolStatus.category].toLowerCase()
    if ((basketData.items || []).length === 0) {
      showToast(`Add ${label} items, then come back and submit — they'll go into this pool.`, 'info')
      onBack()
    } else {
      showToast(`Your cart will be added to your ${label} pool near ${poolStatus.area} when you submit.`, 'info')
    }
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

  // One checkout for both paths: pooled ("Buy together") or a normal
  // one-person order ("Buy on my own"), delivered to any typed address.
  const submitCheckout = async ({ mode, delivery, joinPoolIds, targetDate }) => {
    if (!basketData.basket?.id) return
    setSubmitting(true)
    setAreaMissing(false)
    try {
      const res = await fetch('/api/basket/submit-to-pool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ basketId: basketData.basket.id, mode, delivery, joinPoolIds, targetDate }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'AREA_REQUIRED') setAreaMissing(true)
        throw new Error(data.error || 'Failed to submit cart.')
      }
      showToast(data.message || 'Order placed!', 'success', 6000)
      if (joiningPool) dismissJoiningPool()
      fetchBasket()
      fetchPoolStatus()
      refreshPools()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // "Save as my usual address" — fills the profile so next time is one tap.
  const saveDeliveryAsProfile = async (delivery) => {
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          address: delivery.address,
          location: delivery.area || undefined,
          ...(delivery.latitude != null && delivery.longitude != null
            ? { latitude: delivery.latitude, longitude: delivery.longitude }
            : {}),
        }),
      })
      if (res.ok) updateUser(await res.json())
    } catch {
      // Saving is a convenience; the order still goes through.
    }
  }

  // Withdraws every one of this member's parked baskets in the pool.
  const cancelParkedBasket = async (poolStatus) => {
    const ids = poolStatus.basketIds?.length ? poolStatus.basketIds : [poolStatus.basketId]
    setCancellingId(poolStatus.poolId)
    try {
      for (const basketId of ids) {
        const res = await fetch('/api/basket/pool/cancel-basket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ basketId }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Could not withdraw cart')
      }
      showToast('Withdrawn from pool', 'info')
      if (joiningPool?.id === poolStatus.poolId) dismissJoiningPool()
      setPoolStatuses((prev) => prev.filter((p) => p.poolId !== poolStatus.poolId))
    } catch (err) {
      showToast(err.message, 'error')
      fetchPoolStatus()
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

  // Recruits more people into this SmartMatch pool. Every number is real.
  const inviteToSmartMatch = (poolStatus) => {
    const sm = poolStatus.smartMatch
    const isAmount = sm.basis === 'AMOUNT'
    const standing = isAmount
      ? `R${sm.currentAmountZAR.toFixed(2)} pooled so far`
      : `${sm.pallets.toFixed(1)} pallets pooled so far`
    const lines = [
      `Pooling a ${CATEGORY_LABEL[poolStatus.category].toLowerCase()} bulk order near ${poolStatus.area} on iCamagu SmartMatch.`,
      sm.currentTier
        ? `We're at ${sm.currentTier.name} — ${standing}${tierValueLabel(sm.currentTier, sm.basis) ? ` (${tierValueLabel(sm.currentTier, sm.basis)})` : ''}.`
        : `We're at ${standing}${sm.nextTier ? ', working toward our first tier' : ''}.`,
      sm.nextTier &&
        `${isAmount ? `R${sm.toNextTier}` : `${sm.toNextTier} more cases`} unlocks ${sm.nextTier.name}${tierValueLabel(sm.nextTier, sm.basis) ? ` at ${tierValueLabel(sm.nextTier, sm.basis)}` : ''} for everyone in the pool.`,
      !isAmount && (sm.currentTier || sm.nextTier) &&
        `(Tier names are standard across every iCamagu drinks pool, not specific to this group.)`,
      `Join and add your order:`,
      poolStatus.poolId ? `${window.location.origin}/pool/${poolStatus.poolId}` : null,
    ].filter(Boolean)
    const text = lines.join('\n\n')

    if (navigator.share) {
      navigator.share({ title: 'Join our SmartMatch pool', text }).catch(() => {})
    } else {
      navigator.clipboard.writeText(text)
      setInvitedId(poolStatus.poolId)
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
  // Only counts items with a real, researched retailPriceZAR comparable.
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
  const myOpenPools = poolStatuses.filter((p) => p.poolStatus === 'OPEN')

  return (
    <div className="min-h-screen pb-24 bg-cream px-4 pt-6 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={onBack}
          className="cursor-pointer text-xs font-bold text-sage-600 hover:text-sage-700 uppercase tracking-wider flex items-center gap-1"
        >
          ← Back to Store
        </button>
        {itemsList.length > 0 && (
          <button
            type="button"
            onClick={shareBasket}
            className="cursor-pointer bg-terracotta text-cream text-xs font-black px-3 py-1.5 rounded-pill shadow-soft active:scale-95 transition-transform flex items-center gap-1.5"
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
              {joiningPool.isMine ? 'Shopping for your pool' : 'You were invited to a pool'}
            </p>
            <button type="button" onClick={dismissJoiningPool} className="cursor-pointer text-ink/40 hover:text-ink/70 text-xs font-bold shrink-0">
              {joiningPool.isMine ? 'Cancel' : 'Not now'}
            </button>
          </div>
          <p className="text-sm font-bold text-ink mb-1">
            {CATEGORY_LABEL[joiningPool.category]} pool near {joiningPool.area}
          </p>
          <p className="text-xs text-ink/60">
            Add {CATEGORY_LABEL[joiningPool.category].toLowerCase()} items and submit your cart — they go straight into this pool.
          </p>
        </div>
      )}

      {poolStatuses.map((poolStatus) => (
        <div key={`${poolStatus.poolId}:${poolStatus.basketStatus}`} className="bg-gradient-to-br from-terracotta to-brand-ochre text-white rounded-soft p-4 mb-4 shadow-soft">
          <p className="text-[10px] font-black uppercase tracking-wider text-white/80 mb-1">
            {poolStatus.isPrivate ? 'My own order' : 'Smart Match'} — {CATEGORY_LABEL[poolStatus.category]}
          </p>
          {/* Only shown once the admin has accepted a merchant's offer on this
              group order — members never choose a merchant themselves. */}
          {poolStatus.poolStatus !== 'OPEN' && poolStatus.partnerName && (
            <p className="text-[11px] font-bold text-white/90 mb-1 flex items-center gap-1">
              <Icon name="check" size={11} color="#fff" /> Best offer confirmed: {poolStatus.partnerName}
            </p>
          )}
          <p className="text-sm font-bold mb-1">
            {poolStatus.poolStatus === 'OPEN'
              ? `Pooling with other members near ${poolStatus.area}. Merchants send offers on the whole group order — the more people join, the stronger the offers can be.`
              : poolStatus.poolStatus === 'FULFILLED'
                ? 'Delivered/collected — your order is complete.'
                : poolStatus.isPrivate
                  ? `Order placed for delivery to ${poolStatus.area}.`
                  : 'Matched! Your order pooled with other members.'}
          </p>
          {poolStatus.myCases > 0 && !poolStatus.isPrivate && (
            <p className="text-[11px] text-white/85 mb-2">You've added {poolStatus.myCases} to this pool.</p>
          )}

          <div className="mb-3">
            <OrderStageTracker currentIndex={resolveOrderStage(poolStatus.poolStatus, poolStatus.payment)} tone="dark" />
          </div>

          {poolStatus.poolStatus !== 'OPEN' && (
            <div className="mb-3 pt-3 border-t border-white/20">
              {poolStatus.poolStatus === 'FULFILLED' ? (
                <p className="text-xs text-white/90 mb-2">This order is done — see the full record any time in My Orders.</p>
              ) : poolStatus.payment?.status === 'CLEARED' ? (
                <p className="text-xs text-white/90 mb-2">Your payment is confirmed — waiting on the merchant to fulfil the order.</p>
              ) : poolStatus.payment?.hasReference ? (
                <p className="text-xs text-white/90 mb-2">Your EFT reference is in — waiting on the merchant to confirm receipt.</p>
              ) : !poolStatus.partnerName ? (
                <p className="text-xs text-white/90 mb-2">
                  {poolStatus.isPrivate
                    ? 'Merchants are sending offers on your order — payment details will show here once the best offer is confirmed.'
                    : 'Minimum reached! Merchants are sending offers on this group order — payment details will show here once the best offer is confirmed.'}
                </p>
              ) : (
                <p className="text-xs text-white/90 mb-2">
                  Minimum reached — pay your share (R{poolStatus.payment?.amountZAR ? Number(poolStatus.payment.amountZAR).toFixed(2) : '—'}) via EFT and enter your reference in My Orders.
                </p>
              )}
              {onGoToOrders && (
                <button
                  type="button"
                  onClick={onGoToOrders}
                  className="cursor-pointer bg-white text-terracotta text-xs font-black px-3 py-1.5 rounded-pill shadow-soft active:scale-95 transition-transform"
                >
                  Track my order →
                </button>
              )}
            </div>
          )}

          {poolStatus.poolStatus === 'OPEN' && poolStatus.smartMatch && (() => {
            const sm = poolStatus.smartMatch
            const isAmount = sm.basis === 'AMOUNT'
            const bandLabel = (tier, i, ladder) => {
              if (!isAmount) return `${tier.min}${i === ladder.length - 1 ? '+' : `-${ladder[i + 1].min - 1}`}P`
              return `R${tier.min.toLocaleString('en-ZA')}+`
            }
            const isShoppingThisPool = joiningPool?.id === poolStatus.poolId
            return (
              <>
                {sm.currentTier && (
                  <p className="text-[11px] font-black uppercase tracking-wide text-white bg-white/20 inline-flex items-center gap-1 px-2 py-1 rounded-pill mb-2">
                    <Icon name="check" size={11} color="#fff" strokeWidth={2.5} /> {sm.currentTier.name} unlocked
                    {tierValueLabel(sm.currentTier, sm.basis) && ` · ${tierValueLabel(sm.currentTier, sm.basis)}`}
                  </p>
                )}

                {/* The tier ladder — a tier's value shows only when a real
                    quote exists, otherwise "TBC", never a guessed number. */}
                {sm.ladder ? (
                  <div className="grid gap-1 mb-1.5" style={{ gridTemplateColumns: `repeat(${sm.ladder.length}, minmax(0, 1fr))` }}>
                    {sm.ladder.map((tier, i) => {
                      const metric = isAmount ? sm.currentAmountZAR : sm.pallets
                      const isCurrent = sm.currentTier?.id === tier.id
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
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => shopForPool(poolStatus)}
                    disabled={isShoppingThisPool}
                    className="cursor-pointer bg-white text-terracotta text-xs font-black px-3 py-2.5 rounded-pill shadow-soft active:scale-95 transition-transform flex items-center justify-center gap-1.5 disabled:opacity-80"
                  >
                    <Icon name="cart" size={12} color="#c45c26" /> {isShoppingThisPool ? 'Shopping for this' : 'Add to this pool'}
                  </button>
                  <button
                    type="button"
                    onClick={() => inviteToSmartMatch(poolStatus)}
                    className="cursor-pointer bg-white/15 border border-white/40 text-white text-xs font-black px-3 py-2.5 rounded-pill active:scale-95 transition-transform flex items-center justify-center gap-1.5"
                  >
                    {invitedId === poolStatus.poolId ? 'Copied!' : <><Icon name="send" size={12} color="#fff" /> Invite</>}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => cancelParkedBasket(poolStatus)}
                  disabled={cancellingId === poolStatus.poolId}
                  className="cursor-pointer mt-2 text-xs font-bold text-white/85 underline disabled:opacity-50"
                >
                  {cancellingId === poolStatus.poolId ? 'Withdrawing...' : 'Withdraw from this pool'}
                </button>
              </>
            )
          })()}
        </div>
      ))}

      {itemsList.length === 0 ? (
        <EmptyState
          emoji="🛒"
          title="Your cart is empty"
          description={myOpenPools.length
            ? 'Tap "Add to this pool" on a pool above, or browse the Store.'
            : 'Browse the Store to add items toward a collective order.'}
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
                              className="cursor-pointer w-11 h-11 rounded-pill bg-cream-dark text-ink font-bold active:scale-90 transition-transform"
                            >
                              −
                            </button>
                            <span className="font-bold text-sm w-5 text-center text-ink">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              aria-label={`Increase quantity of ${item.sku?.name || 'item'}`}
                              className="cursor-pointer w-11 h-11 rounded-pill bg-sage-500 text-white font-bold active:scale-90 transition-transform"
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

          {/* Checkout — buy together or on my own, delivered anywhere. */}
          <CheckoutPanel
            accessToken={accessToken}
            user={user}
            items={itemsList}
            totalZAR={basketData.totalZAR}
            joiningPool={joiningPool}
            onDismissJoiningPool={dismissJoiningPool}
            submitting={submitting}
            onSubmit={submitCheckout}
            areaMissing={areaMissing}
            onSaveAddress={saveDeliveryAsProfile}
          />
        </>
      )}
    </div>
  )
}
