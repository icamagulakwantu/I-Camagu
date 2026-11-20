import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import Icon from '../../components/Icon.jsx'
import { request } from '../ceremony/api.js'
import { whatsappShareUrl } from '../../lib/inviteLinks.js'
import { TEMPLATE_API } from './collabApi.js'

// The owner's side of sharing: the invite link, people asking to help,
// approved editors, and suggested changes waiting for review.
export default function TemplateShareCard({ template, onReview, api = TEMPLATE_API }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [token, setToken] = useState(null)
  const [people, setPeople] = useState([])
  const [proposals, setProposals] = useState([])
  const base = api.base(template.id)

  const load = useCallback(() => {
    request(`${base}/people`, accessToken).then(setPeople).catch(() => {})
    request(`${base}/workspace`, accessToken).then((ws) => setProposals(ws.proposals || [])).catch(() => {})
  }, [base, accessToken])
  useEffect(() => { load() }, [load])

  const makeLink = async () => {
    try { setToken((await request(`${base}/invite`, accessToken, { method: 'POST' })).token) } catch (err) { showToast(err.message, 'error') }
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(api.linkUrl(token)); showToast('Link copied', 'success') } catch { showToast('Could not copy. Press and hold the link to copy it.', 'error') }
  }
  const switchOff = async () => {
    await request(`${base}/invite`, accessToken, { method: 'DELETE' }).catch(() => {})
    setToken(null)
    showToast('Link switched off. Editors you approved keep access.', 'info')
  }
  const decide = async (id, approve) => {
    try { await request(`${base}/people/${id}`, accessToken, { method: 'POST', body: JSON.stringify({ approve }) }); load() } catch (err) { showToast(err.message, 'error') }
  }
  const removeEditor = async (id) => {
    try { await request(`${base}/people/${id}`, accessToken, { method: 'DELETE' }); load() } catch (err) { showToast(err.message, 'error') }
  }

  const requests = people.filter((p) => p.status === 'REQUESTED')
  const editors = people.filter((p) => p.status === 'EDITOR')

  return (
    <section className="space-y-3 rounded-[20px] bg-white p-4 shadow-soft">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#6f655a]">Yabelana · Plan it together</p>
        <p className="mt-1 text-[13px] leading-snug text-ink-muted">Invite family or friends to suggest changes. They sign in, ask you first, and every change waits for your approval. They see only this {api.noun}'s steps and shopping list: never your money, pledges or ukugida.</p>
      </div>

      {proposals.map((p) => (
        <button key={p.id} type="button" onClick={() => onReview(p.id)} className="flex w-full items-center gap-3 rounded-[14px] bg-[#efe6d8] p-3 text-left">
          <Icon name="clipboard" size={18} color="#a3471a" />
          <span className="min-w-0 flex-1 text-[14px] font-bold text-ink">{p.authorName} suggested {p.changeCount} change{p.changeCount === 1 ? '' : 's'}</span>
          <span className="text-xs font-extrabold text-terracotta-dark">Review →</span>
        </button>
      ))}

      {requests.map((p) => (
        <div key={p.id} className="rounded-[14px] border border-ink/10 p-3">
          <p className="text-[14px] font-bold text-ink">{p.name} asks to help edit</p>
          {p.message && <p className="mt-0.5 text-[13px] italic text-ink-muted">&ldquo;{p.message}&rdquo;</p>}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => decide(p.id, true)} className="min-h-10 rounded-full bg-[#2e4a2e] text-sm font-bold text-cream">Approve</button>
            <button type="button" onClick={() => decide(p.id, false)} className="min-h-10 rounded-full border border-ink/15 text-sm font-bold text-ink">Decline</button>
          </div>
        </div>
      ))}

      {editors.length > 0 && (
        <div>
          <p className="text-xs font-bold text-ink-muted">Can suggest changes</p>
          <ul className="mt-1 divide-y divide-ink/5">
            {editors.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-[14px] text-ink">
                {p.name}
                <button type="button" onClick={() => removeEditor(p.id)} className="text-xs font-bold text-terracotta-dark">Remove</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!token ? (
        <button type="button" onClick={makeLink} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border-2 border-[#1f3320]/20 text-sm font-extrabold text-[#1f3320]">
          <Icon name="link" size={16} color="#1f3320" /> Get an invite link
        </button>
      ) : (
        <div className="space-y-2">
          <p className="break-all rounded-[12px] bg-cream px-3 py-2 text-xs text-ink">{api.linkUrl(token)}</p>
          <div className="grid grid-cols-2 gap-2">
            <a href={whatsappShareUrl(api.message(template.title, token))} target="_blank" rel="noopener noreferrer" className="flex min-h-10 items-center justify-center rounded-full bg-[#25D366] text-sm font-bold text-white">WhatsApp</a>
            <button type="button" onClick={copy} className="min-h-10 rounded-full border border-ink/15 text-sm font-bold text-ink">Copy link</button>
          </div>
          <button type="button" onClick={switchOff} className="w-full text-xs font-bold text-ink-muted underline">Switch this link off</button>
        </div>
      )}
    </section>
  )
}
