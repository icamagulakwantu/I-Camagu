import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

function Expenditure({ onBack }) {
  const { accessToken } = useAuth()
  const [entries, setEntries] = useState([])
  const [total, setTotal] = useState(0)

  const [itemName, setItemName] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [purchasedAt, setPurchasedAt] = useState('')

  const fetchEntries = () => {
    fetch('/api/expenditure/my', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(res => res.json())
      .then((data) => { setEntries(data.entries); setTotal(data.total) })
  }

  useEffect(() => { fetchEntries() }, [])

  const addEntry = async (e) => {
    e.preventDefault()
    await fetch('/api/expenditure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ itemName, price, category, purchasedAt: purchasedAt || new Date().toISOString() }),
    })
    setItemName(''); setPrice(''); setCategory(''); setPurchasedAt('')
    fetchEntries()
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

      <form onSubmit={addEntry} className="bg-white border-2 border-brand-black rounded-soft p-4 mb-4 space-y-2">
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

      <div className="space-y-2">
        {entries.map((e) => (
          <div key={e.id} className="bg-white border border-brand-black/20 rounded-soft p-3 flex justify-between">
            <div>
              <p className="font-bold text-sm">{e.itemName}</p>
              <p className="text-xs text-brand-black/50">{e.category || 'Uncategorised'} • {new Date(e.purchasedAt).toLocaleDateString()}</p>
            </div>
            <p className="font-bold text-brand-ochre">R{parseFloat(e.price).toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Expenditure
