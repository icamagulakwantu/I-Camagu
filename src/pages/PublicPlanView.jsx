import { useState, useEffect } from 'react'
import Icon from '../components/Icon.jsx'
import { PENDING_PLEDGE_KEY } from '../lib/inviteLinks.js'
import { PENDING_PLEDGE_KEY } from '../lib/inviteLinks.js'

// Public, view-only copy of a ceremony checklist. Anyone with the link can read
// it. The buttons at the top send people into the app: new people register,
// then are asked what they would like to pledge to this ceremony.
function PublicPlanView({ token }) {
  const [plan, setPlan] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/public/plan/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error)
        else setPlan(data)
        setLoading(false)
      })
      .catch(() => { setError('Could not load this checklist'); setLoading(false) })
  }, [token])

  // Remember the ceremony, then go to the app. Signed-in people get the pledge
  // form straight away; new people register first.
  const startPledge = () => {
    localStorage.setItem(PENDING_PLEDGE_KEY, token)
    window.location.assign('/')
  }

  if (loading) return <div className="min-h-screen bg-cream flex items-center justify-center"><p className="text-ink-muted">Loading...</p></div>

  if (error) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-terracotta/10 flex items-center justify-center mb-3">
          <Icon name="link" size={24} color="#c45c26" />
        </div>
        <p className="font-bold text-ink mb-1">{error}</p>
        <a href="/" className="mt-4 text-sage-600 underline text-sm">Go to iCamagu</a>
      </div>
    )
  }

  const phases = [...new Set(plan.checklistItems.map((i) => i.phase))]
  const doneCount = plan.checklistItems.filter((i) => i.isChecked).length

  return (
    <div className="min-h-screen bg-cream">
      <div className="bg-gradient-to-br from-sage-500 to-sage-600 text-white px-5 pt-10 pb-6 rounded-b-[2.5rem]">
        <p className="text-xs uppercase tracking-widest text-white/70">Shared from iCamagu</p>
        <h1 className="font-display font-bold text-2xl mt-1">{plan.title}</h1>
        <p className="text-white/70 text-sm mt-1">Hosted by {plan.host.firstName} {plan.host.lastName} — {doneCount}/{plan.checklistItems.length} done</p>
      </div>

      <div className="px-4 mt-4 pb-10">
        <div className="bg-sage-50 border border-sage-200 rounded-soft p-4 mb-4 text-center">
          <p className="text-sm font-bold text-ink">Want to help with this ceremony?</p>
          <p className="text-xs text-ink-muted mt-1">Pledge what you would like to give. New to iCamagu? You will register first, free, and your pledge is added for {plan.host.firstName}.</p>
          <button type="button" onClick={startPledge} className="mt-3 bg-sage-500 text-white text-sm font-bold px-5 py-2.5 rounded-pill w-full">Pledge a contribution</button>
          <a href="/" className="inline-block mt-3 text-xs text-sage-600 underline">Or plan your own ceremony: register or sign in</a>
          <p className="text-[11px] text-ink-muted mt-2">This page is view-only.</p>
        </div>

        {phases.map((phase) => (
          <div key={phase} className="mb-4">
            <p className="text-xs font-black uppercase text-ink-muted mb-2">{phase.replace(/_/g, ' ')}</p>
            <div className="space-y-1.5">
              {plan.checklistItems.filter((i) => i.phase === phase).map((item) => (
                <div key={item.id} className="flex items-center gap-3 bg-white border border-terracotta/15 rounded-soft p-3">
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 ${item.isChecked ? 'bg-sage-500 border-sage-500' : 'border-cream-dark'}`}>
                    {item.isChecked && <Icon name="check" size={12} color="#fff" strokeWidth={2.5} />}
                  </div>
                  <span className={`text-sm ${item.isChecked ? 'line-through text-ink-muted' : 'text-ink'}`}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PublicPlanView
