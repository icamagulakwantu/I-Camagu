import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import { shareToWhatsApp } from '../lib/whatsapp.js'
import { cn } from '../lib/utils'

// --------------------------------------------------------------
// Display‑ready ceremony types (from File 1)
// --------------------------------------------------------------
const CEREMONY_META = {
  ULWALUKO: { name: 'Ulwaluko', emoji: '✂️', desc: 'Initiation & manhood' },
  UMGIDI: { name: 'Umgidi', emoji: '🎉', desc: 'Homecoming celebration' },
  INTAMBO_ENKULU: { name: 'Intambo Enkulu', emoji: '🔗', desc: 'Ceremony planning' },
  UKUKHAPHA: { name: 'Ukukhapha', emoji: '🕊️', desc: 'Ceremony planning' },
  INKOBE_ZIKA_MAMA: { name: 'Inkobe zikaMama', emoji: '🌾', desc: 'Ceremony planning' },
  UKUBUYISA: { name: 'Ukubuyisa', emoji: '🏠', desc: 'Ceremony planning' },
  UMSEBENZI_WEGQIRHA: { name: 'Umsebenzi weGqirha', emoji: '🌿', desc: 'Ceremony planning' },
  WEDDING: { name: 'Wedding', emoji: '💍', desc: 'Marriage celebration' },
  GENERAL_EVENT: { name: 'General Event', emoji: '📅', desc: 'Custom event' },
}

const mapDisplayTypeToBackend = (displayId) => displayId.toUpperCase()

// --------------------------------------------------------------
// Main component
// --------------------------------------------------------------
export default function CeremonyPlanner({ onBack, defaultType, onViewTimeline, selectedCeremonyId }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()

  // ----- State from File 2 (multi‑plan) -----
  const [plans, setPlans] = useState([])
  const [activePlan, setActivePlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState(defaultType || 'ULWALUKO')
  const [ceremonyTypes, setCeremonyTypes] = useState([])
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [newChecklistItem, setNewChecklistItem] = useState({ phase: 'CUSTOM', label: '', isOptional: true })

  // ----- State for pledges (from File 1) -----
  const [pledges, setPledges] = useState([])
  const [showPledgeForm, setShowPledgeForm] = useState(false)
  const [newPledge, setNewPledge] = useState({ contributorName: '', pledgeItem: '', pledgeValue: '' })

  // --------------------------------------------------------------
  // API calls (all from File 2, pledges from File 1)
  // --------------------------------------------------------------
  const fetchPlans = () => {
    fetch('/api/ceremonies/plans/my', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(res => res.json())
      .then((data) => {
        const nextPlans = Array.isArray(data)
          ? data.map((plan) => ({
              ...plan,
              checklistItems: plan.ceremony?.checklistItems?.length
                ? plan.ceremony.checklistItems
                : (plan.checklistItems || []),
            }))
          : []
        setPlans(nextPlans)
        if (selectedCeremonyId) {
          const selectedPlan = nextPlans.find(plan => plan.ceremonyId === selectedCeremonyId)
          if (selectedPlan) setActivePlan(selectedPlan)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchPlans()
    fetch('/api/ceremonies/types', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(res => res.json())
      .then(data => setCeremonyTypes(Array.isArray(data) ? data.filter(type => type !== 'IMIGIDI' && type !== 'UMSEBENZI_WENKOMO') : []))
      .catch(() => setCeremonyTypes([]))
  }, [accessToken, selectedCeremonyId])

  useEffect(() => {
    if (defaultType) setNewType(defaultType)
  }, [defaultType])

  const createPlan = async (e) => {
    e.preventDefault()
    try {
      const ceremonyRes = await fetch('/api/ceremonies/auto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ type: newType, title: newTitle, eventDate: new Date().toISOString() }),
      })
      const ceremony = await ceremonyRes.json()
      if (!ceremonyRes.ok) throw new Error(ceremony.error || 'Could not create ceremony')

      const planRes = await fetch('/api/ceremonies/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: newTitle,
          ceremonyId: ceremony.id,
          items: [],
        }),
      })
      const plan = await planRes.json()
      if (!planRes.ok) throw new Error(plan.error || 'Could not create ceremony plan')

      const newPlan = {
        ...plan,
        ceremonyId: ceremony.id,
        ceremony,
        checklistItems: ceremony.checklistItems || [],
      }
      setPlans(prev => [newPlan, ...prev])
      setNewTitle('')
      setActivePlan(newPlan)
      showToast(`Ceremony created with ${newPlan.checklistItems.length} planning items`, 'success')
    } catch (err) {
      showToast(err.message || 'Could not create plan', 'error')
    }
  }

  const toggleItem = async (itemId) => {
    try {
      const item = (activePlan.checklistItems || []).find(i => i.id === itemId)
      const endpoint = item?.ceremonyId
        ? `/api/ceremonies/ceremony-checklist/${itemId}/toggle`
        : `/api/ceremonies/plans/items/${itemId}/toggle`

      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not update item')

      setActivePlan(prev => ({
        ...prev,
        checklistItems: prev.checklistItems.map(i => i.id === itemId ? data : i),
      }))
      showToast(data.isCompleted || data.isChecked ? 'Task completed! 🎉' : 'Task unchecked', data.isCompleted || data.isChecked ? 'success' : 'info')
    } catch (err) {
      showToast(err.message || 'Could not toggle item', 'error')
    }
  }

  const addChecklistItem = async (e) => {
    e.preventDefault()
    if (!newChecklistItem.label.trim() || !activePlan?.ceremonyId) return

    try {
      const res = await fetch(`/api/ceremonies/${activePlan.ceremonyId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(newChecklistItem),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not add checklist item')

      setActivePlan(prev => ({
        ...prev,
        checklistItems: [...(prev.checklistItems || []), data],
      }))
      setNewChecklistItem({ phase: 'CUSTOM', label: '', isOptional: true })
      showToast('Custom checklist item added', 'success')
    } catch (err) {
      showToast(err.message || 'Could not add checklist item', 'error')
    }
  }

  const deletePlan = async (planId) => {
    try {
      await fetch(`/api/ceremonies/plans/${planId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      setPlans(plans.filter(p => p.id !== planId))
      setActivePlan(null)
      setConfirmDelete(null)
      showToast('Plan deleted', 'info')
    } catch {
      showToast('Could not delete plan', 'error')
    }
  }

  const saveAsTemplate = async () => {
    const templateTitle = prompt('Name this template:', `${activePlan.title} Template`)
    if (!templateTitle) return
    try {
      const res = await fetch('/api/ceremonies/templates/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ planId: activePlan.id, templateTitle }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast('Saved as template', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const shareChecklist = async () => {
    try {
      const res = await fetch(`/api/ceremonies/plans/${activePlan.id}/share-link`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const message = `${activePlan.title} — my ceremony checklist on iCamagu\n${data.shareUrl}`
      if (navigator.share) {
        navigator.share({ title: activePlan.title, text: message }).catch(() => {})
      } else {
        shareToWhatsApp(message)
      }
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  // ----- Pledge API calls (schema-backed plan pledges) -----
  const fetchPledges = (planId) => {
    if (!planId) return
    fetch(`/api/ceremonies/plans/${planId}/pledges`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(res => res.json())
      .then((data) => setPledges(Array.isArray(data) ? data : []))
      .catch(() => setPledges([]))
  }

  useEffect(() => {
    if (activePlan?.id) fetchPledges(activePlan.id)
  }, [activePlan?.id])

  const addPledge = async (e) => {
    e.preventDefault()
    if (!activePlan?.id || !newPledge.contributorName || !newPledge.pledgeItem) {
      showToast('Please fill in all fields', 'error')
      return
    }
    try {
      const res = await fetch('/api/ceremonies/plans/pledges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          planId: activePlan.id,
          pledgerName: newPledge.contributorName,
          pledgedItem: newPledge.pledgeItem,
          pledgedAmountZAR: newPledge.pledgeValue ? parseFloat(newPledge.pledgeValue) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add pledge')
      setPledges(prev => [...prev, data])
      setNewPledge({ contributorName: '', pledgeItem: '', pledgeValue: '' })
      setShowPledgeForm(false)
      showToast('Pledge added successfully', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const deletePledge = async (pledgeId) => {
    try {
      const res = await fetch(`/api/ceremonies/plans/pledges/${pledgeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to delete pledge')
      setPledges(prev => prev.filter(p => p.id !== pledgeId))
      showToast('Pledge removed', 'info')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  // --------------------------------------------------------------
  // Helper: pressable class (from File 1)
  // --------------------------------------------------------------
  const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none'

  // --------------------------------------------------------------
  // Render: Active Plan View (polished UI from File 1)
  // --------------------------------------------------------------
  if (activePlan) {
    const items = activePlan.checklistItems || []
    const doneCount = items.filter(i => i.isChecked || i.isCompleted).length
    const total = items.length
    const progress = total ? Math.round((doneCount / total) * 100) : 0

    return (
      <div className="min-h-screen pb-24 bg-cream">
        {/* Header (File 1 style) */}
        <div className="bg-gradient-to-br from-sage-500 to-sage-600 text-white px-5 pt-12 pb-8 rounded-b-[2.5rem] relative overflow-hidden">
          <div className="absolute -top-1/4 -right-1/4 w-64 h-64 bg-white/5 rounded-full" />
          <div className="relative">
            <button
              type="button"
              onClick={() => setActivePlan(null)}
              className={`text-sm text-white/70 mb-3 block ${pressable}`}
            >
              ← Back to plans
            </button>
            <h1 className="font-display font-bold text-3xl">{activePlan.title}</h1>
            <p className="text-white/70 text-sm mt-1 font-medium">
              {doneCount}/{total} done — {progress}%
            </p>
          </div>
        </div>

        <div className="mx-4 mt-4 bg-white border-2 border-sage-200 rounded-soft p-4">
          <p className="text-xs font-black uppercase text-ink-muted mb-2">Add to this ceremony</p>
          <form onSubmit={addChecklistItem} className="space-y-2">
            <div className="flex gap-2">
              <select value={newChecklistItem.phase} onChange={(e) => setNewChecklistItem({ ...newChecklistItem, phase: e.target.value })}
                className="w-1/3 border border-ink/20 rounded-soft px-2 py-2 text-xs">
                <option value="CUSTOM">Custom</option>
                <option value="FOOD">Food</option>
                <option value="FAMILY">Family</option>
                <option value="LOGISTICS">Logistics</option>
                <option value="SEATING">Seating</option>
                <option value="SPEAKERS">Speakers</option>
              </select>
              <input placeholder="e.g. Add chicken for kitchen meal" value={newChecklistItem.label}
                onChange={(e) => setNewChecklistItem({ ...newChecklistItem, label: e.target.value })}
                className="flex-1 border border-ink/20 rounded-soft px-3 py-2 text-sm" required />
            </div>
            <label className="flex items-center gap-2 text-xs text-ink-muted">
              <input type="checkbox" checked={newChecklistItem.isOptional}
                onChange={(e) => setNewChecklistItem({ ...newChecklistItem, isOptional: e.target.checked })} />
              Household-specific / optional item
            </label>
            <button type="submit" className="w-full bg-sage-500 text-white font-bold py-2 rounded-pill text-sm">+ Add Item</button>
          </form>
        </div>

        {/* Progress Card (File 1 style) */}
        <div className="mx-4 mt-5 bg-white border-2 border-ink rounded-soft p-5 shadow-soft">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display font-bold text-lg text-ink">Planning Progress</h3>
            <span className="font-display font-bold text-2xl text-terracotta">{progress}%</span>
          </div>
          <div className="w-full h-3 bg-cream-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sage-400 via-sage-500 to-terracotta rounded-full transition-all duration-1000 ease-snap"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-white/30" />
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-ink-muted font-medium">
            <span>{doneCount} completed</span>
            <span>{total - doneCount} remaining</span>
          </div>
        </div>

        {/* Action Buttons (File 1 style) */}
        <div className="mx-4 mt-4 flex flex-wrap gap-2">
          <button
            onClick={saveAsTemplate}
            className={`flex-1 border-2 border-sage-500 text-sage-600 font-bold py-2.5 rounded-pill text-sm ${pressable}`}
          >
            📑 Save as Template
          </button>
          <button
            onClick={shareChecklist}
            className={`flex-1 bg-terracotta text-white font-bold py-2.5 rounded-pill text-sm ${pressable}`}
          >
            📤 Share
          </button>
          <button
            onClick={() => shareToWhatsApp(`${activePlan.title} checklist — planning this on iCamagu 🌾`)}
            className={`flex-1 bg-[#25D366] text-white font-bold py-2.5 rounded-pill text-sm ${pressable}`}
          >
            💬 WhatsApp
          </button>
          <button
            onClick={() => setConfirmDelete(activePlan.id)}
            className={`border-2 border-ink text-ink font-bold px-4 py-2.5 rounded-pill text-sm ${pressable}`}
          >
            🗑️ Delete
          </button>
        </div>

        {/* Confirm Delete Modal (File 2 style but with File 1 design) */}
        {confirmDelete && (
          <div className="mx-4 mt-3 bg-white border-2 border-terracotta rounded-soft p-4 shadow-soft">
            <p className="text-sm font-bold text-ink mb-3">Delete this ceremony plan permanently?</p>
            <div className="flex gap-2">
              <button
                onClick={() => deletePlan(activePlan.id)}
                className={`flex-1 bg-terracotta text-white font-bold py-2 rounded-pill text-sm ${pressable}`}
              >
                Yes, delete
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className={`flex-1 border-2 border-ink font-bold py-2 rounded-pill text-sm ${pressable}`}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Checklist (File 1 UI, using File 2 data) */}
        <div className="mx-4 mt-4 bg-white border-2 border-ink rounded-soft p-5 shadow-soft">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-extrabold text-ink-muted uppercase tracking-wider">Checklist</h3>
          </div>
          <div className="divide-y divide-cream-dark/50">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className="w-full flex items-center gap-3 py-4 text-left group transition-colors hover:bg-sage-50/50 -mx-2 px-2 rounded-xl"
              >
                <div
                  className={cn(
                    'w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 ease-bounce-subtle',
                    (item.isCompleted || item.isChecked)
                      ? 'bg-sage-500 border-sage-500 scale-110'
                      : 'border-cream-dark group-hover:border-sage-300'
                  )}
                >
                  {(item.isCompleted || item.isChecked) && <span className="text-white text-xs font-bold">✓</span>}
                </div>
                <span
                  className={cn(
                    'text-sm font-medium transition-all duration-200',
                    (item.isCompleted || item.isChecked) ? 'text-ink-muted line-through' : 'text-ink'
                  )}
                >
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Family Contributions (Pledges) – from File 1 */}
        <div className="mx-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-extrabold text-ink-muted uppercase tracking-wider">Family Contributions</h3>
            <button
              type="button"
              onClick={() => setShowPledgeForm(!showPledgeForm)}
              className={`text-xs font-bold text-sage-600 bg-sage-50 px-3 py-1.5 rounded-pill ${pressable}`}
            >
              {showPledgeForm ? 'Cancel' : '+ Add Pledge'}
            </button>
          </div>

          {showPledgeForm && (
            <form
              onSubmit={addPledge}
              className="bg-white border-2 border-ink rounded-soft p-4 mb-3 shadow-soft space-y-2 animate-fade-in"
            >
              <input
                type="text"
                placeholder="Name (e.g. Uncle Sipho)"
                value={newPledge.contributorName}
                onChange={(e) => setNewPledge(p => ({ ...p, contributorName: e.target.value }))}
                className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm focus:outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20"
                required
              />
              <input
                type="text"
                placeholder="Item (e.g. Goat, Groceries)"
                value={newPledge.pledgeItem}
                onChange={(e) => setNewPledge(p => ({ ...p, pledgeItem: e.target.value }))}
                className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm focus:outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20"
                required
              />
              <input
                type="text"
                placeholder="Value (optional, e.g. R500)"
                value={newPledge.pledgeValue}
                onChange={(e) => setNewPledge(p => ({ ...p, pledgeValue: e.target.value }))}
                className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm focus:outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20"
              />
              <button
                type="submit"
                className={`w-full bg-sage-500 text-white font-bold py-2 rounded-pill ${pressable}`}
              >
                Save Pledge
              </button>
            </form>
          )}

          {pledges.length === 0 ? (
            <EmptyState
              emoji="👨‍👩‍👧‍👦"
              title="No pledges yet"
              description="Assign roles and pledges to family members for this ceremony."
              primaryLabel="Add First Pledge"
              onPrimary={() => setShowPledgeForm(true)}
              className="border-2 border-ink"
            />
          ) : (
            <div className="space-y-2">
              {pledges.map((p) => (
                <div
                  key={p.id}
                  className="bg-white border-2 border-ink rounded-soft p-4 flex justify-between items-center shadow-soft"
                >
                  <div>
                    <p className="font-bold text-sm text-ink">{p.contributorName}</p>
                    <p className="text-xs text-ink-muted">
                      {p.pledgeItem} {p.pledgeValue && `· ${p.pledgeValue}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 bg-sage-50 text-sage-700 rounded-pill">
                      {p.status || 'Pledged'}
                    </span>
                    <button
                      type="button"
                      onClick={() => deletePledge(p.id)}
                      className={`text-xs text-rose-500 bg-rose-50 hover:bg-rose-100 p-1.5 rounded-pill ${pressable}`}
                      title="Delete pledge"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="h-8" />
      </div>
    )
  }

  // --------------------------------------------------------------
  // Render: Plan List / Create View (polished File 1 UI)
  // --------------------------------------------------------------
  return (
    <div className="min-h-screen pb-24 bg-cream">
      {/* Header (File 1 style) */}
      <div className="bg-gradient-to-br from-sage-500 to-sage-600 text-white px-5 pt-12 pb-8 rounded-b-[2.5rem] relative overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-64 h-64 bg-white/5 rounded-full" />
        <div className="relative">
          <button
            type="button"
            onClick={onBack}
            className={`text-sm text-white/70 mb-3 block ${pressable}`}
          >
            ← Back
          </button>
          <h1 className="font-display font-bold text-3xl">Ceremony Prep</h1>
          <p className="text-white/70 text-sm mt-1 font-medium">Plan every detail with precision</p>
        </div>
      </div>

      {/* Ceremony Type Selector (File 1 style) */}
      <div className="flex gap-2 px-4 mt-5 overflow-x-auto no-scrollbar pb-2">
        {ceremonyTypes.map((typeId) => {
          const type = CEREMONY_META[typeId] || {}
          return (
          <button
            key={typeId}
            type="button"
            onClick={() => {
              const backendType = mapDisplayTypeToBackend(typeId)
              const existing = plans.find(p => p.ceremonyType === backendType)
              if (existing) {
                setActivePlan(existing)
              } else {
                setNewType(backendType)
                setNewTitle(`New ${type.name || typeId.replace(/_/g, ' ')} Plan`)
                showToast(`No plan for ${type.name || typeId.replace(/_/g, ' ')} – fill in the form to create one`, 'info')
              }
            }}
            className={cn(
              'flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-soft text-sm font-bold transition-all duration-200 active:scale-95',
              'bg-white text-ink border-2 border-cream-dark hover:border-sage-300'
            )}
          >
            <span className="text-lg">{type.emoji || '🎉'}</span>
            <div className="text-left">
              <div className="text-xs leading-tight">{type.name || typeId.replace(/_/g, ' ')}</div>
              <div className="text-[10px] font-medium leading-tight text-ink-muted">{type.desc || 'Ceremony planning'}</div>
            </div>
          </button>
          )
        })}
      </div>

      {/* Create Plan Form (styled like File 1) */}
      <div className="mx-4 mt-4 bg-white border-2 border-ink rounded-soft p-5 shadow-soft">
        <h3 className="font-display font-bold text-lg text-ink mb-3">Create New Plan</h3>
        <form onSubmit={createPlan} className="space-y-3">
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm focus:outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20"
          >
            {ceremonyTypes.map((typeId) => {
              const t = CEREMONY_META[typeId] || {}
              return (
              <option key={typeId} value={mapDisplayTypeToBackend(typeId)}>
                {t.emoji || '🎉'} {t.name || typeId.replace(/_/g, ' ')}
              </option>
            )})}
          </select>
          <input
            type="text"
            placeholder="e.g. Lindani's Ulwaluko"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm focus:outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20"
            required
          />
          <button
            type="submit"
            className={`w-full bg-sage-500 text-white font-bold py-2.5 rounded-pill ${pressable}`}
          >
            Start planning
          </button>
        </form>
      </div>

      {/* List of existing plans (styled like File 1’s cards) */}
      <div className="px-4 mt-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : plans.length === 0 ? (
          <EmptyState
            emoji="📋"
            title="No plans yet"
            description="Start planning your first ceremony above."
          />
        ) : (
          <div className="space-y-2">
            {plans.map((plan) => {
              const done = plan.checklistItems?.filter(i => i.isChecked).length || 0
              const total = plan.checklistItems?.length || 0
              return (
                <button
                  key={plan.id}
                  onClick={() => setActivePlan(plan)}
                  className="w-full text-left bg-white border-2 border-ink rounded-soft p-4 shadow-soft hover:shadow-md transition-shadow"
                >
                  <p className="font-bold text-sm text-ink">{plan.title}</p>
                  <p className="text-xs text-ink-muted">{done}/{total} done</p>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="h-8" />
    </div>
  )
}