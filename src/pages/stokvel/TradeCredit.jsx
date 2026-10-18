import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import { pressable, inp, money, fmtDate, api } from './shared.js'

// A typical savings rate, used only to compare bank interest with a retailer
// discount. The Calculator tab has the per-bank rates.
const BANK_RATE = 6.5

const STATUS_STYLE = { ACTIVE: 'bg-terracotta/10 text-terracotta', USED: 'bg-sage-100 text-sage-700', CANCELLED: 'bg-ink/10 text-ink-muted' }

// TradeCredit: instead of leaving savings in the bank, the group pre-pays a
// retailer it already buys from (spaza wholesaler, butcher, liquor supplier)
// in exchange for a discount. The comparison shows what the money earns either way.
export default function TradeCredit({ stokvelId, isOfficial, groupBalance }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [credits, setCredits] = useState(null)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [retailer, setRetailer] = useState('')
  const [amount, setAmount] = useState('')
  const [discount, setDiscount] = useState('10')
  const [months, setMonths] = useState('12')
  const [purpose, setPurpose] = useState('')

  const base = `/api/stokvels/${stokvelId}/trade-credit`
  const load = useCallback(async () => {
    try {
      setCredits(await api(base, accessToken))
    } catch (err) {
      showToast(err.message, 'error')
      setCredits([])
    }
  }, [base, accessToken, showToast])

  useEffect(() => { load() }, [load])

  const sim = Number(amount) > 0 ? Number(amount) : groupBalance
  const simMonths = Number(months) || 12
  const bankEarns = sim * (BANK_RATE / 100) * (simMonths / 12)
  const retailerSaves = sim * (Number(discount || 0) / 100)
  const better = retailerSaves - bankEarns

  const save = async (e) => {
    e.preventDefault()
    if (!isOfficial) return
    setSaving(true)
    try {
      await api(base, accessToken, {
        method: 'POST',
        body: JSON.stringify({ retailer, amount, discountPercent: discount, months, purpose }),
      })
      showToast('Trade credit recorded', 'success')
      setAdding(false); setRetailer(''); setAmount(''); setPurpose('')
      await load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const setStatus = async (id, status) => {
    try {
      await api(`${base}/${id}`, accessToken, { method: 'PATCH', body: JSON.stringify({ status }) })
      await load()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const active = (credits || []).filter((c) => c.status === 'ACTIVE')
  const committed = active.reduce((s, c) => s + c.amount, 0)
  const savedTotal = active.reduce((s, c) => s + c.amount * (c.discountPercent / 100), 0)

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-terracotta to-brand-ochre text-white rounded-soft p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/80">Bank or retailer?</p>
        <p className="text-sm mt-1">
          On {money(sim)} over {simMonths} months, a bank at about {BANK_RATE}% pays roughly <strong>{money(bankEarns)}</strong>.
          A {discount || 0}% discount from a retailer you already buy from saves <strong>{money(retailerSaves)}</strong>.
        </p>
        <p className="font-display font-bold text-lg mt-2">
          {better >= 0 ? `Retailer wins by ${money(better)}` : `Bank wins by ${money(-better)}`}
        </p>
        <p className="text-[11px] text-white/80 mt-1">The money also stays in your community for longer before it leaves.</p>
      </div>

      {credits && active.length > 0 && (
        <div className="bg-white border-2 border-terracotta/25 rounded-soft p-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-black uppercase text-ink-muted">Committed to retailers</p>
            <p className="font-display font-bold text-xl text-ink">{money(committed)}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-ink-muted">Expected saving</p>
            <p className="font-display font-bold text-xl text-sage-700">{money(savedTotal)}</p>
          </div>
        </div>
      )}

      {isOfficial && !adding && (
        <button type="button" onClick={() => setAdding(true)}
          className={`w-full bg-terracotta text-white font-bold py-2.5 rounded-pill text-sm ${pressable}`}>
          Record a retailer deal
        </button>
      )}
      {(adding || !isOfficial) && (
        <form onSubmit={save} className="bg-white border-2 border-terracotta/25 rounded-soft p-4 space-y-3">
          <p className="text-xs font-black uppercase text-ink-muted">{isOfficial ? 'New retailer deal' : 'Try the numbers'}</p>
          {isOfficial && (
            <input type="text" placeholder="Retailer (e.g. Mthatha Cash and Carry)" value={retailer}
              onChange={(e) => setRetailer(e.target.value)} className={inp} required />
          )}
          <input type="number" min="1" step="0.01" placeholder={`Amount (R), default ${money(groupBalance)}`} value={amount}
            onChange={(e) => setAmount(e.target.value)} className={inp} required={isOfficial} />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-ink-muted">Discount (%)
              <input type="number" min="0" max="90" step="0.5" value={discount} onChange={(e) => setDiscount(e.target.value)} className={`${inp} mt-1`} />
            </label>
            <label className="text-xs text-ink-muted">Over (months)
              <input type="number" min="1" max="60" value={months} onChange={(e) => setMonths(e.target.value)} className={`${inp} mt-1`} />
            </label>
          </div>
          {isOfficial && (
            <>
              <input type="text" placeholder="What it covers (e.g. December groceries)" value={purpose}
                onChange={(e) => setPurpose(e.target.value)} className={inp} />
              <div className="flex gap-2">
                <button type="submit" disabled={saving}
                  className={`flex-1 bg-terracotta text-white font-bold py-2 rounded-pill text-sm ${pressable}`}>
                  {saving ? 'Saving...' : 'Save deal'}
                </button>
                <button type="button" onClick={() => setAdding(false)}
                  className={`flex-1 border-2 border-terracotta/25 font-bold py-2 rounded-pill text-sm ${pressable}`}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </form>
      )}

      {credits === null ? (
        <Skeleton className="h-20 w-full" />
      ) : credits.length === 0 ? (
        <p className="text-sm text-ink-muted text-center py-4">No retailer deals yet.</p>
      ) : credits.map((c) => (
        <div key={c.id} className="bg-white border border-terracotta/15 rounded-soft p-4 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold text-sm text-ink truncate">{c.retailer}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-pill ${STATUS_STYLE[c.status]}`}>{c.status.toLowerCase()}</span>
          </div>
          <p className="text-xs text-ink-muted">{fmtDate(c.createdAt)} · {c.discountPercent}% off · {c.months} month(s)</p>
          {c.purpose && <p className="text-xs text-ink">{c.purpose}</p>}
          <p className="font-display font-bold text-lg text-ink">{money(c.amount)} <span className="text-xs text-sage-700 font-sans">saves {money(c.amount * c.discountPercent / 100)}</span></p>
          {isOfficial && c.status === 'ACTIVE' && (
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setStatus(c.id, 'USED')} className={`text-xs font-bold text-terracotta ${pressable}`}>Mark used</button>
              <button type="button" onClick={() => setStatus(c.id, 'CANCELLED')} className={`text-xs font-bold text-ink-muted ${pressable}`}>Cancel</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
