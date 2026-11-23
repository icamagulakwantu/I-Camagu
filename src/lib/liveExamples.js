import { useEffect, useState } from 'react'

// The live examples (a real grocery stokvel, an umgidi drinks pool and an
// ulwaluko-to-umgidi plan) that every member can open and click through.
// Loaded once; the server shows them as their own treasurer or host and
// refuses any change (server/services/exampleAccess.js).
let cache = null
let loading = null

export function loadLiveExamples(accessToken) {
  if (cache) return Promise.resolve(cache)
  if (!loading) {
    loading = fetch('/api/examples/live', { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} })
      .then((res) => (res.ok ? res.json() : { stokvels: [], ceremonies: [] }))
      .then((data) => { cache = { stokvels: data.stokvels || [], ceremonies: data.ceremonies || [] }; return cache })
      .catch(() => ({ stokvels: [], ceremonies: [] }))
      .finally(() => { loading = null })
  }
  return loading
}

export function useLiveExamples(accessToken) {
  const [examples, setExamples] = useState(cache || { stokvels: [], ceremonies: [] })
  useEffect(() => {
    let live = true
    loadLiveExamples(accessToken).then((data) => { if (live) setExamples(data) })
    return () => { live = false }
  }, [accessToken])
  return examples
}

export function liveExampleFor(examples, id) {
  if (!id) return null
  return examples.stokvels.find((s) => s.id === id) || examples.ceremonies.find((c) => c.id === id || c.planId === id) || null
}
