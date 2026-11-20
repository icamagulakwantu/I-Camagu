import { templateInviteMessage, templateInviteUrl, planInviteMessage, planInviteUrl } from '../../lib/inviteLinks.js'

// Where each kind of shared checklist lives on the server, and how its
// invite link and message read. Templates and live ceremony plans use the
// same screens and the same approval steps.
export const TEMPLATE_API = {
  noun: 'template',
  base: (id) => `/api/ceremonies/templates/${id}`,
  invite: (token) => `/api/ceremonies/templates/invite/${encodeURIComponent(token)}`,
  linkUrl: templateInviteUrl,
  message: templateInviteMessage,
}

export const PLAN_API = {
  noun: 'plan',
  base: (id) => `/api/ceremonies/${id}/collab`,
  invite: (token) => `/api/ceremonies/collab/invite/${encodeURIComponent(token)}`,
  linkUrl: planInviteUrl,
  message: planInviteMessage,
}
