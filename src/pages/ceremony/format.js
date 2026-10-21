export const rand = (n) => `R${Number(n || 0).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`

export const randExact = (n) => `R${Number(n || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Dates are stored at UTC midnight, so they are shown in UTC. Local time would
// show the day before for anyone west of UTC.
export const formatDate = (iso) => (iso
  ? new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  : null)
