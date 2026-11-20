// Shared helpers for invite links, so every shareable thing in the app builds
// and remembers its link the same way.
//
// How an invite works: the link opens the app, the id is stored on the device
// while the person signs in or registers, and once they are inside the app the
// pending invite is acted on (see PendingStokvelJoin and PendingClanJoin).

export const PENDING_STOKVEL_KEY = 'icamagu_join_stokvel_id'
export const PENDING_CLAN_KEY = 'icamagu_join_clan_code'
export const PENDING_TEMPLATE_KEY = 'icamagu_template_invite'
export const PENDING_PLAN_KEY = 'icamagu_plan_invite'

export function stokvelInviteUrl(stokvelId) {
  return `${window.location.origin}/join/stokvel/${encodeURIComponent(stokvelId)}`
}

export function stokvelInviteMessage(stokvelName, stokvelId) {
  return `Join our stokvel "${stokvelName}" on i-Camagu. Open this link, register if you are new, and you will be added automatically:\n${stokvelInviteUrl(stokvelId)}`
}

export function clanInviteUrl(inviteCode) {
  return `${window.location.origin}/join/clan/${encodeURIComponent(inviteCode)}`
}

// The message an organiser pastes into the family's existing WhatsApp group.
// Plain and warm, because many people reading it are new to apps.
export function clanInviteMessage(clanName, groupName, inviteCode) {
  return [
    `Molweni ${clanName}!`,
    `Our family group "${groupName}" is now also on i-Camagu, so our news, ceremonies and contributions are kept safe in one place.`,
    'Tap the link below. If you are new, register first and you will be added to the group automatically:',
    clanInviteUrl(inviteCode),
  ].join('\n\n')
}

export function whatsappShareUrl(message) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}

export function templateInviteUrl(token) {
  return `${window.location.origin}/t/${encodeURIComponent(token)}`
}

// Sent with a template link: says what the person can and cannot see.
export function templateInviteMessage(title, token) {
  return [
    `Molo! I am planning with the i-Camagu template "${title}" and would value your help.`,
    'Open the link, register if you are new, and ask to edit. Your changes come to me to approve before they are added. You only see this template, nothing else of mine.',
    templateInviteUrl(token),
  ].join('\n\n')
}

export function planInviteUrl(token) {
  return `${window.location.origin}/p/${encodeURIComponent(token)}`
}

// Sent with a live ceremony plan link.
export function planInviteMessage(title, token) {
  return [
    `Molo! Help me plan "${title}" on i-Camagu.`,
    'Open the link, register if you are new, and ask to edit. Your suggestions come to me to approve before they change the plan. You only see the steps and shopping list, never the money or gifts.',
    planInviteUrl(token),
  ].join('\n\n')
}
