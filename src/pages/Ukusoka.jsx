import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'

const CATEGORIES = ['CLOTHING', 'BEDDING', 'TOILETRIES', 'OTHER']

function Ukusoka({ onBack }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const [initiateName, setInitiateName] = useState('')
  const [giverName, setGiverName] = useState('')
  const [relationship, setRelationship] = useState('')
  const [itemDescription, setItemDescription] = useState('')
  const [category, setCategory] = useState('CLOTHING')
  const [dateReceived, setDateReceived] = useState('')

  const fetchEntries = () => {
    fetch('/api/ukusoka/my', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error()
        setEntries(Array.isArray(data) ? data : [])
      })
      .catch(() => { showToast('Could not load entries', 'error'); setEntries([]) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchEntries() }, [])

  const addEntry = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/ukusoka', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ initiateName, giverName, relationship, itemDescription, category, dateReceived: dateReceived || new Date().toISOString() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setGiverName(''); setRelationship(''); setItemDescription(''); setDateReceived('')
      setShowForm(false)
      showToast('Recorded', 'success')
      fetchEntries()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  return (
    <div className="min-h-screen pb-24 bg-cream">
      <div className="bg-gradient-to-br from-sage-500 to-sage-600 text-white px-5 pt-10 pb-6 rounded-b-[2.5rem]">
        <button onClick={onBack} className="text-sm text-white/70 mb-3 block">← Back</button>
        <h1 className="font-display font-bold text-2xl">Ukusoka</h1>
        <p className="text-white/70 text-sm mt-1">What the initiate receives — clothes, bedding, and more from family and community.</p>
      </div>

      <div className="px-4 mt-4">
        <input placeholder="Who is being gifted? (initiate's name)" value={initiateName} onChange={(e) => setInitiateName(e.target.value)}
          className="w-full border-2 border-terracotta/20 rounded-soft px-3 py-2.5 text-sm mb-3 bg-white" />

        <button onClick={() => setShowForm(!showForm)} disabled={!initiateName}
          className="w-full bg-sage-500 text-white font-bold py-3 rounded-pill mb-4 disabled:opacity-40">
          {showForm ? 'Cancel' : '+ Record a Gift'}
        </button>

        {showForm && (
          <form onSubmit={addEntry} className="bg-white border-2 border-terracotta/25 rounded-soft p-4 mb-4 space-y-2">
            <input placeholder="Giver's name (e.g. Aunt Nomsa)" value={giverName} onChange={(e) => setGiverName(e.target.value)}
              className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm" required />
            <input placeholder="Relationship (e.g. Aunt, Uncle, Sibling)" value={relationship} onChange={(e) => setRelationship(e.target.value)}
              className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm" />
            <input placeholder="Item (e.g. blankets, new shirt)" value={itemDescription} onChange={(e) => setItemDescription(e.target.value)}
              className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm" required />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="date" value={dateReceived} onChange={(e) => setDateReceived(e.target.value)}
              className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm" />
            <button type="submit" className="w-full bg-terracotta text-white font-bold py-2.5 rounded-pill text-sm">Save</button>
          </form>
        )}

        {loading ? (
          <div className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
        ) : entries.filter(e => !initiateName || e.initiateName === initiateName).length === 0 ? (
          <EmptyState emoji="🎁" title="No gifts recorded yet" description="Track what the initiate receives from family and community." />
        ) : (
          <div className="space-y-2">
            {entries.filter(e => !initiateName || e.initiateName === initiateName).map((entry) => (
              <div key={entry.id} className="bg-white border-2 border-terracotta/25 rounded-soft p-3">
                <div className="flex justify-between">
                  <p className="font-bold text-sm">{entry.giverName}</p>
                  <span className="text-xs font-black text-sage-600 bg-sage-50 px-2 py-0.5 rounded-pill">{entry.category}</span>
                </div>
                {entry.relationship && <p className="text-xs text-ink-muted">{entry.relationship}</p>}
                <p className="text-sm text-ink-muted mt-1">{entry.itemDescription}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Ukusoka