import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useCommunity } from '../context/CommunityContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import { cn } from '../lib/utils'
import CeremonyIcon from '../components/CeremonyIcon.jsx'
import { buildListRows, countProgress } from '../../shared/ceremonyList.js'
import { request } from './ceremony/api.js'
import Bi from './ceremony/Bi.jsx'
import ShoppingList from './ceremony/ShoppingList.jsx'
import Summary from './ceremony/Summary.jsx'
import Pledges from './ceremony/Pledges.jsx'
import { typeName } from './ceremony/ceremonyMeta.js'
import { formatDate } from './ceremony/format.js'
import { pressable } from './ceremony/styles.js'
import { STEPS, BUTTONS } from './ceremony/wizardText.js'
import {
  EMPTY_FORM, FORM_STEP_IDS, STEP_COMPONENTS, formFromPlan, formToPayload, planTitle, stepIsValid,
} from './ceremony/ceremonyForm.js'

const INVALID_MESSAGE = {
  what: 'Please choose the kind of ceremony',
  when: 'Please add a name and a date',
  who: 'Please type a number of people, or leave it empty',
  money: 'Please type an amount in rand, or leave it empty',
}

const planProgress = (plan) => countProgress(buildListRows({
  costItems: plan.ceremony?.costItems || [],
  checklistItems: plan.checklistItems || [],
}))

// A guided plan: What, When, Who is coming, Money, Shopping list, then a
// summary where any section can be tapped to edit. Props are unchanged from
// the old planner so App.jsx needs no edit.
export default function CeremonyPlanner({ onBack, defaultType, onViewTimeline, onBookEkoyini, selectedCeremonyId }) {
  const { accessToken } = useAuth()
  const { setActiveCeremony } = useCommunity()
  const { showToast } = useToast()

  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [ceremonyTypes, setCeremonyTypes] = useState([])
  const [activePlan, setActivePlan] = useState(null)
  const [creating, setCreating] = useState(false)
  const [stepId, setStepId] = useState('what')
  const [form, setForm] = useState(EMPTY_FORM)
  const [returnToSummary, setReturnToSummary] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPledges, setShowPledges] = useState(false)
  const [pledges, setPledges] = useState([])

  const openPlan = (plan) => {
    setActiveCeremony(plan.ceremony || plan)
    setActivePlan(plan)
    setForm(formFromPlan(plan))
    setStepId('summary')
    setCreating(false)
    setReturnToSummary(false)
    setShowPledges(false)
  }

  const fetchPlans = () => {
    request('/api/ceremonies/plans/my', accessToken)
      .then((data) => {
        const nextPlans = Array.isArray(data)
          ? data.map((plan) => ({
              ...plan,
              checklistItems: plan.ceremony?.checklistItems?.length ? plan.ceremony.checklistItems : (plan.checklistItems || []),
            }))
          : []
        setPlans(nextPlans)
        const selected = selectedCeremonyId && nextPlans.find((plan) => plan.ceremonyId === selectedCeremonyId)
        if (selected) openPlan(selected)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchPlans()
    request('/api/ceremonies/types', accessToken)
      .then((data) => setCeremonyTypes(Array.isArray(data) ? data : []))
      .catch(() => setCeremonyTypes([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, selectedCeremonyId])

  useEffect(() => {
    if (!activePlan?.id) return
    request(`/api/ceremonies/plans/${activePlan.id}/pledges`, accessToken)
      .then((data) => setPledges(Array.isArray(data) ? data : []))
      .catch(() => setPledges([]))
  }, [activePlan?.id, accessToken])

  const startNew = () => {
    setForm({ ...EMPTY_FORM, type: defaultType || '' })
    setStepId('what')
    setCreating(true)
    setReturnToSummary(false)
  }

  const leaveWizard = () => {
    setActiveCeremony(null)
    setActivePlan(null)
    setCreating(false)
    setReturnToSummary(false)
    setPledges([])
  }

  const updateCeremonyInState = (updated) => {
    const apply = (plan) => (plan.id === activePlan.id ? { ...plan, ceremony: { ...plan.ceremony, ...updated } } : plan)
    setActivePlan((prev) => apply(prev))
    setPlans((prev) => prev.map(apply))
  }

  // The shopping list owns its edits and reports back so the summary stays in step.
  const syncPlanItems = ({ costItems, checklistItems }) => {
    const apply = (plan) => (plan.id === activePlan?.id
      ? { ...plan, checklistItems, ceremony: plan.ceremony ? { ...plan.ceremony, costItems, checklistItems } : plan.ceremony }
      : plan)
    setActivePlan((prev) => (prev ? apply(prev) : prev))
    setPlans((prev) => prev.map(apply))
  }

  const createPlan = async () => {
    setSaving(true)
    try {
      const response = await request('/api/ceremonies/auto', accessToken, {
        method: 'POST',
        body: JSON.stringify({ type: form.type, ...formToPayload(form), createPlan: true }),
      })
      const ceremony = response.ceremony || response
      const plan = response.preparationPlan
      if (!plan) throw new Error('Ceremony was created without a planning workspace')
      const newPlan = { ...plan, ceremonyId: ceremony.id, ceremony, checklistItems: ceremony.checklistItems || [] }
      setPlans((prev) => [newPlan, ...prev])
      setActivePlan(newPlan)
      setCreating(false)
      setStepId('list')
      showToast(`Plan created with ${newPlan.checklistItems.length} items`, 'success')
    } catch (err) {
      showToast(err.message || 'Could not create plan', 'error')
    } finally {
      setSaving(false)
    }
  }

  const saveChanges = async () => {
    if (JSON.stringify(formFromPlan(activePlan)) === JSON.stringify(form)) return true
    setSaving(true)
    try {
      const updated = await request(`/api/ceremonies/${activePlan.ceremonyId}`, accessToken, {
        method: 'PUT',
        body: JSON.stringify(formToPayload(form)),
      })
      updateCeremonyInState(updated)
      showToast('Saved', 'success')
      return true
    } catch (err) {
      showToast(err.message || 'Could not save', 'error')
      return false
    } finally {
      setSaving(false)
    }
  }

  const stepIndex = STEPS.findIndex((s) => s.id === stepId)
  const isFormStep = FORM_STEP_IDS.includes(stepId)

  const goNext = async () => {
    if (!stepIsValid(stepId, form)) { showToast(INVALID_MESSAGE[stepId], 'error'); return }
    if (isFormStep && !activePlan) {
      if (stepId === 'money') { await createPlan(); return }
    } else if (isFormStep) {
      if (!(await saveChanges())) return
    }
    if (returnToSummary || stepId === 'list') {
      setReturnToSummary(false)
      setStepId('summary')
      return
    }
    setStepId(STEPS[stepIndex + 1].id)
  }

  const goBack = () => {
    if (returnToSummary) {
      setForm(formFromPlan(activePlan))
      setReturnToSummary(false)
      setStepId('summary')
    } else if (stepIndex <= 0 || stepId === 'summary') {
      leaveWizard()
    } else {
      setStepId(STEPS[stepIndex - 1].id)
    }
  }

  const editStep = (id) => {
    setForm(formFromPlan(activePlan))
    setReturnToSummary(true)
    setStepId(id)
  }

  const handleDeleted = (ceremonyId) => {
    setPlans((prev) => prev.filter((plan) => plan.ceremonyId !== ceremonyId))
    leaveWizard()
  }

  // ----- Family pledges screen -----
  if (activePlan && showPledges) {
    return <Pledges plan={activePlan} accessToken={accessToken} pledges={pledges} setPledges={setPledges} onBack={() => setShowPledges(false)} />
  }

  // ----- Guided steps and summary -----
  if (activePlan || creating) {
    const step = STEPS[stepIndex]
    const FormStep = STEP_COMPONENTS[stepId]
    const progress = Math.round(((stepIndex + 1) / STEPS.length) * 100)
    const nextLabel = (() => {
      if (returnToSummary) return BUTTONS.save
      if (stepId === 'money' && !activePlan) return BUTTONS.create
      if (stepId === 'list') return BUTTONS.summary
      return BUTTONS.next
    })()

    return (
      <div className="min-h-screen pb-24 bg-cream">
        <div className="bg-gradient-to-br from-sage-500 to-sage-600 text-white px-5 pt-12 pb-6 rounded-b-[2.5rem] relative overflow-hidden">
          <div className="absolute -top-1/4 -right-1/4 w-64 h-64 bg-white/5 rounded-full" />
          <div className="relative">
            <button type="button" onClick={goBack} className={cn('text-sm text-white/80 mb-3 block text-left', pressable)}>
              <Bi {...(stepId === 'summary' ? { xh: 'Buyela kwimisebenzi yam', en: 'Back to my ceremonies' } : BUTTONS.back)} />
            </button>
            <h1 className="font-display font-bold text-2xl break-words">{activePlan ? planTitle(activePlan) : 'New ceremony'}</h1>
            <div className="mt-4 flex items-center justify-between text-xs text-white/80">
              <span><Bi xh={`Inyathelo ${stepIndex + 1} / ${STEPS.length}`} en={`Step ${stepIndex + 1} of ${STEPS.length}`} /></span>
            </div>
            <div className="mt-2 w-full h-3 bg-white/20 rounded-full overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {stepId !== 'summary' && (
          <h2 className="px-5 mt-6 text-2xl text-ink"><Bi xh={step.xh} en={step.en} enClassName="text-base" /></h2>
        )}

        {stepId === 'list' && (
          <ShoppingList
            key={activePlan.id}
            ceremonyId={activePlan.ceremonyId}
            accessToken={accessToken}
            budgetZAR={activePlan.ceremony?.budgetZAR != null ? parseFloat(activePlan.ceremony.budgetZAR) : null}
            legacyItems={activePlan.checklistItems || []}
            onEditBudget={() => editStep('money')}
            onItemsChanged={syncPlanItems}
          />
        )}

        {stepId === 'summary' && (
          <Summary
            plan={activePlan}
            pledges={pledges}
            accessToken={accessToken}
            onEditStep={editStep}
            onOpenPledges={() => setShowPledges(true)}
            onViewTimeline={onViewTimeline}
            onBookEkoyini={onBookEkoyini}
            onDeleted={handleDeleted}
          />
        )}

        {isFormStep && (
          <div className="px-4 mt-5">
            <FormStep form={form} setForm={setForm} ceremonyTypes={ceremonyTypes} locked={Boolean(activePlan)} />
          </div>
        )}

        {stepId !== 'summary' && (
          <div className="grid grid-cols-2 gap-3 px-4 mt-8">
            <button type="button" onClick={goBack} className={cn('h-16 rounded-pill bg-white border-2 border-sage-200 text-ink', pressable)}>
              <Bi {...BUTTONS.back} />
            </button>
            <button type="button" disabled={saving} onClick={goNext} className={cn('h-16 rounded-pill bg-sage-600 text-white', pressable)}>
              <Bi {...nextLabel} />
            </button>
          </div>
        )}
      </div>
    )
  }

  // ----- My ceremonies -----
  return (
    <div className="min-h-screen pb-24 bg-cream">
      <div className="bg-gradient-to-br from-sage-500 to-sage-600 text-white px-5 pt-12 pb-8 rounded-b-[2.5rem] relative overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-64 h-64 bg-white/5 rounded-full" />
        <div className="relative">
          <button type="button" onClick={onBack} className={cn('text-sm text-white/80 mb-3 block text-left', pressable)}>
            <Bi {...BUTTONS.back} />
          </button>
          <h1 className="font-display font-bold text-3xl">Ceremony Prep</h1>
          <p className="text-white/80 text-sm mt-1">Plan every detail, one step at a time</p>
        </div>
      </div>

      <div className="px-4 mt-5">
        <button type="button" onClick={startNew} className={cn('w-full h-16 rounded-pill bg-sage-600 text-white', pressable)}>
          <Bi {...BUTTONS.startNew} />
        </button>
      </div>

      <div className="px-4 mt-5">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : plans.length === 0 ? (
          <EmptyState emoji="📋" title="No plans yet" description="Tap the green button above to plan your first ceremony." />
        ) : (
          <div className="space-y-2">
            {plans.map((plan) => {
              const { done, total } = planProgress(plan)
              const date = formatDate(plan.ceremony?.eventDate)
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => openPlan(plan)}
                  className={cn('w-full text-left bg-white border-2 border-terracotta/25 rounded-soft p-4 shadow-soft flex items-center gap-3', pressable)}
                >
                  <CeremonyIcon type={plan.ceremonyType} size={48} />
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-base text-ink break-words">{planTitle(plan)}</span>
                    <span className="block text-xs text-ink-muted">{typeName(plan.ceremonyType)}{date ? ` · ${date}` : ''}</span>
                    <span className="block text-xs text-ink-muted">{done} / {total} done</span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
