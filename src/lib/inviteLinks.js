// Shared helpers for invite links, so every shareable thing in the app builds
// and remembers its link the same way.
//
// How an invite works: the link opens the app, the id is stored on the device
// while the person signs in or registers, and once they are inside the app the
// pending invite is acted on (see PendingStokvelJoin and PendingPledge).

export const PENDING_STOKVEL_KEY = 'icamagu_join_stokvel_id'
export const PENDING_PLEDGE_KEY = 'icamagu_pledge_share_token'

export function stokvelInviteUrl(stokvelId) {
  return `${window.location.origin}/join/stokvel/${encodeURIComponent(stokvelId)}`
}

export function stokvelInviteMessage(stokvelName, stokvelId) {
  return `Join our stokvel "${stokvelName}" on iCamagu. Open this link, register if you are new, and you will be added automatically:\n${stokvelInviteUrl(stokvelId)}`
}
