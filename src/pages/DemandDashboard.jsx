import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import Icon from '../components/Icon.jsx'
import { CATEGORY_LABEL } from '../data/poolCategories.js'

const money = (n) => `R${Number(n || 0).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50'

// Admin-only. Real, committed pooled demand across every category — not a
// projection or an estimate, just what members have already put in a cart
// and parked in a pool. This is the number a founder actually takes into a
// supplier negotiation ("we already have R14,000 of alcohol orders ready in
// Motherwell"), and the tool to attach a real confirmed supplier to a pool
// once a deal is signed.
//
// The Payouts tab is the one place this screen does touch real money: a
// member paying online (PayFast) lands their payment in iCamagu's own
// merchant account, not the supplier's — unlike manual EFT, where the
// member pays the supplier directly. Until a real payout API exists for
// that (Stitch/Ozow/PayFast payouts — a business relationship still to be
// built), forwarding that money to the supplier is a manual bank transfer,
// and this is where an admin tracks which ones are still outstanding.
const TABS = [
  { id: 'demand', label: 'Demand & Suppliers' },
  { id: 'payouts', label: 'Payouts' },
]

export default function DemandDashboard({ onBack }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [tab, setTab] = useState('demand')
  const [overview, setOverview] = useState(null)
  const [unassigned, setUnassigned] = useState([])
  const [partners, setPartners] = useState([])
  const [pendingPayouts, setPendingPayouts] = useState([])
  const [pendingRefunds, setPendingRefunds] = useState([])
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [selectedPartner, setSelectedPartner] = useState({})
  const [assigningId, setAssigningId] = useState(null)
  const [forwardDrafts, setForwardDrafts] = useState({})
  const [forwardingId, setForwardingId] = useState(null)
  const [refundDrafts, setRefundDrafts] = useState({})
  const [refundingId, setRefundingId] = useState(null)

  const authedFetch = useCallback((url, options = {}) => fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, ...options.headers },
  }), [accessToken])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [overviewRes, unassignedRes, partnersRes, payoutsRes, refundsRes] = await Promise.all([
        authedFetch('/api/supplier/admin/demand-overview'),
        authedFetch('/api/supplier/admin/unassigned-pools'),
        authedFetch('/api/supplier/admin/partners'),
        authedFetch('/api/basket/admin/pending-payouts'),
        authedFetch('/api/basket/admin/pending-refunds'),
      ])
      if (overviewRes.status === 403) { setDenied(true); return }
      if (!overviewRes.ok || !unassignedRes.ok || !partnersRes.ok || !payoutsRes.ok || !refundsRes.ok) throw new Error('Could not load demand data')
      setOverview(await overviewRes.json())
      setUnassigned(await unassignedRes.json())
      setPartners(await partnersRes.json())
      setPendingPayouts(await payoutsRes.json())
      setPendingRefunds(await refundsRes.json())
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [authedFetch, showToast])

  useEffect(() => { load() }, [load])

  const forwardPayout = async (paymentId) => {
    const draft = forwardDrafts[paymentId] || {}
    if (!draft.reference?.trim()) return showToast('Enter the bank reference for this transfer first', 'error')
    setForwardingId(paymentId)
    try {
      const res = await authedFetch(`/api/basket/admin/pending-payouts/${paymentId}/forward`, {
        method: 'POST',
        body: JSON.stringify({ reference: draft.reference.trim(), note: draft.note?.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not mark payout forwarded')
      showToast(data.message || 'Marked as forwarded', 'success')
      setForwardDrafts((prev) => ({ ...prev, [paymentId]: undefined }))
      load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setForwardingId(null)
    }
  }

  const processRefundAdmin = async (paymentId) => {
    const draft = refundDrafts[paymentId] || {}
    setRefundingId(paymentId)
    try {
      const res = await authedFetch(`/api/basket/admin/pending-refunds/${paymentId}/process`, {
        method: 'POST',
        body: JSON.stringify({ feeZAR: draft.feeZAR?.trim() || undefined, note: draft.note?.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not process refund')
      showToast(data.message || 'Refund marked as processed', 'success')
      setRefundDrafts((prev) => ({ ...prev, [paymentId]: undefined }))
      load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setRefundingId(null)
    }
  }

  const assignPartner = async (poolId) => {
    const partnerId = selectedPartner[poolId]
    if (!partnerId) return showToast('Choose a partner first', 'error')
    setAssigningId(poolId)
    try {
      const res = await authedFetch('/api/supplier/admin/assign-partner', {
        method: 'POST',
        body: JSON.stringify({ poolId, partnerId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not assign partner')
      showToast(data.message, 'success')
      load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setAssigningId(null)
    }
  }

  if (denied) {
    return (
      <div className="min-h-screen bg-cream px-4 pt-10">
        <button onClick={onBack} className="text-sm text-ink-muted mb-4 block">← Back</button>
        <EmptyState emoji="🔒" title="Admin access required" description="This view isn't available on your account." />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 bg-cream">
      <div className="bg-gradient-to-br from-ink to-brand-black text-white px-5 pt-10 pb-6 rounded-b-[2.5rem]">
        <button onClick={onBack} className="text-sm text-white/70 mb-3 block">← Back</button>
        <h1 className="font-display font-bold text-2xl">Demand &amp; Suppliers</h1>
        <p className="text-white/70 text-sm mt-1">Real pooled demand, for negotiating with real suppliers.</p>
      </div>

      <div className="flex gap-2 px-4 mt-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-pill text-xs font-bold transition-colors ${
              tab === t.id ? 'bg-ink text-white' : 'bg-white border border-ink/10 text-ink-muted'
            }`}
          >
            {t.label}
            {t.id === 'payouts' && (pendingPayouts.length + pendingRefunds.length) > 0 && (
              <span className={tab === t.id ? 'text-white/80' : 'text-terracotta'}> ({pendingPayouts.length + pendingRefunds.length})</span>
            )}
          </button>
        ))}
      </div>

      <div className="px-4 mt-4 space-y-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-soft" />
            <Skeleton className="h-24 w-full rounded-soft" />
          </div>
        ) : tab === 'demand' ? (
          <>
            <div className="wash-ember grain rounded-soft p-5 text-white">
              <p className="eyebrow text-cream/75 mb-1">Total committed demand (open + matched)</p>
              <p className="font-display font-extrabold text-3xl tabular">{money(overview?.totalValueZAR)}</p>
              <p className="text-xs text-cream/80 mt-1">
                {overview?.totalPoolCount || 0} pool{overview?.totalPoolCount === 1 ? '' : 's'} · {overview?.totalMemberCount || 0} member{overview?.totalMemberCount === 1 ? '' : 's'} ready to buy
              </p>
            </div>

            <div>
              <p className="eyebrow mb-2">By category</p>
              {(overview?.categories || []).length === 0 ? (
                <p className="text-sm text-ink-muted">No open or matched pools right now.</p>
              ) : (
                <div className="space-y-2">
                  {overview.categories.map((c) => (
                    <div key={c.category} className="card-paper p-4 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm text-ink">{CATEGORY_LABEL[c.category] || c.category}</p>
                        <p className="text-xs text-ink-muted mt-0.5">
                          {c.poolCount} pool{c.poolCount === 1 ? '' : 's'} · {c.cases} case{c.cases === 1 ? '' : 's'} · {c.memberCount} member{c.memberCount === 1 ? '' : 's'}
                          {c.unassignedPoolCount > 0 && <span className="text-terracotta font-bold"> · {c.unassignedPoolCount} awaiting supplier</span>}
                        </p>
                      </div>
                      <p className="tabular font-display font-bold text-lg text-ink">{money(c.valueZAR)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="eyebrow mb-2">Pools awaiting a confirmed supplier</p>
              {unassigned.length === 0 ? (
                <p className="text-sm text-ink-muted">Every open or matched pool already has a supplier attached.</p>
              ) : (
                <div className="space-y-3">
                  {unassigned.map((pool) => (
                    <div key={pool.id} className="card-paper p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-bold text-sm text-ink">{CATEGORY_LABEL[pool.category] || pool.category} — {pool.area}</p>
                          <p className="text-xs text-ink-muted mt-0.5">
                            {pool.status === 'MATCHED' ? 'MOQ reached — ' : ''}{pool.cases}/{pool.moqTarget} cases · {pool.memberCount} member{pool.memberCount === 1 ? '' : 's'}
                          </p>
                        </div>
                        <p className="tabular font-bold text-sm text-terracotta flex-shrink-0">{money(pool.valueZAR)}</p>
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={selectedPartner[pool.id] || ''}
                          onChange={(e) => setSelectedPartner((prev) => ({ ...prev, [pool.id]: e.target.value }))}
                          className="flex-1 border border-cream-dark rounded-soft px-3 py-2 text-xs font-bold bg-white"
                        >
                          <option value="">Choose a confirmed supplier...</option>
                          {partners.filter((p) => p.type === pool.category).map((p) => (
                            <option key={p.id} value={p.id}>{p.name} ({p.area})</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => assignPartner(pool.id)}
                          disabled={assigningId === pool.id}
                          className={`bg-sage-500 text-white text-xs font-bold px-4 rounded-pill ${pressable}`}
                        >
                          {assigningId === pool.id ? '...' : 'Attach'}
                        </button>
                      </div>
                      {partners.filter((p) => p.type === pool.category).length === 0 && (
                        <p className="text-[11px] text-ink-muted mt-2">
                          No {(CATEGORY_LABEL[pool.category] || pool.category).toLowerCase()} suppliers registered yet — register one via the Supplier Dashboard once a deal is confirmed.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="bg-white border-2 border-terracotta/25 rounded-soft p-4">
              <p className="text-xs text-ink-muted leading-relaxed">
                A member paying online lands their money in iCamagu's own PayFast account, not the
                supplier's. Each of these still needs a real bank transfer to the supplier — mark it
                forwarded once that transfer is done, with the bank reference for the record.
              </p>
            </div>

            {pendingPayouts.length === 0 ? (
              <EmptyState emoji="✅" title="Nothing outstanding" description="Every online payment has been forwarded to its supplier." />
            ) : (
              <div className="space-y-3">
                {pendingPayouts.map((p) => {
                  const draft = forwardDrafts[p.id] || {}
                  return (
                    <div key={p.id} className="card-paper p-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-sm text-ink">{p.pool?.partner?.name || `${CATEGORY_LABEL[p.pool?.category] || p.pool?.category} pool`}</p>
                        <p className="tabular font-display font-bold text-lg text-ink">{money(p.amountZAR)}</p>
                      </div>
                      <p className="text-xs text-ink-muted mb-1">
                        From {p.user?.firstName} {p.user?.lastName} ({p.user?.email}) · {p.provider}
                      </p>
                      {p.pool?.partner?.bankName ? (
                        <p className="text-xs text-ink-muted mb-3">
                          Pay to: {p.pool.partner.bankName} · {p.pool.partner.bankAccountHolder} · {p.pool.partner.bankAccountNumber}
                          {p.pool.partner.bankBranchCode ? ` · branch ${p.pool.partner.bankBranchCode}` : ''}
                        </p>
                      ) : (
                        <p className="text-[11px] text-terracotta font-bold mb-3">
                          No bank details on file for this supplier yet — add them via the Supplier Dashboard before transferring.
                        </p>
                      )}
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Bank reference for this transfer"
                          value={draft.reference || ''}
                          onChange={(e) => setForwardDrafts((prev) => ({ ...prev, [p.id]: { ...prev[p.id], reference: e.target.value } }))}
                          className="w-full border border-cream-dark rounded-soft px-3 py-2 text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Note (optional)"
                          value={draft.note || ''}
                          onChange={(e) => setForwardDrafts((prev) => ({ ...prev, [p.id]: { ...prev[p.id], note: e.target.value } }))}
                          className="w-full border border-cream-dark rounded-soft px-3 py-2 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => forwardPayout(p.id)}
                          disabled={forwardingId === p.id}
                          className={`w-full bg-sage-500 text-white text-xs font-bold py-2 rounded-pill ${pressable}`}
                        >
                          {forwardingId === p.id ? 'Saving...' : 'Mark forwarded to supplier'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="bg-white border-2 border-terracotta/25 rounded-soft p-4 mt-6">
              <p className="text-xs text-ink-muted leading-relaxed">
                A refund on an online payment is the same story in reverse — iCamagu holds that
                money, so the supplier has no way to pay it back themselves. Process it here once
                the member has actually been refunded (by bank transfer), with a note for the record.
              </p>
            </div>

            {pendingRefunds.length === 0 ? (
              <EmptyState emoji="✅" title="No refunds outstanding" description="Every requested PayFast refund has been processed." />
            ) : (
              <div className="space-y-3">
                {pendingRefunds.map((p) => {
                  const draft = refundDrafts[p.id] || {}
                  return (
                    <div key={p.id} className="card-paper p-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-sm text-ink">{p.pool?.partner?.name || `${CATEGORY_LABEL[p.pool?.category] || p.pool?.category} pool`}</p>
                        <p className="tabular font-display font-bold text-lg text-ink">{money(p.amountZAR)}</p>
                      </div>
                      <p className="text-xs text-ink-muted mb-1">
                        Refund for {p.user?.firstName} {p.user?.lastName} ({p.user?.email}) · {p.provider}
                      </p>
                      <p className="text-xs text-ink-muted mb-3 font-mono">{p.paymentReference}</p>
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Processing fee deducted, R (optional)"
                          value={draft.feeZAR || ''}
                          onChange={(e) => setRefundDrafts((prev) => ({ ...prev, [p.id]: { ...prev[p.id], feeZAR: e.target.value } }))}
                          className="w-full border border-cream-dark rounded-soft px-3 py-2 text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Note — e.g. how the member was refunded"
                          value={draft.note || ''}
                          onChange={(e) => setRefundDrafts((prev) => ({ ...prev, [p.id]: { ...prev[p.id], note: e.target.value } }))}
                          className="w-full border border-cream-dark rounded-soft px-3 py-2 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => processRefundAdmin(p.id)}
                          disabled={refundingId === p.id}
                          className={`w-full bg-terracotta text-white text-xs font-bold py-2 rounded-pill ${pressable}`}
                        >
                          {refundingId === p.id ? 'Saving...' : 'Mark refunded'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
