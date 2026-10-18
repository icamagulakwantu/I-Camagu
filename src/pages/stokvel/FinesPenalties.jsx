import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import Icon from '../../components/Icon.jsx'

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none'
const inp = 'w-full border border-ink/20 rounded-2xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-terracotta/60'
const money = (n) => `R${Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmt = (iso) => new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })

const FINE_TYPES = [
  { id: 'LATE_CONTRIBUTION', label: 'Late contribution' },
  { id: 'ABSENCE', label: 'Meeting absence' },
  { id: 'LATE_ATTENDANCE', label: 'Late attendance' },
  { id: 'MISCONDUCT', label: 'Misconduct' },
  { id: 'OTHER', label: 'Other' },
]

// ── FinesPenalties ─────────────────────────────────────────────────────────
// Organisers can issue fines to members. Each fine has a type, amount, date,
// and optional note. Members can see all fines against them. Outstanding
// balance is shown per member. All stored via /api/stokvels/:id/fines.
export default function FinesPenalties({ stokvelId, members = [], isOrganiser }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [fines, setFines] = useState([])
  const [loading, setLoading] = useState(true)
  const [issuing, setIssuing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeFilter, setActiveFilter] = useState('outstanding')

  // Issue fine form
  const [memberId, setMemberId] = useState('')
  const [fineType, setFineType] = useState('LATE_CONTRIBUTION')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/stokvels/${stokvelId}/fines`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = res.ok ? await res.json() : []
      setFines(Array.isArray(data) ? data : [])
    } catch {
      setFines([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [stokvelId])

  const issueFine = async (e) => {
    e.preventDefault()
    if (!memberId || !amount) return
    setSaving(true)
    try {
      const res = await fetch(`/api/stokvels/${stokvelId}/fines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ memberId, fineType, amount: parseFloat(amount), note, date }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not issue fine')
      showToast('Fine issued', 'success')
      setIssuing(false)
      setMemberId(''); setAmount(''); setNote('')
      load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const markPaid = async (fineId) => {
    try {
      const res = await fetch(`/api/stokvels/${stokvelId}/fines/${fineId}/pay`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not update fine')
      showToast('Fine marked as paid', 'success')
      load()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const filtered = fines.filter((f) => {
    if (activeFilter === 'outstanding') return !f.paid
    if (activeFilter === 'paid') return f.paid
    return true
  })

  const totalOutstanding = fines.filter((f) => !f.paid).reduce((s, f) => s + Number(f.amount), 0)

  // Group outstanding fines by member for a per-member summary
  const memberBalances = {}
  fines.filter((f) => !f.paid).forEach((f) => {
    const key = f.memberName || f.memberId
    memberBalances[key] = (memberBalances[key] || 0) + Number(f.amount)
  })

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-lg text-ink">Fines & Penalties</h3>
          <p className="text-xs text-ink-muted">
            {totalOutstanding > 0 ? `${money(totalOutstanding)} outstanding` : 'All clear'}
          </p>
        </div>
        {isOrganiser && (
          <button type="button" onClick={() => setIssuing((v) => !v)}
            className={`bg-terracotta text-white text-xs font-bold px-4 py-2 rounded-pill ${pressable}`}>
            {issuing ? 'Cancel' : '+ Issue fine'}
          </button>
        )}
      </div>

      {/* Issue fine form */}
      {issuing && (
        <form onSubmit={issueFine} className="card-paper p-4 space-y-3">
          <p className="eyebrow text-ink-muted">Issue a fine</p>
          <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className={inp} required>
            <option value="">Select member</option>
            {members.map((m) => (
              <option key={m.userId || m.id} value={m.userId || m.id}>{m.user?.firstName ? `${m.user.firstName} ${m.user.lastName || ''}`.trim() : (m.name || 'Member')}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <select value={fineType} onChange={(e) => setFineType(e.target.value)} className={inp}>
              {FINE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-muted">R</span>
              <input type="number" min="0" step="0.01" placeholder="Amount"
                value={amount} onChange={(e) => setAmount(e.target.value)}
                className={`${inp} pl-7`} required />
            </div>
          </div>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp} />
          <input type="text" placeholder="Note (optional)"
            value={note} onChange={(e) => setNote(e.target.value)} className={inp} />
          <button type="submit" disabled={saving}
            className={`w-full bg-terracotta text-white font-bold py-2.5 rounded-pill text-sm ${pressable}`}>
            {saving ? 'Saving...' : 'Issue fine'}
          </button>
        </form>
      )}

      {/* Member balance summary */}
      {Object.keys(memberBalances).length > 0 && (
        <div className="card-paper p-4">
          <p className="eyebrow text-ink-muted mb-3">Outstanding per member</p>
          <div className="space-y-2">
            {Object.entries(memberBalances).map(([name, bal]) => (
              <div key={name} className="flex items-center justify-between">
                <p className="text-sm font-bold text-ink">{name}</p>
                <p className="text-sm font-bold text-terracotta">{money(bal)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {['outstanding', 'paid', 'all'].map((f) => (
          <button key={f} type="button" onClick={() => setActiveFilter(f)}
            className={`flex-1 rounded-pill py-1.5 text-[11px] font-bold transition-colors capitalize ${
              activeFilter === f ? 'bg-terracotta text-white' : 'bg-white border border-ink/10 text-ink-muted'
            }`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
      ) : filtered.length === 0 ? (
        <div className="card-paper p-6 text-center">
          <Icon name="check" size={28} color="#c45c26" />
          <p className="font-bold text-ink mt-2 mb-1">
            {activeFilter === 'outstanding' ? 'No outstanding fines' : 'No fines recorded'}
          </p>
          <p className="text-xs text-ink-muted">
            {activeFilter === 'outstanding' ? 'Everyone is up to date.' : 'Issue a fine above to get started.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((f) => (
            <div key={f.id} className="card-paper p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm text-ink">{f.memberName || 'Member'}</p>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      f.paid ? 'bg-sage-100 text-sage-700' : 'bg-terracotta/10 text-terracotta'
                    }`}>
                      {f.paid ? 'Paid' : 'Outstanding'}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {FINE_TYPES.find((t) => t.id === f.fineType)?.label || f.fineType}
                    {f.date ? ` · ${fmt(f.date)}` : ''}
                  </p>
                  {f.note && <p className="text-xs text-ink-muted mt-0.5 italic">{f.note}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-sm text-terracotta">{money(f.amount)}</p>
                  {!f.paid && isOrganiser && (
                    <button type="button" onClick={() => markPaid(f.id)}
                      className={`text-[11px] font-bold text-sage-600 mt-1 ${pressable}`}>
                      Mark paid
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
