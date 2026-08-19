import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none'

export default function FamilyContributions({ onBack }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()

  const [plans, setPlans] = useState([])
  const [activePlan, setActivePlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // Combined state management for form fields
  const [form, setForm] = useState({
    pledgerName: '',
    relationship: '',
    pledgedItem: '',
    pledgedAmountZAR: '',
  })

  // Load ceremony plans and update state safely
  const fetchPlans = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const res = await fetch('/api/ceremonies/plans/my', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error('Failed to load ceremony plans')
      const data = await res.json()
      const plansList = Array.isArray(data) ? data : []
      setPlans(plansList)

      // Re-sync active plan state if one is currently selected
      if (activePlan) {
        const updatedPlan = plansList.find((p) => p.id === activePlan.id)
        if (updatedPlan) setActivePlan(updatedPlan)
      }
    } catch (err) {
      showToast(err.message, 'error')
      setPlans([])
    } finally {
      setLoading(false)
    }
  }, [accessToken, showToast, activePlan?.id])

  useEffect(() => {
    fetchPlans()
  }, [])

  const handleInputChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const addPledge = async (e) => {
    e.preventDefault()
    if (!form.pledgerName || !form.pledgedItem) {
      showToast('Please fill in all required fields', 'error')
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
          pledgerName: form.pledgerName,
          relationship: form.relationship,
          pledgedItem: form.pledgedItem,
          pledgedAmountZAR: form.pledgedAmountZAR ? parseFloat(form.pledgedAmountZAR) : null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add pledge')

      setForm({ pledgerName: '', relationship: '', pledgedItem: '', pledgedAmountZAR: '' })
      setShowForm(false)
      showToast('Pledge added successfully', 'success')
      await fetchPlans()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  // --- VIEW 1: ACTIVE PLAN PLEDGES ---
  if (activePlan) {
    return (
      <div className="min-h-screen pb-24 bg-cream">
        <div className="bg-gradient-to-br from-sage-500 to-sage-600 text-white px-5 pt-12 pb-8 rounded-b-[2.5rem] relative overflow-hidden">
          <div className="absolute -top-1/4 -right-1/4 w-64 h-64 bg-white/5 rounded-full" />
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setActivePlan(null)
                setShowForm(false)
              }}
              className={`text-sm text-white/70 mb-3 block ${pressable}`}
            >
              ← All plans
            </button>
            <h1 className="font-display font-bold text-3xl">{activePlan.title}</h1>
            <p className="text-white/70 text-sm mt-1">Track family pledges and responsibilities for this ceremony.</p>
          </div>
        </div>

        <div className="px-4 mt-5">
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className={`w-full bg-sage-500 text-white font-bold py-3 rounded-pill shadow-glow mb-4 ${pressable}`}
          >
            {showForm ? '✕ Cancel' : '+ Add Pledge'}
          </button>

          {showForm && (
            <form onSubmit={addPledge} className="bg-white border-2 border-ink rounded-soft p-5 shadow-soft mb-4 space-y-3">
              <input
                type="text"
                placeholder="Name (e.g. Uncle Sipho)"
                value={form.pledgerName}
                onChange={(e) => handleInputChange('pledgerName', e.target.value)}
                className="w-full h-12 border-2 border-cream-dark rounded-soft px-4 text-sm focus:outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20"
                required
              />
              <input
                type="text"
                placeholder="Relationship (e.g. Paternal uncle)"
                value={form.relationship}
                onChange={(e) => handleInputChange('relationship', e.target.value)}
                className="w-full h-12 border-2 border-cream-dark rounded-soft px-4 text-sm focus:outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20"
              />
              <input
                type="text"
                placeholder="What they're bringing (e.g. livestock or groceries)"
                value={form.pledgedItem}
                onChange={(e) => handleInputChange('pledgedItem', e.target.value)}
                className="w-full h-12 border-2 border-cream-dark rounded-soft px-4 text-sm focus:outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20"
                required
              />
              <input
                type="number"
                step="0.01"
                placeholder="Estimated value (ZAR, optional)"
                value={form.pledgedAmountZAR}
                onChange={(e) => handleInputChange('pledgedAmountZAR', e.target.value)}
                className="w-full h-12 border-2 border-cream-dark rounded-soft px-4 text-sm focus:outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20"
              />
              <button
                type="submit"
                className={`w-full bg-terracotta text-white font-bold py-3 rounded-pill shadow-terracotta ${pressable}`}
              >
                Save Pledge
              </button>
            </form>
          )}

          {(activePlan.pledges || []).length === 0 ? (
            <EmptyState
              emoji="👨‍👩‍👧‍👦"
              title="No pledges yet"
              description="Assign roles and pledges to family members for this ceremony."
              primaryLabel="Add First Pledge"
              onPrimary={() => setShowForm(true)}
              className="border-2 border-ink"
            />
          ) : (
            <div className="space-y-2">
              {activePlan.pledges.map((pledge) => (
                <div key={pledge.id} className="bg-white border-2 border-ink rounded-soft p-4 flex justify-between items-center shadow-soft">
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-bold text-sm text-ink">{pledge.pledgerName}</p>
                      {pledge.relationship && (
                        <span className="text-[10px] bg-cream-dark text-ink-muted px-2 py-0.5 rounded-pill">
                          {pledge.relationship}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-muted mt-1">{pledge.pledgedItem}</p>
                  </div>
                  {pledge.pledgedAmountZAR && (
                    <span className="text-xs font-bold text-terracotta bg-terracotta/10 px-2.5 py-1 rounded-pill">
                      Est. R{parseFloat(pledge.pledgedAmountZAR).toFixed(2)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // --- VIEW 2: PLAN SELECTION LIST ---
  return (
    <div className="min-h-screen pb-24 bg-cream">
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
          <h1 className="font-display font-bold text-3xl">Family Contributions</h1>
          <p className="text-white/70 text-sm mt-1">Select a ceremony plan to manage contributions</p>
        </div>
      </div>

      <div className="px-4 mt-6">
        <h3 className="text-xs font-extrabold text-ink-muted uppercase tracking-wider mb-3">Your Ceremony Plans</h3>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full rounded-soft" />
            <Skeleton className="h-20 w-full rounded-soft" />
          </div>
        ) : plans.length === 0 ? (
          <EmptyState
            emoji="📋"
            title="No ceremony plans yet"
            description="Create a plan in Ceremony Preparation first to start tracking family pledges."
            className="border-2 border-ink"
          />
        ) : (
          <div className="space-y-2">
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setActivePlan(plan)}
                className={`w-full text-left bg-white border-2 border-ink rounded-soft p-4 shadow-soft flex justify-between items-center ${pressable}`}
              >
                <div>
                  <p className="font-bold text-sm text-ink">{plan.title}</p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {(plan.pledges || []).length} pledge(s) recorded
                  </p>
                </div>
                <span className="text-xs font-bold text-sage-600 bg-sage-50 px-3 py-1 rounded-pill">
                  View →
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
