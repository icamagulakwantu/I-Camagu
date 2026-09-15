import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import { captureLocation } from '../lib/geolocation.js'
import Icon from '../components/Icon.jsx'

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
      showToast('Supplier profile created', 'success')
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
        <h2 className="font-display font-bold text-lg text-ink mb-1">Become a Supplier</h2>
        <p className="text-xs text-ink-muted mb-4">Register your tavern or butchery to receive bulk pool orders from iCamagu members in your area.</p>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="text" placeholder="Business name" value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-ink/30 rounded-soft px-4 py-2.5 text-sm" required
          />
          <select
            value={type} onChange={(e) => setType(e.target.value)}
            className="w-full border border-ink/30 rounded-soft px-4 py-2.5 text-sm bg-white"
          >
            <option value="TAVERN">Tavern / liquor distributor (alcohol)</option>
            <option value="BUTCHERY">Butchery / livestock (meat)</option>
            <option value="GROCERY">Grocery wholesaler (groceries & other items)</option>
            <option value="PRODUCE">Produce supplier (fresh produce)</option>
          </select>
          <input
            type="text" placeholder="Area you serve (e.g. Gugulethu)" value={area}
            onChange={(e) => setArea(e.target.value)}
            className="w-full border border-ink/30 rounded-soft px-4 py-2.5 text-sm" required
          />
          <button
            type="button" onClick={useMyLocation} disabled={locating}
            className="text-xs font-bold text-sage-600 flex items-center gap-1"
          >
            <Icon name="mapPin" size={12} />
            {locating ? 'Locating...' : coords ? <>Location captured <Icon name="check" size={12} /></> : 'Pin exact location (recommended)'}
          </button>
          <p className="text-[10px] text-ink-muted -mt-1">Lets members find you as the nearest supplier and helps us plan delivery logistics.</p>
          <input
            type="number" min="0" placeholder="Minimum order quantity (optional, cases)" value={moq}
            onChange={(e) => setMoq(e.target.value)}
            className="w-full border border-ink/30 rounded-soft px-4 py-2.5 text-sm"
          />
          {error && <p className="text-terracotta text-sm">{error}</p>}
          <button
            type="submit" disabled={saving}
            className={`w-full bg-sage-500 text-white font-bold py-3 rounded-pill ${pressable}`}
          >
            {saving ? 'Creating...' : 'Register as Supplier'}
          </button>
        </form>
      </div>
    </div>
  )
}

function SupplierDashboard({ onBack }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [partner, setPartner] = useState(null)
  const [pools, setPools] = useState([])

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
      if (!meRes.ok) throw new Error(meData.error || 'Could not load supplier profile')
      setPartner(meData.partner)

      const poolsRes = await authedFetch('/api/supplier/pools')
      const poolsData = await poolsRes.json()
      if (!poolsRes.ok) throw new Error(poolsData.error || 'Could not load pools')
      setPools(poolsData.pools || [])
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
        <button onClick={onBack} className="text-sm text-white/70 mb-3 block">← Back</button>
        <h1 className="font-display font-bold text-2xl">Supplier Dashboard</h1>
        <p className="text-white/70 text-sm mt-1">{partner ? `${partner.name} · ${partner.area}` : 'Your bulk pools, orders and payments'}</p>
      </div>

      {loading ? (
        <div className="px-4 mt-4 space-y-2"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
      ) : !partner ? (
        <RegisterForm onRegistered={(p) => { setPartner(p); load() }} />
      ) : (
        <div className="px-4 mt-4">
          {pools.length === 0 ? (
            <EmptyState emoji="📦" title="No pools yet" description="Once members start adding your area to their carts, bulk pools will appear here." />
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
                                  className={`text-[11px] font-bold text-white bg-sage-500 px-3 py-1.5 rounded-pill flex-shrink-0 ${pressable}`}
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
                                <button
                                  onClick={() => processRefund(p.id)}
                                  disabled={refundingId === p.id}
                                  className={`text-[11px] font-bold text-white bg-terracotta px-3 py-1.5 rounded-pill flex-shrink-0 ${pressable}`}
                                >
                                  {refundingId === p.id ? '...' : 'Process refund'}
                                </button>
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
                        className={`w-full text-xs font-bold py-2 rounded-pill ${pool.canFulfill ? 'bg-ink text-white' : 'bg-cream-dark text-ink-muted'} ${pressable}`}
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
