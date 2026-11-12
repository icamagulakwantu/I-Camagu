import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import { CATEGORY_LABEL } from '../data/poolCategories.js'

const money = (n) => `R${Number(n || 0).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50'

// Admin-only. Real, committed pooled demand across every category — not a
// projection or an estimate, just what members have already put in a cart
// and parked in a group order. Members never choose a merchant: merchants
// send offers on group orders, and the admin accepts the best offer here
// once the order has reached its minimum.
//
// The Payouts tab is the one place this screen does touch real money: a
// member paying online (PayFast) lands their payment in iCamagu's own
// merchant account, not the merchant's — unlike manual EFT, where the
// member pays the merchant directly. Forwarding that money is a manual bank
// transfer, and this is where an admin tracks which ones are outstanding.
const TABS = [
  { id: 'demand', label: 'Group orders & offers' },
  { id: 'merchants', label: 'Merchants' },
  { id: 'payouts', label: 'Payouts' },
]

// Merchants must be verified before they can quote, and before an admin can
// accept their offer, because members pay merchants directly. Verifying needs
// a note of what was checked.
function MerchantList({ merchants, drafts, setDraft, savingId, onSave }) {
  if (merchants.length === 0) {
    return <EmptyState emoji="🏪" title="No merchants yet" description="Merchants who register under Sell on iCamagu appear here for checking." />
  }
  const waiting = merchants.filter((m) => !m.verifiedAt).length
  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-muted">
        {waiting ? `${waiting} waiting for verification. ` : 'Everyone is verified. '}
        Check the business before verifying: company or trading registration, a bank letter in the business name, and a phone call to the contact.
      </p>
      {merchants.map((m) => (
        <div key={m.id} className="card-paper p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink">{m.name}</p>
              <p className="text-xs text-ink-muted">{CATEGORY_LABEL[m.type] || m.type} · {m.area} · joined {new Date(m.createdAt).toLocaleDateString('en-ZA')}</p>
              <p className="text-xs text-ink-muted mt-1">{[m.contactName, m.contactPhone, m.contactEmail].filter(Boolean).join(' · ') || 'No contact on file'}</p>
              <p className="text-xs text-ink-muted">{m.hasBankDetails ? 'Bank details on file' : 'No bank details yet'}</p>
            </div>
            <span className={`flex-shrink-0 rounded-pill px-2 py-0.5 text-xs font-black uppercase ${m.verifiedAt ? 'bg-sage-500 text-white' : 'bg-terracotta/15 text-terracotta-dark'}`}>
              {m.verifiedAt ? 'Verified' : 'Waiting'}
            </span>
          </div>
          {m.verifiedAt ? (
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-terracotta/10 pt-3">
              <p className="min-w-0 text-xs text-ink-muted">Verified {new Date(m.verifiedAt).toLocaleDateString('en-ZA')}{m.verificationNote ? ` · ${m.verificationNote}` : ''}</p>
              <button type="button" onClick={() => onSave(m, false)} disabled={savingId === m.id} className={`cursor-pointer flex-shrink-0 rounded-pill border border-terracotta/40 px-3 py-1.5 text-xs font-bold text-terracotta-dark ${pressable}`}>
                {savingId === m.id ? '...' : 'Remove verification'}
              </button>
            </div>
          ) : (
            <div className="mt-3 flex gap-2 border-t border-terracotta/10 pt-3">
              <input
                type="text"
                value={drafts[m.id] || ''}
                onChange={(e) => setDraft(m.id, e.target.value)}
                placeholder="What did you check?"
                aria-label={`What you checked for ${m.name}`}
                className="min-w-0 flex-1 rounded-soft border border-cream-dark px-3 py-2 text-xs"
              />
              <button type="button" onClick={() => onSave(m, true)} disabled={savingId === m.id} className={`cursor-pointer flex-shrink-0 rounded-pill bg-sage-500 px-4 text-xs font-bold text-white ${pressable}`}>
                {savingId === m.id ? '...' : 'Verify'}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function OfferList({ pool, acceptingId, onAccept }) {
  const pending = pool.offers.filter((o) => o.status === 'PENDING')
  if (pending.length === 0) {
    return <p className="text-xs text-ink-muted mt-2">No merchant offers yet. Merchants of this kind see this order in their dashboard and can quote on it.</p>
  }
  const canAccept = pool.status === 'MATCHED'
  return (
    <div className="mt-3 pt-3 border-t border-terracotta/10">
      <p className="text-xs font-black uppercase text-ink-muted mb-2">
        Offers · cheapest first{canAccept ? '' : ' · can be accepted once the minimum is reached'}
      </p>
      <div className="space-y-2">
        {pending.map((offer, index) => (
          <div key={offer.id} className="bg-cream rounded-soft p-2.5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink truncate">
                {offer.partnerName}{index === 0 && <span className="text-sage-600"> · best price</span>}
              </p>
              <p className={`text-xs font-bold ${offer.partnerVerified ? 'text-sage-600' : 'text-terracotta-dark'}`}>
                {offer.partnerVerified ? 'Verified merchant' : 'Not verified, check them in Merchants first'}
              </p>
              <p className="text-xs text-ink-muted truncate">{offer.partnerArea}{offer.note ? ` · ${offer.note}` : ''}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <p className="tabular text-sm font-bold text-ink">{money(offer.totalPriceZAR)}</p>
              <button
                type="button"
                onClick={() => onAccept(offer.id)}
                disabled={!canAccept || !offer.partnerVerified || acceptingId === offer.id}
                className={`cursor-pointer bg-sage-500 text-white text-xs font-bold px-3 py-1.5 rounded-pill ${pressable}`}
              >
                {acceptingId === offer.id ? '...' : 'Accept'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DemandDashboard({ onBack }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [tab, setTab] = useState('demand')
  const [overview, setOverview] = useState(null)
  const [unassigned, setUnassigned] = useState([])
  const [pendingPayouts, setPendingPayouts] = useState([])
  const [pendingRefunds, setPendingRefunds] = useState([])
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [acceptingId, setAcceptingId] = useState(null)
  const [forwardDrafts, setForwardDrafts] = useState({})
  const [forwardingId, setForwardingId] = useState(null)
  const [refundDrafts, setRefundDrafts] = useState({})
  const [refundingId, setRefundingId] = useState(null)
  const [merchants, setMerchants] = useState([])
  const [merchantDrafts, setMerchantDrafts] = useState({})
  const [savingMerchantId, setSavingMerchantId] = useState(null)

  const authedFetch = useCallback((url, options = {}) => fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, ...options.headers },
  }), [accessToken])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [overviewRes, unassignedRes, payoutsRes, refundsRes, merchantsRes] = await Promise.all([
        authedFetch('/api/supplier/admin/demand-overview'),
        authedFetch('/api/supplier/admin/unassigned-pools'),
        authedFetch('/api/basket/admin/pending-payouts'),
        authedFetch('/api/basket/admin/pending-refunds'),
        authedFetch('/api/supplier/admin/merchants'),
      ])
      if (overviewRes.status === 403) { setDenied(true); return }
      if (!overviewRes.ok || !unassignedRes.ok || !payoutsRes.ok || !refundsRes.ok || !merchantsRes.ok) throw new Error('Could not load demand data')
      setMerchants(await merchantsRes.json())
      setOverview(await overviewRes.json())
      setUnassigned(await unassignedRes.json())
      setPendingPayouts(await payoutsRes.json())
      setPendingRefunds(await refundsRes.json())
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [authedFetch, showToast])

  useEffect(() => { load() }, [load])

  const saveMerchant = async (merchant, verified) => {
    const note = (merchantDrafts[merchant.id] || '').trim()
    if (verified && !note) return showToast('Write down what you checked before verifying', 'error')
    setSavingMerchantId(merchant.id)
    try {
      const res = await authedFetch(`/api/supplier/admin/merchants/${merchant.id}/verification`, {
        method: 'POST',
        body: JSON.stringify({ verified, note: note || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not update the merchant')
      showToast(data.message, 'success')
      setMerchantDrafts((prev) => ({ ...prev, [merchant.id]: undefined }))
      load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSavingMerchantId(null)
    }
  }

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

  const acceptOffer = async (offerId) => {
    setAcceptingId(offerId)
    try {
      const res = await authedFetch(`/api/supplier/admin/offers/${offerId}/accept`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not accept offer')
      showToast(data.message, 'success')
      load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setAcceptingId(null)
    }
  }

  if (denied) {
    return (
      <div className="min-h-screen bg-cream px-4 pt-10">
        <button onClick={onBack} className="cursor-pointer text-sm text-ink-muted mb-4 block">← Back</button>
        <EmptyState emoji="🔒" title="Admin access required" description="This view isn't available on your account." />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 bg-cream">
      <div className="bg-gradient-to-br from-ink to-brand-black text-white px-5 pt-10 pb-6 rounded-b-[2.5rem]">
        <button onClick={onBack} className="cursor-pointer text-sm text-white/70 mb-3 block">← Back</button>
        <h1 className="font-display font-bold text-2xl">Group orders &amp; offers</h1>
        <p className="text-white/70 text-sm mt-1">Real pooled demand, and the offers merchants have sent on it.</p>
      </div>

      <div className="flex gap-2 px-4 mt-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`cursor-pointer flex-1 py-2 rounded-pill text-xs font-bold transition-colors ${
              tab === t.id ? 'bg-ink text-white' : 'bg-white border border-ink/10 text-ink-muted'
            }`}
          >
            {t.label}
            {t.id === 'merchants' && merchants.some((m) => !m.verifiedAt) && (
              <span className={tab === t.id ? 'text-white/80' : 'text-terracotta'}> ({merchants.filter((m) => !m.verifiedAt).length})</span>
            )}
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
        ) : tab === 'merchants' ? (
          <MerchantList
            merchants={merchants}
            drafts={merchantDrafts}
            setDraft={(id, value) => setMerchantDrafts((prev) => ({ ...prev, [id]: value }))}
            savingId={savingMerchantId}
            onSave={saveMerchant}
          />
        ) : tab === 'demand' ? (
          <>
            <div className="wash-ember grain rounded-soft p-5 text-white">
              <p className="eyebrow text-cream/75 mb-1">Total committed demand (open + matched)</p>
              <p className="font-display font-extrabold text-3xl tabular">{money(overview?.totalValueZAR)}</p>
              <p className="text-xs text-cream/80 mt-1">
                {overview?.totalPoolCount || 0} group order{overview?.totalPoolCount === 1 ? '' : 's'} · {overview?.totalMemberCount || 0} member{overview?.totalMemberCount === 1 ? '' : 's'} ready to buy
              </p>
            </div>

            <div>
              <p className="eyebrow mb-2">By category</p>
              {(overview?.categories || []).length === 0 ? (
                <p className="text-sm text-ink-muted">No open or matched group orders right now.</p>
              ) : (
                <div className="space-y-2">
                  {overview.categories.map((c) => (
                    <div key={c.category} className="card-paper p-4 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm text-ink">{CATEGORY_LABEL[c.category] || c.category}</p>
                        <p className="text-xs text-ink-muted mt-0.5">
                          {c.poolCount} order{c.poolCount === 1 ? '' : 's'} · {c.cases} case{c.cases === 1 ? '' : 's'} · {c.memberCount} member{c.memberCount === 1 ? '' : 's'}
                          {c.unassignedPoolCount > 0 && <span className="text-terracotta font-bold"> · {c.unassignedPoolCount} awaiting a merchant</span>}
                        </p>
                      </div>
                      <p className="tabular font-display font-bold text-lg text-ink">{money(c.valueZAR)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="eyebrow mb-2">Group orders awaiting a merchant</p>
              {unassigned.length === 0 ? (
                <p className="text-sm text-ink-muted">Every open or matched group order already has a merchant confirmed.</p>
              ) : (
                <div className="space-y-3">
                  {unassigned.map((pool) => (
                    <div key={pool.id} className="card-paper p-4">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <p className="font-bold text-sm text-ink">{CATEGORY_LABEL[pool.category] || pool.category} — {pool.area}</p>
                          <p className="text-xs text-ink-muted mt-0.5">
                            {pool.status === 'MATCHED' ? 'Minimum reached — ' : ''}{pool.cases}/{pool.moqTarget} cases · {pool.memberCount} member{pool.memberCount === 1 ? '' : 's'}
                          </p>
                        </div>
                        <p className="tabular font-bold text-sm text-terracotta flex-shrink-0">{money(pool.valueZAR)}</p>
                      </div>
                      {(pool.items || []).length > 0 && (
                        <p className="text-xs text-ink-muted">
                          {pool.items.slice(0, 6).map((item) => `${item.quantity} × ${item.name}`).join(' · ')}
                          {pool.items.length > 6 ? ` · +${pool.items.length - 6} more` : ''}
                        </p>
                      )}
                      <OfferList pool={pool} acceptingId={acceptingId} onAccept={acceptOffer} />
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
                merchant's. Each of these still needs a real bank transfer to the merchant — mark it
                forwarded once that transfer is done, with the bank reference for the record.
              </p>
            </div>

            {pendingPayouts.length === 0 ? (
              <EmptyState emoji="✅" title="Nothing outstanding" description="Every online payment has been forwarded to its merchant." />
            ) : (
              <div className="space-y-3">
                {pendingPayouts.map((p) => {
                  const draft = forwardDrafts[p.id] || {}
                  return (
                    <div key={p.id} className="card-paper p-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-sm text-ink">{p.pool?.partner?.name || `${CATEGORY_LABEL[p.pool?.category] || p.pool?.category} order`}</p>
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
                        <p className="text-xs text-terracotta font-bold mb-3">
                          No bank details on file for this merchant yet — ask them to add them before transferring.
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
                          className={`cursor-pointer w-full bg-sage-500 text-white text-xs font-bold py-2 rounded-pill ${pressable}`}
                        >
                          {forwardingId === p.id ? 'Saving...' : 'Mark forwarded to merchant'}
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
                money, so the merchant has no way to pay it back themselves. Process it here once
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
                        <p className="font-bold text-sm text-ink">{p.pool?.partner?.name || `${CATEGORY_LABEL[p.pool?.category] || p.pool?.category} order`}</p>
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
                          className={`cursor-pointer w-full bg-terracotta text-white text-xs font-bold py-2 rounded-pill ${pressable}`}
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
