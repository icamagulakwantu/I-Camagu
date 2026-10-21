import { useState, useEffect } from 'react'
import Icon from '../components/Icon.jsx'

const money = (n) => `R${Number(n).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`

// Public, view-only copy of a ceremony checklist and its family pledges. Anyone
// with the link can read it; the call to action at the top sends people into
// the app, where new people register and can plan their own ceremony.
function PublicPlanView({ token }) {
  const [plan, setPlan] = useState(null)
  const [pledges, setPledges] = useState([])
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

    // Pledges are a nice extra: if they fail to load the checklist still shows.
    fetch(`/api/public/plan/${token}/pledges`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setPledges(Array.isArray(data) ? data : []))
      .catch(() => setPledges([]))
  }, [token])

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
          <p className="text-sm font-bold text-ink">Planning a ceremony of your own?</p>
          <p className="text-xs text-ink-muted mt-1">This is a <strong>view-only</strong> copy. Register free on iCamagu to build your own checklist, budget and family contributions.</p>
          <a href="/" className="inline-block mt-3 bg-sage-500 text-white text-sm font-bold px-5 py-2.5 rounded-pill">Register or sign in</a>
        </div>

        {pledges.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-black uppercase text-ink-muted mb-2">Family pledges</p>
            <div className="space-y-1.5">
              {pledges.map((p) => {
                const pledged = p.pledgedAmountZAR != null ? parseFloat(p.pledgedAmountZAR) : null
                const paid = p.paidAmountZAR != null ? parseFloat(p.paidAmountZAR) : 0
                const received = pledged != null && pledged > 0 && paid >= pledged
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3 bg-white border border-terracotta/15 rounded-soft p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink truncate">
                        {p.pledgerName}{p.relationship ? ` · ${p.relationship}` : ''}
                      </p>
                      <p className="text-xs text-ink-muted truncate">
                        {p.pledgedItem}{pledged != null ? ` · ${money(pledged)}` : ''}
                      </p>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-pill bg-sage-50 text-sage-700 flex-shrink-0">
                      {received ? 'Received' : 'Pledged'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

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
