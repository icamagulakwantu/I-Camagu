import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import HeroHeader from '../components/ui/HeroHeader.jsx'
import { CEREMONY_IMAGE } from '../data/ceremonyImages.js'

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
      <HeroHeader
        image={CEREMONY_IMAGE.ULWALUKO}
        eyebrow="Ukusoka · Gifts for the initiate"
        title="Everything he receives,"
        accent="recorded."
        subtitle="Clothes, bedding and more from family and community, written down so nothing is forgotten and every giver is thanked."
        onBack={onBack}
      />

      <div className="relative z-10 -mt-12 px-4">
        <input placeholder="Who is being gifted? (initiate's name)" value={initiateName} onChange={(e) => setInitiateName(e.target.value)}
          className="mb-3 h-14 w-full rounded-[20px] border border-ink/[0.06] bg-white px-4 text-[15px] shadow-[0_16px_36px_-18px_rgba(28,22,18,0.45)] focus:border-terracotta focus:outline-none" />

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