import { useState, useEffect } from 'react'
import Icon from '../components/Icon.jsx'

const inputClass = 'w-full h-12 rounded-2xl border-2 border-cream-dark bg-white px-4 text-base text-ink focus:outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20'
const EMPTY = { pledgerName: '', relationship: '', pledgedItem: '', pledgedAmountZAR: '' }

// Public copy of a ceremony shared by the host. Family see what is still
// needed and can pledge what they will bring (ukugida) with no account. The
// pledge list is anonymous here: only the host sees names and amounts.
function PublicPlanView({ token }) {
  const [plan, setPlan] = useState(null)
  const [pledges, setPledges] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY)
  const [sending, setSending] = useState(false)
  const [formError, setFormError] = useState('')
  const [thanks, setThanks] = useState('')

  useEffect(() => {
    fetch(`/api/public/plan/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error)
        else setPlan(data)
      })
      .catch(() => setError('Could not load this ceremony'))
      .finally(() => setLoading(false))

    // Pledges are a nice extra: if they fail to load the checklist still shows.
    fetch(`/api/public/plan/${token}/pledges`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setPledges(Array.isArray(data) ? data : []))
      .catch(() => setPledges([]))
  }, [token])

  const pickItem = (label) => {
    setForm((f) => ({ ...f, pledgedItem: label }))
    document.getElementById('pledge-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const submit = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!form.pledgerName.trim()) return setFormError('Please add your name')
    if (!form.pledgedItem.trim()) return setFormError('Please say what you will bring')
    setSending(true)
    try {
      const res = await fetch(`/api/public/plan/${token}/pledges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not save your pledge')
      setPledges((prev) => [...prev, data])
      setThanks(form.pledgedItem.trim())
      setForm(EMPTY)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-ink-muted">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-terracotta/10 flex items-center justify-center mb-3">
          <Icon name="link" size={24} color="#c45c26" />
        </div>
        <p className="font-bold text-ink mb-1">{error}</p>
        <p className="text-sm text-ink-muted">Ask the family to send you a new link.</p>
        <a href="/" className="mt-4 text-sage-600 underline text-sm">Go to iCamagu</a>
      </div>
    )
  }

  const items = plan.checklistItems || []
  const phases = [...new Set(items.map((i) => i.phase))]
  const doneCount = items.filter((i) => i.isChecked).length
  const percent = items.length ? Math.round((doneCount / items.length) * 100) : 0
  const pledgedLabels = new Set(pledges.map((p) => String(p.pledgedItem || '').trim().toLowerCase()))
  const stillNeeded = items.filter((i) => !i.isChecked && !pledgedLabels.has(i.label.trim().toLowerCase())).slice(0, 8)

  return (
    <div className="min-h-screen bg-cream pb-12">
      {/* Invitation */}
      <div className="wash-ember grain text-cream px-5 pt-10 pb-8 rounded-b-[2.5rem] relative overflow-hidden">
        <p className="eyebrow text-ochre-light">Uyamenywa · You're invited to help</p>
        <h1 className="font-display font-semibold text-[1.9rem] leading-tight mt-2 text-balance">{plan.title}</h1>
        <p className="text-sm text-cream/85 mt-2 leading-relaxed">
          The family is preparing this ceremony on iCamagu. See what is still needed and pledge what you'll bring.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-cream/10 p-3 ring-1 ring-cream/20">
            <p className="text-[10px] font-bold uppercase tracking-widest text-cream/70">Prepared</p>
            <p className="font-display text-2xl font-semibold">{percent}%</p>
          </div>
          <div className="rounded-2xl bg-cream/10 p-3 ring-1 ring-cream/20">
            <p className="text-[10px] font-bold uppercase tracking-widest text-cream/70">Pledges</p>
            <p className="font-display text-2xl font-semibold">{pledges.length}</p>
          </div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-cream/15">
          <div className="h-full rounded-full bg-ochre-light transition-all duration-700" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="px-4 max-w-md mx-auto">
        {/* Still needed: one tap fills the pledge form */}
        {stillNeeded.length > 0 && (
          <section className="mt-6">
            <p className="eyebrow text-terracotta">Okusafuneka · Still needed</p>
            <h2 className="font-display text-xl font-semibold text-ink">Tap what you can bring</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {stillNeeded.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => pickItem(item.label)}
                  className={`rounded-pill px-3.5 py-2 text-sm font-bold transition-transform active:scale-95 ${form.pledgedItem === item.label ? 'bg-sage-600 text-white' : 'bg-white text-ink shadow-soft ring-1 ring-ink/[0.06]'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Pledge form */}
        <section id="pledge-form" className="mt-6 card-paper p-5">
          {thanks ? (
            <div className="text-center py-2">
              <div className="mx-auto w-14 h-14 rounded-full bg-sage-100 flex items-center justify-center">
                <Icon name="heartHandshake" size={26} color="#4a7a4a" />
              </div>
              <p className="font-display text-xl font-semibold text-ink mt-3">Enkosi! Your pledge is in.</p>
              <p className="text-sm text-ink-muted mt-1">The family can now see you'll bring {thanks}.</p>
              <button type="button" onClick={() => setThanks('')} className="mt-4 text-sm font-bold text-sage-700 underline">
                Pledge something else
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <div>
                <p className="eyebrow text-sage-700">Ukugida · Pledge</p>
                <h2 className="font-display text-xl font-semibold text-ink">What will you bring?</h2>
              </div>
              <input className={inputClass} placeholder="Your name (e.g. Uncle Sipho)" value={form.pledgerName} onChange={(e) => setForm((f) => ({ ...f, pledgerName: e.target.value }))} maxLength={60} />
              <input className={inputClass} placeholder="How you're related (optional)" value={form.relationship} onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))} maxLength={40} />
              <input className={inputClass} placeholder="Item (e.g. a goat, 2 cases of beer)" value={form.pledgedItem} onChange={(e) => setForm((f) => ({ ...f, pledgedItem: e.target.value }))} maxLength={120} />
              <input className={inputClass} type="number" inputMode="decimal" min="0" placeholder="Value in rand (optional)" value={form.pledgedAmountZAR} onChange={(e) => setForm((f) => ({ ...f, pledgedAmountZAR: e.target.value }))} />
              {formError && <p role="alert" className="text-sm font-bold text-terracotta">{formError}</p>}
              <button type="submit" disabled={sending} className="w-full h-14 rounded-pill bg-sage-600 text-white font-bold text-base active:scale-[0.98] transition-transform disabled:opacity-60">
                {sending ? 'Saving...' : 'Pledge it'}
              </button>
              <p className="text-[11px] text-ink-muted text-center">Only the host sees your name and amount. No account needed. iCamagu never holds money.</p>
            </form>
          )}
        </section>

        {/* Who has already pledged (anonymous) */}
        {pledges.length > 0 && (
          <section className="mt-6">
            <p className="text-xs font-black uppercase text-ink-muted mb-2">Already pledged</p>
            <div className="flex flex-wrap gap-2">
              {pledges.map((p) => (
                <span key={p.id} className="inline-flex items-center gap-1.5 rounded-pill bg-sage-50 px-3 py-1.5 text-xs font-bold text-sage-700">
                  <Icon name={p.isReceived ? 'check' : 'gift'} size={12} />
                  {p.pledgedItem}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Full checklist */}
        {phases.map((phase) => (
          <section key={phase} className="mt-6">
            <p className="text-xs font-black uppercase text-ink-muted mb-2">{phase.replace(/_/g, ' ')}</p>
            <div className="space-y-1.5">
              {items.filter((i) => i.phase === phase).map((item) => (
                <div key={item.id} className="flex items-center gap-3 bg-white border border-terracotta/15 rounded-2xl p-3">
                  <span className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 ${item.isChecked ? 'bg-sage-500 border-sage-500' : 'border-cream-dark'}`}>
                    {item.isChecked && <Icon name="check" size={12} color="#fff" strokeWidth={2.5} />}
                  </span>
                  <span className={`text-sm ${item.isChecked ? 'line-through text-ink-muted' : 'text-ink'}`}>{item.label}</span>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Growth: every shared ceremony is an invitation to plan your own */}
        <div className="mt-8 rounded-[22px] bg-ink p-5 text-center">
          <p className="font-display text-lg font-semibold text-cream">Planning a ceremony of your own?</p>
          <p className="text-xs text-cream/75 mt-1">Checklist, budget, bulk buying and family pledges in one place. Free to join.</p>
          <a href="/" className="inline-block mt-4 bg-terracotta text-white text-sm font-bold px-5 py-3 rounded-pill">Start on iCamagu</a>
        </div>
      </div>
    </div>
  )
}

export default PublicPlanView
