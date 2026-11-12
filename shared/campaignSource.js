// Campaign attribution for sign-ups: the ?src= code on a pamphlet or QR link.
// The Landing page stores the first valid code a visitor arrives with, the
// sign-up screens send it once, and the server records it on a new account.
// Shared so the browser and server apply the same rule.

export const CAMPAIGN_SOURCE_STORAGE_KEY = 'icamagu_campaign_src'

const CAMPAIGN_SOURCE_PATTERN = /^[A-Za-z0-9_-]{1,40}$/

// Returns the code unchanged when it is 1–40 ASCII letters, digits, "_" or "-",
// otherwise null. Never throws, whatever it is given.
export function cleanCampaignSource(value) {
  if (typeof value !== 'string') return null
  return CAMPAIGN_SOURCE_PATTERN.test(value) ? value : null
}
