import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from './ui/Toast.jsx'
import Icon from './Icon.jsx'

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none'

const GOAL_LABEL = {
  FUNERAL: 'Funeral cover',
  GROCERIES: 'Groceries',
  CEREMONY: 'A ceremony (umgidi, umembeso...)',
  SAVINGS: 'Saving money',
  BULK_BUYING: 'Buying in bulk',
  SCHOOL: 'School costs',
}

// Plain-language reason for each step, so people know why we ask.
const STEPS = [
  { id: 'address', title: 'Where do you live?', why: 'So we can show you stokvels and bulk pools in your area first.' },
  { id: 'clan', title: 'Your iziduko', why: 'So we can connect you with your family and clan.' },
  { id: 'goals', title: 'What are you saving for?', why: 'So we can suggest stokvels that save for the same thing.' },
]

// "Complete your profile" card with a progress bar. Each missing detail is
// filled in right here, one step at a time, so nobody has to find the
// Profile screen. It hides itself once everything is filled in.
export default function ProfileCompletionCard() {
  const { user, accessToken, updateUser } = useAuth()
  const { showToast } = useToast()
  const [goals, setGoals] = useState(null)
  const [openStep, setOpenStep] = useState(null)
  const [saving, setSaving] = useState(false)
  const [address, setAddress] = useState('')
  const [clan, setClan] = useState({ paternalIziduko: '', maternalIziduko: '' })
  const [picked, setPicked] = useState([])

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    const load = async () => {
      const res = await fetch('/api/user/goals', { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => null)
      const body = res?.ok ? await res.json() : { goals: [] }
      if (!cancelled) setGoals(body.goals || [])
    }
    load()
    return () => { cancelled = true }
  }, [accessToken])

  if (!user || goals === null) return null

  const done = {
    address: Boolean(user.address?.trim()),
    clan: Boolean(user.paternalIziduko?.trim() && user.maternalIziduko?.trim()),
    goals: goals.length > 0,
  }
  const doneCount = STEPS.filter((s) => done[s.id]).length
  if (doneCount === STEPS.length) return null
  const percent = Math.round((doneCount / STEPS.length) * 100)

  const send = async (url, method, body) => {
    setSaving(true)
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not save, please try again')
      setOpenStep(null)
      showToast('Saved', 'success')
      return data
    } catch (err) {
      showToast(err.message, 'error')
      return null
    } finally {
      setSaving(false)
    }
  }

  const saveAddress = async (e) => {
    e.preventDefault()
    if (!address.trim()) return
    const data = await send('/api/user/profile', 'PATCH', { address: address.trim() })
    if (data) updateUser({ address: data.address })
  }

  const saveClan = async (e) => {
    e.preventDefault()
    if (!clan.paternalIziduko.trim() || !clan.maternalIziduko.trim()) return
    const data = await send('/api/user/iziduko', 'PATCH', {
      paternalIziduko: clan.paternalIziduko.trim(),
      maternalIziduko: clan.maternalIziduko.trim(),
      paternalGrandmotherIziduko: user.paternalGrandmotherIziduko || undefined,
      maternalGrandmotherIziduko: user.maternalGrandmotherIziduko || undefined,
    })
    if (data) updateUser(data)
  }

  const saveGoals = async () => {
    if (picked.length === 0) return
    const data = await send('/api/user/goals', 'PUT', { goals: picked })
    if (data) setGoals(data.goals)
  }

  const togglePick = (g) => setPicked((p) => (p.includes(g) ? p.filter((x) => x !== g) : [...p, g]))
  const inputClass = 'w-full border-2 border-ink/20 rounded-soft px-4 py-3 text-base focus:outline-none focus:border-sage-500'

  return (
    <div className="px-4 pt-3 bg-cream">
      <div className="bg-white border-2 border-ochre/40 rounded-soft p-4 shadow-soft">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display font-bold text-lg text-ink">Complete your profile</p>
          <span className="text-sm font-black text-sage-700">{percent}%</span>
        </div>
        <p className="text-sm text-ink-muted mt-0.5">The more you fill in, the better we can match you.</p>
        <div className="h-3 bg-cream-dark rounded-pill mt-3 overflow-hidden" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-sage-500 rounded-pill transition-all duration-500" style={{ width: `${percent}%` }} />
        </div>

        <div className="mt-4 space-y-2">
          {STEPS.map((step, i) => (
            <div key={step.id} className={`rounded-soft border-2 ${done[step.id] ? 'border-sage-500/30 bg-sage-50' : 'border-cream-dark'}`}>
              <button
                type="button"
                disabled={done[step.id]}
                onClick={() => setOpenStep(openStep === step.id ? null : step.id)}
                className={`w-full flex items-center gap-3 p-3 text-left ${pressable} disabled:opacity-100`}
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black flex-shrink-0 ${done[step.id] ? 'bg-sage-500 text-white' : 'bg-cream-dark text-ink'}`}>
                  {done[step.id] ? <Icon name="check" size={16} color="#fff" /> : i + 1}
                </span>
                <span className="flex-1">
                  <span className="block font-bold text-ink">{step.title}</span>
                  {!done[step.id] && <span className="block text-xs text-ink-muted">{step.why}</span>}
                </span>
                {!done[step.id] && <span className="text-sage-700 font-bold text-sm">{openStep === step.id ? 'Close' : 'Add'}</span>}
              </button>

              {openStep === 'address' && step.id === 'address' && (
                <form onSubmit={saveAddress} className="px-3 pb-3 space-y-2">
                  <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. NU 5, Mdantsane, East London" className={inputClass} autoFocus />
                  <p className="text-xs text-ink-muted">Your suburb and town are enough. Other members never see your address.</p>
                  <button type="submit" disabled={saving || !address.trim()} className={`w-full bg-sage-500 text-white font-bold py-3 rounded-pill text-base ${pressable}`}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </form>
              )}

              {openStep === 'clan' && step.id === 'clan' && (
                <form onSubmit={saveClan} className="px-3 pb-3 space-y-2">
                  <input value={clan.paternalIziduko} onChange={(e) => setClan({ ...clan, paternalIziduko: e.target.value })} placeholder="Father's isiduko, e.g. Cirha" className={inputClass} autoFocus />
                  <input value={clan.maternalIziduko} onChange={(e) => setClan({ ...clan, maternalIziduko: e.target.value })} placeholder="Mother's isiduko, e.g. Tshawe" className={inputClass} />
                  <button type="submit" disabled={saving || !clan.paternalIziduko.trim() || !clan.maternalIziduko.trim()} className={`w-full bg-sage-500 text-white font-bold py-3 rounded-pill text-base ${pressable}`}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </form>
              )}

              {openStep === 'goals' && step.id === 'goals' && (
                <div className="px-3 pb-3">
                  <p className="text-xs text-ink-muted mb-2">Tap all that apply.</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(GOAL_LABEL).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => togglePick(id)}
                        aria-pressed={picked.includes(id)}
                        className={`px-4 py-2.5 rounded-pill border-2 text-sm font-bold ${pressable} ${picked.includes(id) ? 'bg-sage-500 border-sage-500 text-white' : 'bg-white border-cream-dark text-ink'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={saveGoals} disabled={saving || picked.length === 0} className={`mt-3 w-full bg-sage-500 text-white font-bold py-3 rounded-pill text-base ${pressable}`}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
