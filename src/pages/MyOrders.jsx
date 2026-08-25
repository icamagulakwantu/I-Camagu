import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import Icon from '../components/Icon.jsx'

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50'
const money = (n) => `R${Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

function MyOrders({ onBack }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [documents, setDocuments] = useState([])
  const [payments, setPayments] = useState([])
  const [referenceDrafts, setReferenceDrafts] = useState({})
  const [submittingId, setSubmittingId] = useState(null)

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
    }
  }

  useEffect(() => { fetchAll() }, [])

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

      {documents.length === 0 ? (
        <p className="text-brand-black/50 text-sm">No matched bulk orders yet — submit a basket to a pool from the Store.</p>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => {
            const payment = payments.find((p) => p.poolId === doc.poolId)
            return (
              <div key={doc.id} className="bg-white border-2 border-brand-black rounded-soft p-4">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-mono text-xs font-bold text-brand-blue">{doc.groupCode}</p>
                  <span className="text-xs font-black uppercase text-brand-ochre">{doc.status.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-xs text-brand-black/50 mb-2 flex items-center gap-1"><Icon name="mapPin" size={12} /> {doc.deliveryLocation}</p>
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
                <p className="text-sm font-bold text-brand-black mt-2">Group total: R{parseFloat(doc.totalAmountZAR).toFixed(2)}</p>

                {payment && (
                  <div className="mt-3 pt-3 border-t border-brand-black/10">
                    <p className="text-xs font-black uppercase text-brand-black/50 mb-1">Your share: {money(payment.amountZAR)}</p>
                    {payment.status === 'CLEARED' ? (
                      <p className="text-xs font-bold text-sage-600 flex items-center gap-1"><Icon name="check" size={12} color="#4a7a4a" /> Payment confirmed by supplier</p>
                    ) : (
                      <div>
                        <p className="text-[11px] text-brand-black/50 mb-2">
                          Pay {money(payment.amountZAR)} via EFT to {doc.groupCode ? `reference "${doc.groupCode}"` : 'the supplier'}, then enter your reference below so they can confirm receipt.
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
                      </div>
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
