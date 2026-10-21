import { TypeStep, WhenStep, GuestsStep, MoneyStep } from './FormSteps.jsx'

export const FORM_STEP_IDS = ['what', 'when', 'who', 'money']

export const STEP_COMPONENTS = { what: TypeStep, when: WhenStep, who: GuestsStep, money: MoneyStep }

export const EMPTY_FORM = { type: '', title: '', eventDate: '', guestCount: '', budget: '' }

export const planTitle = (plan) => plan.ceremony?.title || plan.title

export function formFromPlan(plan) {
  const ceremony = plan.ceremony || {}
  return {
    type: plan.ceremonyType || ceremony.type || '',
    title: planTitle(plan) || '',
    eventDate: ceremony.eventDate ? new Date(ceremony.eventDate).toISOString().slice(0, 10) : '',
    guestCount: ceremony.guestCount != null ? String(ceremony.guestCount) : '',
    budget: ceremony.budgetZAR != null && ceremony.budgetZAR !== '' ? String(parseFloat(ceremony.budgetZAR)) : '',
  }
}

// The same body is used to create a ceremony and to update one.
export function formToPayload(form) {
  return {
    title: form.title.trim(),
    eventDate: form.eventDate || undefined,
    budgetZAR: form.budget === '' ? null : parseFloat(form.budget),
    guestCount: form.guestCount === '' ? null : parseInt(form.guestCount, 10),
  }
}

export function stepIsValid(stepId, form) {
  if (stepId === 'what') return Boolean(form.type)
  if (stepId === 'when') return Boolean(form.title.trim() && form.eventDate)
  if (stepId === 'who') return form.guestCount === '' || parseInt(form.guestCount, 10) > 0
  if (stepId === 'money') return form.budget === '' || parseFloat(form.budget) >= 0
  return true
}
