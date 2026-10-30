import { shareToWhatsApp } from '../../lib/whatsapp.js'
import { request } from './api.js'
import { planTitle } from './ceremonyForm.js'

// Plans shared during this visit. The plan list is only refetched on a fresh
// load, so this keeps the "Share with family" step ticked straight away.
const sharedThisVisit = new Set()

export const wasShared = (plan) => Boolean(plan?.shareToken) || sharedThisVisit.has(plan?.id)

// One message for every share button, so family always get the same clear
// invitation: see what is needed, then pledge what they will bring (ukugida).
export async function sharePlan({ plan, accessToken, viaWhatsApp }) {
  const { shareUrl } = await request(`/api/ceremonies/plans/${plan.id}/share-link`, accessToken, { method: 'POST' })
  const title = planTitle(plan)
  const message = `${title}\nI'm preparing this ceremony on iCamagu. See what is still needed and pledge what you'll bring (ukugida):\n${shareUrl}`
  sharedThisVisit.add(plan.id)
  if (!viaWhatsApp && navigator.share) {
    await navigator.share({ title, text: message }).catch(() => {})
  } else {
    shareToWhatsApp(message)
  }
  return shareUrl
}
