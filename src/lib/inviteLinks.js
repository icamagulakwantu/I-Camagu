// Shared helpers for invite links, so every shareable thing in the app builds
// and remembers its link the same way.
//
// How an invite works: the link opens the app, the id is stored on the device
// while the person signs in or registers, and once they are inside the app the
// pending invite is acted on (see PendingStokvelJoin and PendingClanJoin).

export const PENDING_STOKVEL_KEY = 'icamagu_join_stokvel_id'
export const PENDING_CLAN_KEY = 'icamagu_join_clan_code'

export function stokvelInviteUrl(stokvelId) {
  return `${window.location.origin}/join/stokvel/${encodeURIComponent(stokvelId)}`
}

export function stokvelInviteMessage(stokvelName, stokvelId) {
  return `Join our stokvel "${stokvelName}" on iCamagu. Open this link, register if you are new, and you will be added automatically:\n${stokvelInviteUrl(stokvelId)}`
}

export function clanInviteUrl(inviteCode) {
  return `${window.location.origin}/join/clan/${encodeURIComponent(inviteCode)}`
}

// The message an organiser pastes into the family's existing WhatsApp group.
// Plain and warm, because many people reading it are new to apps.
export function clanInviteMessage(clanName, groupName, inviteCode) {
  return [
    `Molweni ${clanName}!`,
    `Our family group "${groupName}" is now also on iCamagu, so our news, ceremonies and contributions are kept safe in one place.`,
    'Tap the link below. If you are new, register first and you will be added to the group automatically:',
    clanInviteUrl(inviteCode),
  ].join('\n\n')
}

export function whatsappShareUrl(message) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}
