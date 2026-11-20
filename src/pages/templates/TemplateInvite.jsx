import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import Icon from '../../components/Icon.jsx'
import CeremonyIcon from '../../components/CeremonyIcon.jsx'
import { request } from '../ceremony/api.js'
import { groupByPhase } from './templateItems.js'

// What a template invite link shows a signed-in member: the template, and
// a way to ask the owner for permission to suggest edits.
export default function TemplateInvite({ token, onBack, onOpenEditor, onActed }) {
  const { accessToken } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    request(`/api/ceremonies/templates/invite/${encodeURIComponent(token)}`, accessToken)
      .then(setData)
      .catch((err) => setError(err.message))
  }, [token, accessToken])

  const ask = async () => {
    setSending(true)
    try {
      const r = await request(`/api/ceremonies/templates/invite/${encodeURIComponent(token)}/request`, accessToken, { method: 'POST', body: JSON.stringify({ message }) })
      setData((d) => ({ ...d, role: r.role }))
      onActed?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const t = data?.template
  return (
    <div className="min-h-screen bg-cream pb-28">
      <header className="bg-[#1f3320] px-5 pb-8 pt-6 text-cream">
        <button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5 text-sm font-bold">← Templates</button>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-cream/60">Isimemo · An invitation</p>
        <h1 className="mt-1 font-display text-[1.9rem] font-semibold leading-tight">{t ? t.title : 'A ceremony template'}</h1>
        {data && <p className="mt-1 text-sm text-cream/80">{data.ownerName} asked for your help with this plan.</p>}
      </header>

      <div className="space-y-4 px-4 pt-5">
        {error && <p role="alert" className="rounded-[16px] bg-white p-4 text-sm font-bold text-terracotta-dark shadow-soft">{error}</p>}
        {t && (
          <>
            <section className="rounded-[20px] bg-white p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <CeremonyIcon type={t.ceremonyType} size={44} />
                <p className="text-sm text-ink-muted">{t.taskCount} things to do · {t.shoppingCount} things to buy</p>
              </div>
              <div className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-1">
                {groupByPhase(t.items).map((g) => (
                  <div key={g.phase}>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#6f655a]">{g.title}</p>
                    <ul className="mt-1 space-y-0.5 text-[14px] text-ink">
                      {g.items.map((i) => <li key={i.key}>· {i.label}{i.kind === 'cost' && i.quantity ? ` (${i.quantity} ${i.unit})` : ''}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-ink-muted">
              <Icon name="lock" size={14} color="#6b6258" /> You see only this template. Never {data.ownerName}&rsquo;s ceremonies, money, pledges or ukugida.
            </p>

            {data.role === 'none' && (
              <section className="space-y-3 rounded-[20px] bg-white p-4 shadow-soft">
                <p className="text-[15px] font-bold text-ink">Ask to help edit</p>
                <p className="text-[13px] leading-snug text-ink-muted">Your changes go to {data.ownerName} as suggestions. Nothing changes until they approve.</p>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300} rows={2} placeholder={`A short note to ${data.ownerName} (optional)`} className="w-full rounded-[12px] border border-ink/15 px-3 py-2 text-sm" />
                <button type="button" onClick={ask} disabled={sending} className="min-h-12 w-full rounded-full bg-terracotta text-[15px] font-extrabold text-white disabled:opacity-60">{sending ? 'Sending…' : 'Ask to edit'}</button>
              </section>
            )}
            {data.role === 'requested' && <p className="rounded-[20px] bg-white p-4 text-[14px] text-ink shadow-soft">Your request is with <strong>{data.ownerName}</strong>. You will get a notification when they answer.</p>}
            {data.role === 'declined' && <p className="rounded-[20px] bg-white p-4 text-[14px] text-ink shadow-soft">{data.ownerName} declined this request.</p>}
            {data.role === 'owner' && <p className="rounded-[20px] bg-white p-4 text-[14px] text-ink shadow-soft">This is your own template.</p>}
            {(data.role === 'editor' || data.role === 'owner') && (
              <button type="button" onClick={() => onOpenEditor(t.id)} className="min-h-12 w-full rounded-full bg-[#1f3320] text-[15px] font-extrabold text-cream">
                {data.role === 'owner' ? 'Open the template' : 'Suggest changes'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
