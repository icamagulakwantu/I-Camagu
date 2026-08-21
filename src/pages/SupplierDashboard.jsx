import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50'
const money = (n) => `R${Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/api/supplier/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ name, type, area, moq: moq || undefined }),
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
      <div className="bg-white border-2 border-ink rounded-soft p-5">
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
            <option value="TAVERN">Tavern (alcohol)</option>
            <option value="BUTCHERY">Butchery (meat)</option>
          </select>
          <input
            type="text" placeholder="Area you serve (e.g. Gugulethu)" value={area}
            onChange={(e) => setArea(e.target.value)}
            className="w-full border border-ink/30 rounded-soft px-4 py-2.5 text-sm" required
          />
          <input
            type="number" placeholder="Minimum order quantity (optional, cases)" value={moq}
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
            <EmptyState emoji="📦" title="No pools yet" description="Once members start adding your area to their baskets, bulk pools will appear here." />
          ) : (
            <div className="space-y-3">
              {pools.map((pool) => (
                <div key={pool.id} className="bg-white border-2 border-ink rounded-soft p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-pill ${pool.status === 'MATCHED' ? 'bg-sage-500 text-white' : 'bg-terracotta/20 text-terracotta'}`}>
                      {pool.status === 'MATCHED' ? 'Matched' : 'Open'}
                    </span>
                    <span className="text-[10px] text-ink-muted">{pool.participantCount} member{pool.participantCount === 1 ? '' : 's'}</span>
                  </div>

                  <ProgressBar current={pool.currentCases} target={pool.moqTarget} />

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
                    <div className="mt-3 pt-3 border-t border-ink/10">
                      <p className="text-xs font-bold text-ink">Order {pool.orderDocument.groupCode}</p>
                      <p className="text-[10px] text-ink-muted">{pool.orderDocument.deliveryLocation}</p>
                      <p className="text-[10px] text-ink-muted mt-1">
                        {pool.orderDocument.confirmed}/{pool.orderDocument.totalLines} members confirmed · Total {money(pool.orderDocument.totalAmountZAR)}
                      </p>
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
