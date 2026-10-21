import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import { shareToWhatsApp } from '../lib/whatsapp.js'
import { cn } from '../lib/utils'
import Icon from '../components/Icon.jsx'
import CeremonyIcon from '../components/CeremonyIcon.jsx'
import CostsTab from './ceremony/CostsTab.jsx'
import { UNFORESEEN_PHASE } from '../../shared/ceremonyCosts.js'

// --------------------------------------------------------------
// Display‑ready ceremony types (from File 1)
// --------------------------------------------------------------
// titleExample is the placeholder shown when naming a plan. It is not a name
// swap: isiXhosa builds the possessive from the noun class of the ceremony
// itself, so the linking word changes with the rite. Umgidi (class 3) takes
// ka-, inkobe (class 10) takes zika-, ukukhapha and ukubuyisa (class 15) take
// kuka-, ulwaluko (class 11) takes luka-. Writing "Umgidi zikaSihle" would be
// wrong in the same way "Sihle's the Umgidi" is wrong in English, so keep the
// linking word with the rite it belongs to.
const CEREMONY_META = {
  ULWALUKO: { name: 'Ulwaluko', desc: 'Initiation & manhood', titleExample: 'Ulwaluko lukaLindani' },
  UMGIDI: { name: 'Umgidi', desc: 'Homecoming celebration', titleExample: 'Umgidi kaSihle' },
  INTAMBO_ENKULU: { name: 'Intambo Enkulu', desc: 'Ceremony planning', titleExample: 'Intambo Enkulu kaThandi' },
  UKUKHAPHA: { name: 'Ukukhapha', desc: 'Ceremony planning', titleExample: 'Ukukhapha kukaVumile' },
  INKOBE_ZIKA_MAMA: { name: 'Inkobe zikaMama', desc: 'Ceremony planning', titleExample: 'Inkobe zikaNoluthando' },
  UKUBUYISA: { name: 'Ukubuyisa', desc: 'Ceremony planning', titleExample: 'Ukubuyisa kukaNomsa' },
  UMSEBENZI_WEGQIRHA: { name: 'Umsebenzi weGqirha', desc: 'Ceremony planning', titleExample: 'Umsebenzi kaZanele' },
  WEDDING: { name: 'Wedding', desc: 'Marriage celebration', titleExample: "Sindiswa's Wedding" },
  GENERAL_EVENT: { name: 'General Event', desc: 'Custom event', titleExample: 'Family gathering, July 2026' },
}

const mapDisplayTypeToBackend = (displayId) => displayId.toUpperCase()

// An open plan used to be one long scroll. It is split into named sections,
// the same pattern used for the Stokvel detail screen. The old separate
// Checklist and Budget & Costs tabs overlapped and drifted out of step (prices
// typed on one never reached the other), so they are now one tab.
const PLAN_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'costs', label: 'Checklist & Budget' },
  { id: 'contributions', label: 'Contributions' },
]

// --------------------------------------------------------------
// Main component
// --------------------------------------------------------------
export default function CeremonyPlanner({ onBack, defaultType, onViewTimeline, onViewBudget, onBookEkoyini, selectedCeremonyId }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()

  // ----- State from File 2 (multi‑plan) -----
  const [plans, setPlans] = useState([])
  const [activePlan, setActivePlan] = useState(null)
  const [planTab, setPlanTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [newBudget, setNewBudget] = useState('')
  const [newGuestCount, setNewGuestCount] = useState('')
  const [newType, setNewType] = useState(defaultType || 'ULWALUKO')
  const [ceremonyTypes, setCeremonyTypes] = useState([])
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [budgetEditorOpen, setBudgetEditorOpen] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')
  const [savingBudget, setSavingBudget] = useState(false)
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false)
  const [templateTitleInput, setTemplateTitleInput] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)

  // ----- State for pledges (from File 1) -----
  const [pledges, setPledges] = useState([])
  const [showPledgeForm, setShowPledgeForm] = useState(false)
  const [newPledge, setNewPledge] = useState({ contributorName: '', pledgeItem: '', pledgeValue: '' })

  // --------------------------------------------------------------
  // API calls (all from File 2, pledges from File 1)
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
          if (selectedPlan) { setActivePlan(selectedPlan); setPlanTab('overview') }
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchPlans()
    fetch('/api/ceremonies/types', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(res => res.json())
      .then(data => setCeremonyTypes(Array.isArray(data) ? data : []))
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
         headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
         body: JSON.stringify({ type: newType, title: newTitle, eventDate: new Date().toISOString(), budgetZAR: newBudget ? parseFloat(newBudget) : undefined, guestCount: newGuestCount ? parseInt(newGuestCount, 10) : undefined, createPlan: true }),
       })
       const response = await ceremonyRes.json()
       if (!ceremonyRes.ok) throw new Error(response.error || 'Could not create ceremony')
       const ceremony = response.ceremony || response
       const plan = response.preparationPlan
       if (!plan) throw new Error('Ceremony was created without a planning workspace')
       const newPlan = { ...plan, ceremonyId: ceremony.id, ceremony, checklistItems: ceremony.checklistItems || [] }
      setPlans(prev => [newPlan, ...prev])
      setNewTitle('')
      setNewBudget('')
      setNewGuestCount('')
      setActivePlan(newPlan)
      setPlanTab('overview')
      showToast(`Ceremony created with ${newPlan.checklistItems.length} planning items`, 'success')
    } catch (err) {
      showToast(err.message || 'Could not create plan', 'error')
    }
  }

  // The Checklist & Budget tab owns its own edits. It reports back here so the
  // progress bar and overview stay in step with what was just changed.
  const syncPlanItems = ({ costItems, checklistItems }) => {
    const apply = (plan) => (plan.id === activePlan?.id
      ? { ...plan, checklistItems, ceremony: plan.ceremony ? { ...plan.ceremony, costItems, checklistItems } : plan.ceremony }
      : plan)
    setActivePlan((prev) => (prev ? apply(prev) : prev))
    setPlans((prev) => prev.map(apply))
  }

  const editBudget = () => {
    if (!activePlan?.ceremonyId) return
    const current = activePlan.ceremony?.budgetZAR
    setBudgetInput(current == null ? '' : String(current))
    setBudgetEditorOpen(true)
  }

  const saveBudget = async (e) => {
    e.preventDefault()
    const trimmed = budgetInput.trim()
    const parsed = trimmed === '' ? null : parseFloat(trimmed)
    if (parsed !== null && (isNaN(parsed) || parsed < 0)) { showToast('Please enter a valid non-negative amount', 'error'); return }
    setSavingBudget(true)
    try {
      const res = await fetch('/api/ceremonies/' + activePlan.ceremonyId, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + accessToken }, body: JSON.stringify({ budgetZAR: parsed }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save budget')
      setActivePlan(prev => ({ ...prev, ceremony: { ...prev.ceremony, budgetZAR: data.budgetZAR } }))
      setPlans(prev => prev.map(plan => plan.ceremonyId === activePlan.ceremonyId ? { ...plan, ceremony: { ...plan.ceremony, budgetZAR: data.budgetZAR } } : plan))
      setBudgetEditorOpen(false)
      showToast('Budget updated', 'success')
    } catch (err) { showToast(err.message || 'Could not save budget', 'error') }
    finally { setSavingBudget(false) }
  }

  const deleteCeremonyWorkspace = async (ceremonyId) => {
    try {
      const res = await fetch('/api/ceremonies/' + ceremonyId, { method: 'DELETE', headers: { Authorization: 'Bearer ' + accessToken } })
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || 'Could not delete ceremony') }
      setPlans(prev => prev.filter(plan => plan.ceremonyId !== ceremonyId))
      setActivePlan(null)
      setConfirmDelete(null)
      showToast('Ceremony deleted', 'info')
    } catch (err) { showToast(err.message || 'Could not delete ceremony', 'error') }
  }

  const saveAsTemplate = () => {
    if (!activePlan) return
    setTemplateTitleInput(`${activePlan.title} Template`)
    setTemplateEditorOpen(true)
  }

  const confirmSaveTemplate = async (e) => {
    e.preventDefault()
    const templateTitle = templateTitleInput.trim()
    if (!templateTitle) { showToast('Please enter a template name', 'error'); return }
    setSavingTemplate(true)
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
      setTemplateEditorOpen(false)
      showToast('Saved as template', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSavingTemplate(false)
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
  // Helper: pressable class (from File 1)
  // --------------------------------------------------------------
  const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none'

  // --------------------------------------------------------------
  // Render: Active Plan View (polished UI from File 1)
  // --------------------------------------------------------------
  if (activePlan) {
    // Unforeseen expenses are costs, not tasks, so they do not count towards progress.
    const items = (activePlan.checklistItems || []).filter(i => i.phase !== UNFORESEEN_PHASE)
    const doneCount = items.filter(i => i.isChecked || i.isCompleted).length
    const total = items.length
    const progress = total ? Math.round((doneCount / total) * 100) : 0

    const budgetZAR = activePlan.ceremony?.budgetZAR != null ? parseFloat(activePlan.ceremony.budgetZAR) : null
    // Family pledges counted the same way the separate Budget dashboard
    // counts them (see getPlanBudget), so the two screens never disagree.
    const totalPledged = pledges.reduce((sum, p) => sum + (p.pledgedAmountZAR != null ? parseFloat(p.pledgedAmountZAR) : 0), 0)

    return (
      <div className="min-h-screen pb-24 bg-cream">
        {/* Header (File 1 style) */}
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

        <div className="flex gap-2 px-4 mt-4 overflow-x-auto pb-1">
          {PLAN_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setPlanTab(t.id)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-pill text-[12px] font-bold transition-colors ${
                planTab === t.id ? 'bg-ink text-white' : 'bg-white border border-ink/10 text-ink-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {planTab === 'costs' && (
          <CostsTab
            key={activePlan.id}
            ceremonyId={activePlan.ceremonyId}
            accessToken={accessToken}
            budgetZAR={budgetZAR}
            legacyItems={activePlan.checklistItems || []}
            totalPledged={totalPledged}
            pledgeCount={pledges.length}
            onEditBudget={editBudget}
            onViewPledges={() => setPlanTab('contributions')}
            onItemsChanged={syncPlanItems}
          />
        )}

        {budgetEditorOpen && planTab === 'costs' && (
          <div className="mx-4 mt-3 bg-white border-2 border-sage-500 rounded-soft p-4 shadow-soft">
            <form onSubmit={saveBudget}>
              <h2 className="text-sm font-bold text-ink mb-1">Set ceremony budget</h2>
              <p className="text-xs text-ink-muted mb-3">Enter the maximum amount you plan to spend. Leave blank to clear it.</p>
              <label htmlFor="ceremony-budget-costs" className="block text-xs font-bold text-ink-muted mb-1">Budget in ZAR</label>
              <input id="ceremony-budget-costs" type="number" min="0" step="0.01" inputMode="decimal" value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)} className="w-full border-2 border-cream-dark rounded-soft px-3 py-2 text-ink" autoFocus />
              <div className="flex gap-2 mt-3"><button type="submit" disabled={savingBudget} className={`flex-1 bg-sage-600 text-white font-bold py-2 rounded-pill text-sm ${pressable}`}>{savingBudget ? 'Saving…' : 'Save budget'}</button><button type="button" onClick={() => setBudgetEditorOpen(false)} className={`flex-1 border-2 border-sage-200 font-bold py-2 rounded-pill text-sm ${pressable}`}>Cancel</button></div>
            </form>
          </div>
        )}

        {planTab === 'overview' && (
        <>

        {/* Progress Card (File 1 style) */}
        <div className="mx-4 mt-5 bg-white border-2 border-terracotta/25 rounded-soft p-5 shadow-soft">
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

        {/* Action Buttons (File 1 style) */}
        <div className="mx-4 mt-4">
          <div className={`grid ${activePlan.ceremonyId ? 'grid-cols-4' : 'grid-cols-3'} gap-2`}>
          <button
            onClick={saveAsTemplate}
            className={`flex flex-col items-center gap-1 bg-white border border-terracotta/15 rounded-soft py-3 px-1 ${pressable}`}
          >
            <Icon name="template" color="#c45c26" />
            <span className="text-[10px] font-bold text-ink-muted text-center leading-tight">Save as Template</span>
          </button>
          <button
            onClick={() => onViewBudget?.(activePlan.id, activePlan.title)}
            className={`flex flex-col items-center gap-1 bg-white border border-terracotta/15 rounded-soft py-3 px-1 ${pressable}`}
          >
            <Icon name="coins" color="#c1922f" />
            <span className="text-[10px] font-bold text-ink-muted text-center leading-tight">Budget</span>
          </button>
          <button
            onClick={() => onViewTimeline?.(activePlan.ceremonyType)}
            className={`flex flex-col items-center gap-1 bg-white border border-terracotta/15 rounded-soft py-3 px-1 ${pressable}`}
          >
            <Icon name="clock" color="#4a7a4a" />
            <span className="text-[10px] font-bold text-ink-muted text-center leading-tight">Timeline</span>
          </button>
          {activePlan.ceremonyId && (
            <button
              onClick={() => onBookEkoyini?.(activePlan.ceremonyId, activePlan.title)}
              className={`flex flex-col items-center gap-1 bg-white border border-terracotta/15 rounded-soft py-3 px-1 ${pressable}`}
            >
              <Icon name="cocktail" color="#2b2620" />
              <span className="text-[10px] font-bold text-ink-muted text-center leading-tight">Ekoyini Bar</span>
            </button>
          )}
          </div>

          <div className="flex gap-2 mt-2">
          <button
            onClick={shareChecklist}
            className={`flex-1 border-2 border-terracotta text-terracotta font-bold py-2.5 rounded-pill text-sm flex items-center justify-center gap-1.5 ${pressable}`}
          >
            <Icon name="share" size={14} /> Share
          </button>
          <button
            onClick={() => shareToWhatsApp(`${activePlan.title} checklist — planning this on iCamagu 🌾`)}
            className={`flex-1 bg-[#25D366] text-white font-bold py-2.5 rounded-pill text-sm ${pressable}`}
          >
            WhatsApp
          </button>
          </div>

          <button
            onClick={() => setConfirmDelete(activePlan.ceremonyId)}
            className={`w-full text-center text-terracotta text-xs font-bold mt-3 py-1 ${pressable}`}
          >
            Delete ceremony
          </button>
        </div>

        {templateEditorOpen && (
        <div className="mx-4 mt-3 bg-white border-2 border-sage-500 rounded-soft p-4 shadow-soft">
          <form onSubmit={confirmSaveTemplate}>
            <h2 className="text-sm font-bold text-ink mb-1">Name this template</h2>
            <p className="text-xs text-ink-muted mb-3">You can reuse this template to start future ceremonies faster.</p>
            <label htmlFor="template-title" className="block text-xs font-bold text-ink-muted mb-1">Template name</label>
            <input id="template-title" type="text" value={templateTitleInput} onChange={(e) => setTemplateTitleInput(e.target.value)} className="w-full border-2 border-cream-dark rounded-soft px-3 py-2 text-ink" autoFocus />
            <div className="flex gap-2 mt-3"><button type="submit" disabled={savingTemplate} className={`flex-1 bg-sage-600 text-white font-bold py-2 rounded-pill text-sm ${pressable}`}>{savingTemplate ? 'Saving…' : 'Save template'}</button><button type="button" onClick={() => setTemplateEditorOpen(false)} className={`flex-1 border-2 border-sage-200 font-bold py-2 rounded-pill text-sm ${pressable}`}>Cancel</button></div>
          </form>
        </div>
      )}

        {confirmDelete && (
          <div className="mx-4 mt-3 bg-white border-2 border-terracotta rounded-soft p-4 shadow-soft">
            <p className="text-sm font-bold text-ink mb-1">Delete this ceremony permanently?</p>
            <p className="text-xs text-ink/70 mb-3">This removes the ceremony, checklist, budget, cost items and pledges. This cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={() => deleteCeremonyWorkspace(activePlan.ceremonyId)}
                className={`flex-1 bg-terracotta text-white font-bold py-2 rounded-pill text-sm ${pressable}`}
              >
                Yes, delete
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className={`flex-1 border-2 border-terracotta/25 font-bold py-2 rounded-pill text-sm ${pressable}`}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        </>
        )}

        {planTab === 'contributions' && (
        <>
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
              className="bg-white border-2 border-terracotta/25 rounded-soft p-4 mb-3 shadow-soft space-y-2 animate-fade-in"
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
              className="border-2 border-terracotta/25"
            />
          ) : (
            <div className="space-y-2">
              {pledges.map((p) => {
                // The server returns pledgerName / pledgedItem / pledgedAmountZAR
                // (see ContributionPledge in the schema), not contributorName /
                // pledgeItem / pledgeValue / status — those older field names
                // never matched, so every pledge used to render blank.
                const pledgedAmount = p.pledgedAmountZAR != null ? parseFloat(p.pledgedAmountZAR) : null
                const paidAmount = p.paidAmountZAR != null ? parseFloat(p.paidAmountZAR) : 0
                const isPaid = pledgedAmount != null && paidAmount >= pledgedAmount && pledgedAmount > 0
                return (
                <div
                  key={p.id}
                  className="bg-white border-2 border-terracotta/25 rounded-soft p-4 flex justify-between items-center shadow-soft"
                >
                  <div>
                    <p className="font-bold text-sm text-ink">{p.pledgerName}{p.relationship ? ` · ${p.relationship}` : ''}</p>
                    <p className="text-xs text-ink-muted">
                      {p.pledgedItem} {pledgedAmount != null && `· R${pledgedAmount.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs font-bold px-2.5 py-1 rounded-pill', isPaid ? 'bg-sage-100 text-sage-700' : 'bg-sage-50 text-sage-700')}>
                      {isPaid ? 'Received' : 'Pledged'}
                    </span>
                    <button
                      type="button"
                      onClick={() => deletePledge(p.id)}
                      className={`text-xs text-rose-500 bg-rose-50 hover:bg-rose-100 p-1.5 rounded-pill ${pressable}`}
                      title="Delete pledge"
                    >
                      <Icon name="trash" size={14} color="#f43f5e" />
                    </button>
                  </div>
                </div>
                )
              })}
            </div>
          )}
        </div>
        </>
        )}

        <div className="h-8" />
      </div>
    )
  }

  // --------------------------------------------------------------
  // Render: Plan List / Create View (polished File 1 UI)
  // --------------------------------------------------------------
  return (
    <div className="min-h-screen pb-24 bg-cream">
      {/* Header (File 1 style) */}
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

      {/* Ceremony Type Selector (File 1 style) */}
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
                setPlanTab('overview')
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
            <CeremonyIcon type={typeId} size={34} />
            <div className="text-left">
              <div className="text-xs leading-tight">{type.name || typeId.replace(/_/g, ' ')}</div>
              <div className="text-[10px] font-medium leading-tight text-ink-muted">{type.desc || 'Ceremony planning'}</div>
            </div>
          </button>
          )
        })}
      </div>

      {/* Create Plan Form (styled like File 1) */}
      <div className="mx-4 mt-4 bg-white border-2 border-terracotta/25 rounded-soft p-5 shadow-soft">
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
                {t.name || typeId.replace(/_/g, ' ')}
              </option>
            )})}
          </select>
          <input
            type="text"
            placeholder={`e.g. ${CEREMONY_META[newType]?.titleExample || 'Name this plan'}`}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm focus:outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20"
            required
          />
          <input
            type="number"
            placeholder="Your budget (ZAR, optional — e.g. 50000)"
            value={newBudget}
            onChange={(e) => setNewBudget(e.target.value)}
            min="0"
            step="any"
            className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm focus:outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20"
          />
          <input
            type="number"
            placeholder="Number of guests (optional — e.g. 200)"
            value={newGuestCount}
            onChange={(e) => setNewGuestCount(e.target.value)}
            min="1"
            step="1"
            className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm focus:outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20"
          />
          <p className="text-[11px] text-ink-muted -mt-1">For Umgidi, this scales the catering quantities (maize meal, potatoes, veg) automatically.</p>
          <button
            type="submit"
            className={`w-full bg-sage-500 text-white font-bold py-2.5 rounded-pill ${pressable}`}
          >
            Start planning
          </button>
        </form>
      </div>

      {/* List of existing plans (styled like File 1’s cards) */}
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
              const planItems = (plan.checklistItems || []).filter(i => i.phase !== UNFORESEEN_PHASE)
              const done = planItems.filter(i => i.isChecked || i.isCompleted).length
              const total = planItems.length
              return (
                <button
                  key={plan.id}
                  onClick={() => { setActivePlan(plan); setPlanTab('overview') }}
                  className="w-full text-left bg-white border-2 border-terracotta/25 rounded-soft p-4 shadow-soft hover:shadow-md transition-shadow"
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
