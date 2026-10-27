import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import Icon from '../components/Icon.jsx'
import { resolveOrderStage } from '../data/orderStages.js'
import { OrderStageTracker } from '../components/ui/OrderStageTracker.jsx'

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50'
// 2 decimal places, matching the money formatting every other screen in the
// app uses (Store, Basket, ShrineFund) — this used to round to whole Rand,
// which meant the same order card could show "R1234.56" for its total next
// to "R1235" for one member's share.
const money = (n) => `R${Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function MyOrders({ onBack }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [documents, setDocuments] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [referenceDrafts, setReferenceDrafts] = useState({})
  const [submittingId, setSubmittingId] = useState(null)
  const [onlinePaymentAvailable, setOnlinePaymentAvailable] = useState(false)
  const [payingOnlineId, setPayingOnlineId] = useState(null)

  const fetchAll = async () => {
    try {
      const [docsRes, paymentsRes] = await Promise.all([
        fetch('/api/basket/order-documents/my', { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch('/api/basket/pool-payments/my', { headers: { Authorization: `Bearer ${accessToken}` } }),
      ])
      const docsData = await docsRes.json()
      const paymentsData = await paymentsRes.json()
      if (!docsRes.ok) throw new Error(docsData.error || 'Could not load orders')
      if (!paymentsRes.ok) throw new Error(paymentsData.error || 'Could not load payments')
      setDocuments(Array.isArray(docsData) ? docsData : [])
      setPayments(Array.isArray(paymentsData) ? paymentsData : [])
    } catch (err) {
      showToast(err.message, 'error')
      setDocuments([])
      setPayments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  useEffect(() => {
    fetch('/api/basket/pool-payments/online-status', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => res.json())
      .then((data) => setOnlinePaymentAvailable(!!data.available))
      .catch(() => setOnlinePaymentAvailable(false))
  }, [accessToken])

  // PayFast redirects the browser back here after checkout — the webhook
  // that actually clears the payment can land a moment after this redirect,
  // so one immediate refetch plus a short delayed one covers that gap
  // instead of the member seeing a stale "still pending" right after paying.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const outcome = params.get('payment')
    if (!outcome) return
    if (outcome === 'success') showToast('Payment received — confirming with the supplier...', 'success')
    else if (outcome === 'cancelled') showToast('Payment cancelled', 'info')
    window.history.replaceState({}, '', window.location.pathname)
    const retry = setTimeout(fetchAll, 2500)
    return () => clearTimeout(retry)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const payOnline = async (paymentId) => {
    setPayingOnlineId(paymentId)
    try {
      const res = await fetch(`/api/basket/pool-payments/${paymentId}/pay-online`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not start online payment')
      window.location.href = data.redirectUrl
    } catch (err) {
      showToast(err.message, 'error')
      setPayingOnlineId(null)
    }
  }

  const confirmLine = async (lineItemId) => {
    try {
      const res = await fetch('/api/basket/order-documents/confirm-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ lineItemId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not confirm')
      fetchAll()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const [requestingRefundId, setRequestingRefundId] = useState(null)
  const requestRefund = async (paymentId) => {
    setRequestingRefundId(paymentId)
    try {
      const res = await fetch('/api/basket/pool-payments/refund-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ paymentId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not request refund')
      showToast(data.message || 'Refund requested', 'success')
      fetchAll()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setRequestingRefundId(null)
    }
  }

  const submitReference = async (paymentId) => {
    const providerReference = (referenceDrafts[paymentId] || '').trim()
    if (!providerReference) return showToast('Enter your EFT reference first', 'error')
    setSubmittingId(paymentId)
    try {
      const res = await fetch('/api/basket/pool-payments/reference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ paymentId, providerReference }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save reference')
      showToast(data.message || 'Reference saved', 'success')
      fetchAll()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmittingId(null)
    }
  }

  return (
    <div className="px-4 pt-6 pb-24 icamagu-bg min-h-screen">
      <button onClick={onBack} className="text-sm text-brand-black/60 mb-4">← Back</button>
      <h2 className="text-2xl font-extrabold text-brand-black mb-4">My Orders</h2>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full rounded-soft" />
          <Skeleton className="h-32 w-full rounded-soft" />
        </div>
      ) : documents.length === 0 ? (
        <EmptyState emoji="📦" title="No matched bulk orders yet" description="Submit a cart to a pool from the Store." />
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => {
            const payment = payments.find((p) => p.poolId === doc.poolId)
            // A document only ever exists once its pool has matched (see
            // matchmakerService), and it flips to FULFILLED in lockstep
            // with the pool (see supplierService.markPoolFulfilled) — so
            // doc.status maps onto the same two pool stages exactly.
            const poolStage = doc.status === 'FULFILLED' ? 'FULFILLED' : 'MATCHED'
            const stageIndex = resolveOrderStage(
              poolStage,
              payment ? { status: payment.status, hasReference: !!payment.providerReference } : null
            )
            return (
              <div key={doc.id} className="bg-white border-2 border-terracotta/25 rounded-soft p-4">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-mono text-xs font-bold text-brand-blue">{doc.groupCode}</p>
                </div>
                <div className="mb-3">
                  <OrderStageTracker currentIndex={stageIndex} tone="light" />
                </div>
                <p className="text-xs text-brand-black/50 mb-2 flex items-center gap-1"><Icon name="mapPin" size={12} /> {doc.deliveryLocation}</p>
                {payment?.paymentReference && (
                  <p className="text-[11px] text-brand-black/50 mb-2">
                    Your reference: <span className="font-mono font-bold text-brand-blue">{payment.paymentReference}</span> — the same code goes on your EFT and identifies your share at collection.
                  </p>
                )}
                {doc.lineItems.map((li) => (
                  <div key={li.id} className="flex justify-between items-center py-1">
                    <p className="text-sm text-brand-black/70">{li.quantity} {li.unitType.toLowerCase()}(s) — {li.itemDescription}</p>
                    {li.confirmedAt ? (
                      <span className="text-xs text-brand-blue font-bold flex items-center gap-1"><Icon name="check" size={12} color="#4a7a4a" /> Confirmed</span>
                    ) : (
                      <button onClick={() => confirmLine(li.id)} className="text-xs bg-brand-blue text-brand-cream font-bold px-3 py-1 rounded-pill">
                        Confirm this is correct
                      </button>
                    )}
                  </div>
                ))}
                <p className="text-sm font-bold text-brand-black mt-2">Group total: {money(doc.totalAmountZAR)}</p>

                {payment && (
                  <div className="mt-3 pt-3 border-t border-terracotta/15">
                    <p className="text-xs font-black uppercase text-brand-black/50 mb-1">Your share: {money(payment.amountZAR)}</p>
                    {payment.status === 'REFUNDED' ? (
                      <p className="text-xs font-bold text-terracotta">Refunded{payment.refundFeeZAR > 0 ? ` (${money(payment.refundFeeZAR)} processing fee deducted)` : ''}</p>
                    ) : (
                      <>
                        {payment.status === 'CLEARED' ? (
                          payment.provider === 'MANUAL_EFT' ? (
                            <p className="text-xs font-bold text-sage-600 flex items-center gap-1"><Icon name="check" size={12} color="#4a7a4a" /> Payment confirmed by supplier</p>
                          ) : payment.provider === 'STOKVEL_FUNDS' ? (
                            <p className="text-xs font-bold text-sage-600 flex items-center gap-1"><Icon name="check" size={12} color="#4a7a4a" /> Stokvel-funded settlement confirmed; no separate member payment is needed.</p>
                          ) : (
                            <p className="text-xs font-bold text-sage-600">
                              Payment provider confirmed this payment to iCamagu. This does not by itself confirm supplier settlement; do not pay again while iCamagu reconciles it.
                            </p>
                          )
                        ) : payment.provider === 'STOKVEL_FUNDS' ? (
                          <p className="text-[11px] text-brand-black/60">
                            {payment.status === 'PENDING_SETTLEMENT'
                              ? 'Your Stokvel funding request has the required approvals and is awaiting settlement. You do not need to pay separately.'
                              : payment.status === 'DECLINED'
                                ? 'Your Stokvel funding request was declined. Contact your officials before making any payment.'
                                : 'This share is being funded through your Stokvel and is awaiting the required officials’ approval. Do not make a separate EFT payment.'}
                          </p>
                        ) : !payment.pool?.partner ? (
                          <p className="text-[11px] text-brand-black/50">
                            MOQ reached — we're finalizing a supplier for this pool now. Payment details will show here as soon as one is confirmed.
                          </p>
                        ) : (
                          <div>
                            {/* Alcohol never gets the online option — that money would
                                land in iCamagu's own account instead of the licensed
                                supplier's, which is real liquor-licensing exposure a
                                direct member-to-supplier EFT never had. The server
                                enforces this too (paymentService.initiatePoolPayment),
                                this is just so the button doesn't appear only to fail. */}
                            {onlinePaymentAvailable && payment.pool?.category !== 'TAVERN' && (
                              <>
                                <button
                                  onClick={() => payOnline(payment.id)}
                                  disabled={payingOnlineId === payment.id}
                                  className={`w-full bg-brand-blue text-brand-cream font-bold py-2.5 rounded-pill text-sm mb-2 ${pressable}`}
                                >
                                  {payingOnlineId === payment.id ? 'Redirecting...' : `Pay ${money(payment.amountZAR)} online (test mode)`}
                                </button>
                                <p className="text-[10px] text-brand-black/40 text-center mb-3">— or pay by manual EFT instead —</p>
                              </>
                            )}
                            {payment.provider !== 'MANUAL_EFT' ? (
                              <p className="text-[11px] text-terracotta font-bold mb-2">
                                This payment is recorded with {payment.provider}. Do not make a second EFT transfer while it is being reconciled. If the status remains pending, contact the iCamagu admin through the app.
                              </p>
                            ) : (
                              <>
                                {payment.pool?.partner?.bankName && payment.pool?.partner?.bankAccountHolder && payment.pool?.partner?.bankAccountNumber ? (
                                  <div className="rounded-soft border border-sage-200 bg-sage-50 p-3 mb-3">
                                    <p className="text-[10px] font-black uppercase tracking-wide text-ink-muted mb-1">Supplier bank details on file</p>
                                    <p className="text-xs font-bold text-ink">{payment.pool.partner.bankName} · {payment.pool.partner.bankAccountHolder}</p>
                                    <p className="text-xs text-ink">Account: {payment.pool.partner.bankAccountNumber}</p>
                                    {payment.pool.partner.bankBranchCode && <p className="text-xs text-ink">Branch code: {payment.pool.partner.bankBranchCode}</p>}
                                    <p className="text-[10px] text-ink-muted mt-1">Confirm these details with the supplier before transferring.</p>
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-terracotta font-bold mb-2">
                                    Supplier bank details are not on file. Do not transfer money yet; ask the supplier or iCamagu admin for verified details. If you have already paid the supplier directly, you can still enter your reference below.
                                  </p>
                                )}
                                <p className="text-[11px] text-brand-black/50 mb-2">
                                  {payment.pool?.partner?.bankName && payment.pool?.partner?.bankAccountHolder && payment.pool?.partner?.bankAccountNumber
                                    ? `Pay ${money(payment.amountZAR)} via EFT using ${payment.paymentReference ? `reference "${payment.paymentReference}"` : 'your own reference'} — this code is yours alone, not shared with the rest of the pool, so the supplier can tell your payment apart from everyone else's. Then enter your reference below so they can confirm receipt.`
                                    : 'Only record a reference if you have already paid directly to the supplier using independently verified details.'}
                                </p>
                                <div className="flex gap-2">
                                  <input
                                    type="text" placeholder={payment.providerReference || 'EFT reference'}
                                    value={referenceDrafts[payment.id] ?? payment.providerReference ?? ''}
                                    onChange={(e) => setReferenceDrafts((prev) => ({ ...prev, [payment.id]: e.target.value }))}
                                    className="flex-1 border border-brand-black/30 rounded-soft px-3 py-2 text-sm"
                                  />
                                  <button
                                    onClick={() => submitReference(payment.id)}
                                    disabled={submittingId === payment.id}
                                    className={`bg-sage-500 text-white font-bold px-4 rounded-pill text-sm ${pressable}`}
                                  >
                                    {submittingId === payment.id ? '...' : 'Save'}
                                  </button>
                                </div>
                                <p className="text-[10px] text-brand-black/40 mt-1">Awaiting supplier confirmation.</p>
                              </>
                            )}
                          </div>
                        )}
                        {payment.provider === 'STOKVEL_FUNDS' ? (
                          <p className="text-[11px] text-brand-black/60 mt-2">
                            For a Stokvel-funded order, contact your Chair/Treasurer to discuss cancellation or a refund. This screen does not submit a refund request for Stokvel funds; if you previously submitted one, officials must resolve it through the Stokvel process.
                          </p>
                        ) : payment.refundRequestedAt ? (
                          <p className="text-[11px] text-terracotta font-bold mt-2">Refund requested — awaiting supplier</p>
                        ) : (
                          <button
                            onClick={() => requestRefund(payment.id)}
                            disabled={requestingRefundId === payment.id}
                            className="text-[11px] text-terracotta font-bold underline mt-2"
                          >
                            {requestingRefundId === payment.id ? 'Requesting...' : 'Request a refund'}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default MyOrders
