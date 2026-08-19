import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

function Hierarchy({ onBack }) {
  const { accessToken } = useAuth()
  const [ceremonyId, setCeremonyId] = useState('')
  const [groups, setGroups] = useState([])
  const [error, setError] = useState('')
  const [alcoholSummary, setAlcoholSummary] = useState(null) // <-- new state

  const [activeGroupId, setActiveGroupId] = useState('')
  const [itemDescription, setItemDescription] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitType, setUnitType] = useState('CASE')

  const loadGroups = async (id) => {
    const res = await fetch(`/api/hierarchy/${id}`, { headers: { Authorization: `Bearer ${accessToken}` } })
    const data = await res.json()
    setGroups(data)
  }

  const generateGroups = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch('/api/hierarchy/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ ceremonyId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      loadGroups(ceremonyId)
    } catch (err) {
      setError(err.message)
    }
  }

  const addAllocation = async (e) => {
    e.preventDefault()
    await fetch('/api/hierarchy/allocations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ ceremonyGroupId: activeGroupId, itemDescription, quantity, unitType }),
    })
    setItemDescription(''); setQuantity('')
    loadGroups(ceremonyId)
  }

  return (
    <div className="px-4 pt-6 pb-24 icamagu-bg min-h-screen">
      <button onClick={onBack} className="text-sm text-brand-black/60 mb-4">← Back</button>
      <h2 className="text-2xl font-extrabold text-brand-black mb-1">Umgidi Hierarchy</h2>
      <p className="text-xs text-brand-black/50 mb-4">The 14 traditional groups, and what each one needs.</p>

      <form onSubmit={generateGroups} className="bg-white border-2 border-brand-black rounded-soft p-4 mb-4 space-y-2">
        <input type="text" placeholder="Ceremony ID (from Ekoyini or Ceremony Prep)" value={ceremonyId}
          onChange={(e) => setCeremonyId(e.target.value)}
          className="w-full border border-brand-black/30 rounded-soft px-3 py-2 text-sm" required />
        {error && <p className="text-brand-ochre text-xs">{error}</p>}
        <button type="submit" className="w-full bg-brand-blue text-brand-cream font-bold py-2 rounded-pill">Generate the 14 Groups</button>
        <button type="button" onClick={() => loadGroups(ceremonyId)} className="w-full border-2 border-brand-black text-brand-black font-bold py-2 rounded-pill text-sm">
          Load Existing Groups
        </button>
      </form>

      {groups.length > 0 && (
        <>
          <div className="bg-white border border-brand-black/20 rounded-soft p-4 mb-4">
            <p className="text-xs font-black uppercase text-brand-black/40 mb-2">Set an allocation</p>
            <form onSubmit={addAllocation} className="space-y-2">
              <select value={activeGroupId} onChange={(e) => setActiveGroupId(e.target.value)}
                className="w-full border border-brand-black/30 rounded-soft px-3 py-2 text-sm" required>
                <option value="">Choose a group</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.groupLabel}</option>)}
              </select>
              <input type="text" placeholder="Item (e.g. Brandy)" value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                className="w-full border border-brand-black/30 rounded-soft px-3 py-2 text-sm" required />
              <div className="flex gap-2">
                <input type="number" placeholder="Qty" value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-1/3 border border-brand-black/30 rounded-soft px-3 py-2 text-sm" required />
                <select value={unitType} onChange={(e) => setUnitType(e.target.value)}
                  className="flex-1 border border-brand-black/30 rounded-soft px-3 py-2 text-sm">
                  <option value="CASE">Case(s)</option>
                  <option value="BOTTLE">Bottle(s)</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-brand-ochre text-white font-bold py-2 rounded-pill text-sm">Add</button>
            </form>
          </div>

          <div className="space-y-2">
            {groups.map((g) => (
              <div key={g.id} className="bg-white border-2 border-brand-black rounded-soft p-3">
                <p className="font-bold text-sm">{g.groupLabel}</p>
                {g.allocations.length === 0 ? (
                  <p className="text-xs text-brand-black/40">No allocation set</p>
                ) : g.allocations.map((a) => (
                  <p key={a.id} className="text-xs text-brand-black/60">{a.quantity} {a.unitType.toLowerCase()}(s) of {a.itemDescription}</p>
                ))}
              </div>
            ))}
          </div>

          {/* NEW: Calculate Total Shopping List button & summary */}
          <button
            onClick={async () => {
              const res = await fetch(`/api/hierarchy/${ceremonyId}/alcohol-summary`, { headers: { Authorization: `Bearer ${accessToken}` } })
              const data = await res.json()
              setAlcoholSummary(data)
            }}
            className="w-full bg-terracotta text-white font-bold py-2.5 rounded-pill text-sm mb-4"
          >
            🍾 Calculate Total Shopping List
          </button>

          {alcoholSummary && (
            <div className="bg-white border-2 border-terracotta rounded-soft p-4 mb-4">
              <p className="text-xs font-black uppercase text-terracotta mb-2">Total Needed — {alcoholSummary.groupCount} groups</p>
              {alcoholSummary.summary.map((s, idx) => (
                <div key={idx} className="flex justify-between text-sm py-1 border-b border-ink/10 last:border-0">
                  <span>{s.itemDescription}</span>
                  <span className="font-bold">{s.totalQuantity} {s.unitType.toLowerCase()}(s)</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Hierarchy