import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'

function Expenditure({ onBack }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [entries, setEntries] = useState([])
  const [total, setTotal] = useState(0)

  const [itemName, setItemName] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [purchasedAt, setPurchasedAt] = useState('')

  const fetchEntries = async () => {
    try {
      const res = await fetch('/api/expenditure/my', { headers: { Authorization: `Bearer ${accessToken}` } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not load spending')
      setEntries(Array.isArray(data.entries) ? data.entries : [])
      setTotal(data.total || 0)
    } catch (err) {
      showToast(err.message, 'error')
      setEntries([])
      setTotal(0)
    }
  }

  useEffect(() => { fetchEntries() }, [])

  const addEntry = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/expenditure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ itemName, price, category, purchasedAt: purchasedAt || new Date().toISOString() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not add expense')
      setItemName(''); setPrice(''); setCategory(''); setPurchasedAt('')
      fetchEntries()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  return (
    <div className="px-4 pt-6 pb-24 icamagu-bg min-h-screen">
      <button onClick={onBack} className="text-sm text-brand-black/60 mb-4">← Back</button>
      <h2 className="text-2xl font-extrabold text-brand-black mb-1">My Spending</h2>
      <p className="text-xs text-brand-black/50 mb-4">Track your own expenses — simple, private, just for you.</p>

      <div className="bg-brand-blue/10 border-2 border-brand-blue rounded-soft p-4 mb-4">
        <span className="text-sm">Total tracked</span>
        <p className="text-2xl font-extrabold text-brand-blue">R{total.toFixed(2)}</p>
      </div>

      <form onSubmit={addEntry} className="bg-white border-2 border-terracotta/25 rounded-soft p-4 mb-4 space-y-2">
        <input type="text" placeholder="What did you buy?" value={itemName} onChange={(e) => setItemName(e.target.value)}
          className="w-full border border-brand-black/30 rounded-soft px-3 py-2 text-sm" required />
        <input type="number" placeholder="Price (ZAR)" value={price} onChange={(e) => setPrice(e.target.value)}
          className="w-full border border-brand-black/30 rounded-soft px-3 py-2 text-sm" required />
        <input type="text" placeholder="Category (optional)" value={category} onChange={(e) => setCategory(e.target.value)}
          className="w-full border border-brand-black/30 rounded-soft px-3 py-2 text-sm" />
        <input type="date" value={purchasedAt} onChange={(e) => setPurchasedAt(e.target.value)}
          className="w-full border border-brand-black/30 rounded-soft px-3 py-2 text-sm" />
        <button type="submit" className="w-full bg-brand-blue text-brand-cream font-bold py-2 rounded-pill">Add Expense</button>
      </form>

      {entries.length === 0 ? (
        <EmptyState emoji="🧾" title="No spending tracked yet" description="Add what you buy above to keep a running record." />
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className="bg-white border border-terracotta/20 rounded-soft p-3 flex justify-between">
              <div>
                <p className="font-bold text-sm">{e.itemName}</p>
                <p className="text-xs text-brand-black/50">{e.category || 'Uncategorised'} • {new Date(e.purchasedAt).toLocaleDateString()}</p>
              </div>
              <p className="font-bold text-brand-ochre">R{parseFloat(e.price).toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Expenditure