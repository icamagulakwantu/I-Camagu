import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from './ui/Toast.jsx'

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none'
const input = 'w-full border border-ink/30 rounded-soft px-3 py-3 text-base focus:outline-none focus:border-sage-500'

// Creator only: choose whether the stokvel is shown to people nearby. Private
// by default. Only the name, purpose, area and member count are ever shown.
export default function ListingPanel({ stokvelId }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const res = await fetch(`/api/stokvels/${stokvelId}/listing`, { headers }).catch(() => null)
      const body = res?.ok ? await res.json() : { isPublic: false, purpose: '', area: '' }
      if (!cancelled) setForm({ isPublic: !!body.isPublic, purpose: body.purpose || '', area: body.area || '' })
    }
    load()
    return () => { cancelled = true }
  }, [stokvelId, accessToken])

  const save = async (next) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/stokvels/${stokvelId}/listing`, { method: 'PUT', headers, body: JSON.stringify(next) })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Could not save')
      setForm(next)
      showToast(body.message, 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!form) return null

  return (
    <div className="mb-4 pb-4 border-b border-terracotta/15">
      <p className="text-[10px] font-black uppercase tracking-wider text-ink-muted mb-1">Show my stokvel to people nearby</p>
      <p className="text-xs text-ink-muted mb-2">
        {form.isPublic ? 'On. People in your area can see this stokvel and ask to join. You decide who you invite.' : 'Off. Only people you invite can see this stokvel.'}
      </p>
      <input className={`${input} mb-2`} placeholder="What is this stokvel for? (e.g. Funeral savings for our street)"
        value={form.purpose} maxLength={300} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
      <input className={`${input} mb-2`} placeholder="Area (e.g. Mdantsane, East London)"
        value={form.area} maxLength={80} onChange={(e) => setForm({ ...form, area: e.target.value })} />
      <div className="flex gap-2">
        <button type="button" disabled={saving} onClick={() => save({ ...form, isPublic: true })}
          className={`flex-1 bg-sage-500 text-white font-bold py-3 rounded-pill text-base ${pressable}`}>
          {form.isPublic ? 'Save' : 'Show it'}
        </button>
        {form.isPublic && (
          <button type="button" disabled={saving} onClick={() => save({ ...form, isPublic: false })}
            className={`flex-1 border-2 border-terracotta/40 text-ink font-bold py-3 rounded-pill text-base ${pressable}`}>
            Make private
          </button>
        )}
      </div>
    </div>
  )
}
