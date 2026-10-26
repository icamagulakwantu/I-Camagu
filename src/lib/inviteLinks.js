// Shared helpers for invite links, so every shareable thing in the app builds
// and remembers its link the same way.
//
// Invite ids/tokens are stored on this device while the person signs in or
// registers, then acted on after authentication by the pending invite components.

export const PENDING_STOKVEL_KEY = 'icamagu_join_stokvel_id'
export const PENDING_CLAN_KEY = 'icamagu_join_clan_code'
export const PENDING_PLEDGE_KEY = 'icamagu_pledge_share_token'

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
