import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import { captureLocation } from '../lib/geolocation.js'
import Icon from '../components/Icon.jsx'
import { CATEGORY_LABEL } from '../data/poolCategories.js'

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50'
const money = (n) => `R${Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

// Real BulkPool.deadline/capCases — the rolling window that keeps one pool
// from growing into a single unmanageable batch. No countdown shown once
// the pool has already matched or closed.
function windowLabel(deadline, capCases, currentCases) {
  if (!deadline) return null
  const msLeft = new Date(deadline).getTime() - Date.now()
  const closesIn = msLeft <= 0 ? 'window closed' : `closes in ${Math.max(1, Math.ceil(msLeft / (60 * 60 * 1000)))}h`
  const capPart = capCases ? ` · capped at ${capCases} cases${currentCases >= capCases ? ' (full)' : ''}` : ''
  return `${closesIn}${capPart}`
}

function ProgressBar({ current, target }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  return (
    <div>
      <div className="flex justify-between text-[10px] font-bold text-ink-muted mb-1">
        <span>{current} / {target} cases</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 bg-cream-dark rounded-pill overflow-hidden">
        <div className="h-full bg-terracotta rounded-pill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function RegisterForm({ onRegistered }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [name, setName] = useState('')
  const [type, setType] = useState('TAVERN')
  const [area, setArea] = useState('')
  const [moq, setMoq] = useState('')
  const [coords, setCoords] = useState(null)
  const [locating, setLocating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const useMyLocation = async () => {
    setLocating(true)
    try {
      const loc = await captureLocation()
      setCoords(loc)
      showToast('Location captured', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLocating(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/api/supplier/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ name, type, area, moq: moq || undefined, ...(coords || {}) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not register')
      showToast('Merchant profile created', 'success')
      onRegistered(data.partner)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-4 mt-4">
      <div className="bg-white border-2 border-terracotta/25 rounded-soft p-5">
        <h2 className="font-display font-bold text-lg text-ink mb-1">Sell to group orders</h2>
        <p className="text-xs text-ink-muted mb-4">Register your business to see group orders from iCamagu members and send your best price on them. The best offer is confirmed once a group reaches its minimum.</p>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="text" placeholder="Business name" value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-ink/30 rounded-soft px-4 py-2.5 text-sm" required
          />
          <select
            value={type} onChange={(e) => setType(e.target.value)}
            className="cursor-pointer w-full border border-ink/30 rounded-soft px-4 py-2.5 text-sm bg-white"
          >
            <option value="TAVERN">Drinks (liquor distributor or wholesaler)</option>
            <option value="BUTCHERY">Meat &amp; livestock</option>
            <option value="GROCERY">Groceries &amp; other items</option>
            <option value="PRODUCE">Fresh produce</option>
          </select>
          <input
            type="text" placeholder="Area you serve (e.g. Gugulethu)" value={area}
            onChange={(e) => setArea(e.target.value)}
            className="w-full border border-ink/30 rounded-soft px-4 py-2.5 text-sm" required
          />
          <button
            type="button" onClick={useMyLocation} disabled={locating}
            className="cursor-pointer text-xs font-bold text-sage-600 flex items-center gap-1"
          >
            <Icon name="mapPin" size={12} />
            {locating ? 'Locating...' : coords ? <>Location captured <Icon name="check" size={12} /></> : 'Pin exact location (recommended)'}
          </button>
          <p className="text-[10px] text-ink-muted -mt-1">Group orders near you are shown first, and it helps plan delivery.</p>
          <input
            type="number" min="0" placeholder="Minimum order quantity (optional, cases)" value={moq}
            onChange={(e) => setMoq(e.target.value)}
            className="w-full border border-ink/30 rounded-soft px-4 py-2.5 text-sm"
          />
          {error && <p className="text-terracotta text-sm">{error}</p>}
          <button
            type="submit" disabled={saving}
            className={`cursor-pointer w-full bg-sage-500 text-white font-bold py-3 rounded-pill ${pressable}`}
          >
            {saving ? 'Creating...' : 'Register as a merchant'}
          </button>
        </form>
      </div>
    </div>
  )
}

// Group orders this merchant can quote on. One offer per order; sending again
// updates it. Other merchants' prices are never shown, only how many offers.
function OrderRequests({ requests, onSent }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [drafts, setDrafts] = useState({})
  const [sendingId, setSendingId] = useState(null)

  const setDraft = (poolId, field, value) => setDrafts((prev) => ({ ...prev, [poolId]: { ...prev[poolId], [field]: value } }))

  const send = async (pool) => {
    const draft = drafts[pool.id] || {}
    const price = Number(draft.totalPriceZAR ?? pool.myOffer?.totalPriceZAR)
    if (!Number.isFinite(price) || price <= 0) return showToast('Enter your total price for the whole order', 'error')
    setSendingId(pool.id)
    try {
      const res = await fetch(`/api/supplier/offers/pools/${pool.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ totalPriceZAR: price, note: (draft.note ?? pool.myOffer?.note ?? '').trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not send offer')
      showToast(data.message || 'Offer sent', 'success')
      setDrafts((prev) => ({ ...prev, [pool.id]: undefined }))
      onSent()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSendingId(null)
    }
  }

  return (
    <div className="mb-6">
      <p className="eyebrow mb-1">Group orders to quote on</p>
      <p className="text-xs text-ink-muted mb-3">Send one total price for the whole order. The best offer is accepted once the group reaches its minimum.</p>
      {requests.length === 0 ? (
        <EmptyState emoji="📨" title="No group orders right now" description="When members near you pool an order for what you sell, it will appear here for you to quote on." />
      ) : (
        <div className="space-y-3">
          {requests.map((pool) => {
            const draft = drafts[pool.id] || {}
            return (
              <div key={pool.id} className="card-paper p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-ink">{CATEGORY_LABEL[pool.category] || pool.category} order near {pool.area}</p>
                    <p className="text-[11px] text-ink-muted mt-0.5">
                      {pool.memberCount} member{pool.memberCount === 1 ? '' : 's'} · catalogue value {money(pool.valueZAR)}
                      {pool.nearYou && <span className="text-sage-600 font-bold"> · near you</span>}
                    </p>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-pill flex-shrink-0 ${pool.status === 'MATCHED' ? 'bg-sage-500 text-white' : 'bg-terracotta/20 text-terracotta'}`}>
                    {pool.status === 'MATCHED' ? 'Ready to confirm' : 'Still filling'}
                  </span>
                </div>
                <div className="my-2"><ProgressBar current={pool.cases} target={pool.moqTarget} /></div>
                {(pool.items || []).length > 0 && (
                  <p className="text-[11px] text-ink-muted mb-2">
                    {pool.items.slice(0, 6).map((item) => `${item.quantity} × ${item.name}`).join(' · ')}
                    {pool.items.length > 6 ? ` · +${pool.items.length - 6} more` : ''}
                  </p>
                )}
                <p className="text-[11px] text-ink-muted mb-2">
                  {pool.offerCount} offer{pool.offerCount === 1 ? '' : 's'} so far
                  {pool.myOffer && <> · <span className="font-bold text-ink">your offer: {money(pool.myOffer.totalPriceZAR)}</span></>}
                </p>
                <div className="flex gap-2">
                  <input
                    type="number" min="1" inputMode="decimal"
                    placeholder="Your total price, R"
                    value={draft.totalPriceZAR ?? (pool.myOffer?.totalPriceZAR ?? '')}
                    onChange={(e) => setDraft(pool.id, 'totalPriceZAR', e.target.value)}
                    className="flex-1 min-w-0 border border-cream-dark rounded-soft px-3 py-2 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => send(pool)}
                    disabled={sendingId === pool.id}
                    className={`cursor-pointer bg-sage-500 text-white text-xs font-bold px-4 rounded-pill ${pressable}`}
                  >
                    {sendingId === pool.id ? '...' : pool.myOffer ? 'Update offer' : 'Send offer'}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Note (optional) — e.g. delivery included"
                  value={draft.note ?? (pool.myOffer?.note ?? '')}
                  onChange={(e) => setDraft(pool.id, 'note', e.target.value)}
                  className="w-full border border-cream-dark rounded-soft px-3 py-2 text-xs mt-2"
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SupplierDashboard({ onBack }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [partner, setPartner] = useState(null)
  const [pools, setPools] = useState([])
  const [requests, setRequests] = useState([])

  const authedFetch = useCallback((url) => fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } }), [accessToken])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const meRes = await authedFetch('/api/supplier/me')
      if (meRes.status === 404) {
        setPartner(null)
        setLoading(false)
        return
      }
      const meData = await meRes.json()
      if (!meRes.ok) throw new Error(meData.error || 'Could not load merchant profile')
      setPartner(meData.partner)

      const [poolsRes, requestsRes] = await Promise.all([
        authedFetch('/api/supplier/pools'),
        authedFetch('/api/supplier/offers/requests'),
      ])
      const poolsData = await poolsRes.json()
      if (!poolsRes.ok) throw new Error(poolsData.error || 'Could not load orders')
      setPools(poolsData.pools || [])
      const requestsData = await requestsRes.json()
      if (!requestsRes.ok) throw new Error(requestsData.error || 'Could not load group orders')
      setRequests(requestsData.requests || [])
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [authedFetch, showToast])

  useEffect(() => { load() }, [load])

  const [confirmingId, setConfirmingId] = useState(null)
  const confirmPayment = async (paymentId) => {
    setConfirmingId(paymentId)
    try {
      const res = await fetch(`/api/supplier/pool-payments/${paymentId}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not confirm payment')
      showToast('Payment confirmed', 'success')
      load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setConfirmingId(null)
    }
  }

  const [refundingId, setRefundingId] = useState(null)
  const processRefund = async (paymentId) => {
    setRefundingId(paymentId)
    try {
      const res = await fetch(`/api/supplier/pool-payments/${paymentId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not process refund')
      showToast('Refund marked as processed', 'success')
      load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setRefundingId(null)
    }
  }

  const [fulfillingId, setFulfillingId] = useState(null)
  const fulfillPool = async (poolId) => {
    setFulfillingId(poolId)
    try {
      const res = await fetch(`/api/supplier/pools/${poolId}/fulfill`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not mark order fulfilled')
      showToast(data.message || 'Order marked fulfilled', 'success')
      load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setFulfillingId(null)
    }
  }

  return (
    <div className="min-h-screen pb-24 bg-cream">
      <div className="bg-gradient-to-br from-terracotta to-brand-ochre text-white px-5 pt-10 pb-6 rounded-b-[2.5rem]">
        <button onClick={onBack} className="cursor-pointer text-sm text-white/70 mb-3 block">← Back</button>
        <h1 className="font-display font-bold text-2xl">Merchant Dashboard</h1>
        <p className="text-white/70 text-sm mt-1">{partner ? `${partner.name} · ${partner.area}` : 'Quote on group orders, then track payments'}</p>
      </div>

      {loading ? (
        <div className="px-4 mt-4 space-y-2"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
      ) : !partner ? (
        <RegisterForm onRegistered={(p) => { setPartner(p); load() }} />
      ) : (
        <div className="px-4 mt-4">
          <OrderRequests requests={requests} onSent={load} />

          <p className="eyebrow mb-2">Your confirmed orders</p>
          {pools.length === 0 ? (
            <EmptyState emoji="📦" title="No confirmed orders yet" description="When one of your offers is accepted, the order, member payments and delivery split show here." />
          ) : (
            <div className="space-y-3">
              {pools.map((pool) => (
                <div key={pool.id} className="bg-white border-2 border-terracotta/25 rounded-soft p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-pill ${
                      pool.status === 'FULFILLED' ? 'bg-ink text-white' : pool.status === 'MATCHED' ? 'bg-sage-500 text-white' : 'bg-terracotta/20 text-terracotta'
                    }`}>
                      {pool.status === 'FULFILLED' ? 'Fulfilled' : pool.status === 'MATCHED' ? 'Matched' : 'Open'}
                    </span>
                    <span className="text-[10px] text-ink-muted">{pool.participantCount} member{pool.participantCount === 1 ? '' : 's'}</span>
                  </div>

                  <ProgressBar current={pool.currentCases} target={pool.moqTarget} />
                  {pool.status === 'OPEN' && windowLabel(pool.deadline, pool.capCases, pool.currentCases) && (
                    <p className="text-[10px] text-ink-muted mt-1">{windowLabel(pool.deadline, pool.capCases, pool.currentCases)}</p>
                  )}

                  <div className="flex gap-4 mt-3 text-xs">
                    <div>
                      <p className="text-ink-muted">Cleared</p>
                      <p className="font-bold text-sage-600">{money(pool.clearedZAR)}</p>
                    </div>
                    <div>
                      <p className="text-ink-muted">Pending</p>
                      <p className="font-bold text-ink">{money(pool.pendingZAR)}</p>
                    </div>
                  </div>

                  {pool.orderDocument && (
                    <div className="mt-3 pt-3 border-t border-terracotta/10">
                      <p className="text-xs font-bold text-ink">Order {pool.orderDocument.groupCode}</p>
                      <p className="text-[10px] text-ink-muted">{pool.orderDocument.deliveryLocation}</p>
                      <p className="text-[10px] text-ink-muted mt-1">
                        {pool.orderDocument.confirmed}/{pool.orderDocument.totalLines} members confirmed · Total {money(pool.orderDocument.totalAmountZAR)}
                      </p>
                    </div>
                  )}

                  {(pool.distribution || []).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-terracotta/10">
                      <p className="text-[10px] font-black uppercase text-ink-muted mb-2">Split by reference — for dividing up the stock</p>
                      <div className="space-y-2">
                        {pool.distribution.map((group) => (
                          <div key={group.orderReference} className="bg-cream rounded-soft p-2.5">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-mono text-xs font-bold text-brand-blue">{group.orderReference || 'No reference'}</p>
                              {group.memberName && <p className="text-[10px] text-ink-muted truncate">{group.memberName}</p>}
                            </div>
                            {group.items.map((item, idx) => (
                              <p key={idx} className="text-[10px] text-ink-muted">
                                {item.quantity} {item.unitType.toLowerCase()}(s) — {item.description}
                              </p>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(pool.payments || []).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-terracotta/10">
                      <p className="text-[10px] font-black uppercase text-ink-muted mb-2">Member Payments</p>
                      <div className="space-y-2">
                        {pool.payments.map((p) => (
                          <div key={p.id} className="bg-cream rounded-soft p-2.5">
                            <div className="flex items-center justify-between">
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-ink truncate">{p.memberName}</p>
                                <p className="text-[10px] text-ink-muted">
                                  {money(p.amountZAR)}{p.paymentReference ? ` · expect ref: ${p.paymentReference}` : ''}
                                </p>
                                <p className="text-[10px] text-ink-muted">
                                  {p.providerReference ? `Member entered: ${p.providerReference}` : 'Member hasn\'t entered a reference yet'}
                                </p>
                              </div>
                              {p.status === 'REFUNDED' ? (
                                <span className="text-[10px] font-bold text-terracotta flex-shrink-0">Refunded</span>
                              ) : p.status === 'PENDING' ? (
                                <button
                                  onClick={() => confirmPayment(p.id)}
                                  disabled={confirmingId === p.id}
                                  className={`cursor-pointer text-[11px] font-bold text-white bg-sage-500 px-3 py-1.5 rounded-pill flex-shrink-0 ${pressable}`}
                                >
                                  {confirmingId === p.id ? '...' : 'Confirm received'}
                                </button>
                              ) : (
                                <span className="text-[10px] font-bold text-sage-600 flex-shrink-0 flex items-center gap-1"><Icon name="check" size={11} color="#4a7a4a" /> Cleared</span>
                              )}
                            </div>
                            {p.refundRequestedAt && p.status !== 'REFUNDED' && (
                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-terracotta/10">
                                <span className="text-[10px] font-bold text-terracotta">Refund requested</span>
                                {p.provider === 'MANUAL_EFT' ? (
                                  <button
                                    onClick={() => processRefund(p.id)}
                                    disabled={refundingId === p.id}
                                    className={`cursor-pointer text-[11px] font-bold text-white bg-terracotta px-3 py-1.5 rounded-pill flex-shrink-0 ${pressable}`}
                                  >
                                    {refundingId === p.id ? '...' : 'Process refund'}
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-ink-muted flex-shrink-0 text-right">
                                    Paid online — iCamagu will refund this directly
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pool.status === 'MATCHED' && (
                    <div className="mt-3 pt-3 border-t border-terracotta/10">
                      <button
                        onClick={() => fulfillPool(pool.id)}
                        disabled={!pool.canFulfill || fulfillingId === pool.id}
                        className={`cursor-pointer w-full text-xs font-bold py-2 rounded-pill ${pool.canFulfill ? 'bg-ink text-white' : 'bg-cream-dark text-ink-muted'} ${pressable}`}
                      >
                        {fulfillingId === pool.id ? 'Marking fulfilled...' : pool.canFulfill ? 'Mark order fulfilled' : 'Awaiting all payments to clear'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SupplierDashboard
