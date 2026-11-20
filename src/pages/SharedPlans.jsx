import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import CeremonyIcon from '../components/CeremonyIcon.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import TemplateInvite from './templates/TemplateInvite.jsx'
import TemplateEditor from './templates/TemplateEditor.jsx'
import { PLAN_API } from './templates/collabApi.js'
import { PENDING_PLAN_KEY } from '../lib/inviteLinks.js'

const pendingInvite = () => { try { return localStorage.getItem(PENDING_PLAN_KEY) } catch { return null } }
const forgetInvite = () => { try { localStorage.removeItem(PENDING_PLAN_KEY) } catch { /* storage blocked */ } }

// Ceremony plans other families asked you to help with. A plan invite link
// (/p/...) lands here: ask to edit, then suggest changes the host approves.
export default function SharedPlans({ onBack, onOpenOwnCeremony }) {
  const { accessToken } = useAuth()
  const [view, setView] = useState(() => (pendingInvite() ? { kind: 'invite', token: pendingInvite() } : null))
  const [plans, setPlans] = useState(null)

  useEffect(() => {
    fetch('/api/ceremonies/collab/shared', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setPlans(Array.isArray(d) ? d : []))
      .catch(() => setPlans([]))
  }, [accessToken, view])

  if (view?.kind === 'invite') {
    return (
      <TemplateInvite
        api={PLAN_API}
        token={view.token}
        onActed={forgetInvite}
        onBack={() => { forgetInvite(); setView(null) }}
        onOpenEditor={(id) => { forgetInvite(); setView({ kind: 'edit', id }) }}
      />
    )
  }
  if (view?.kind === 'edit') {
    return <TemplateEditor api={PLAN_API} templateId={view.id} onBack={() => setView(null)} />
  }

  return (
    <div className="min-h-screen bg-cream pb-28">
      <header className="bg-[#1f3320] px-5 pb-8 pt-6 text-cream">
        <button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5 text-sm font-bold">← Back</button>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-cream/60">Sincedisana · Helping each other</p>
        <h1 className="mt-1 font-display text-[1.9rem] font-semibold leading-tight">Plans shared with me</h1>
        <p className="mt-1 text-sm text-cream/80">Ceremonies family asked you to help plan. Your suggestions wait for the host to approve.</p>
      </header>
      <div className="space-y-3 px-4 pt-5">
        {plans && plans.length === 0 && (
          <EmptyState emoji="🤝" title="Nothing shared with you yet" description="When family send you a plan link, it shows here." />
        )}
        {(plans || []).map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={p.role !== 'editor'}
            onClick={() => (p.role === 'editor' ? setView({ kind: 'edit', id: p.id }) : null)}
            className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-soft disabled:opacity-80"
          >
            <CeremonyIcon type={p.ceremonyType} size={44} />
            <span className="min-w-0 flex-1">
              <span className="block break-words text-base font-bold text-ink">{p.title}</span>
              <span className="block text-xs text-ink-muted">{p.ownerName}&rsquo;s plan · {p.role === 'editor' ? (p.myProposalStatus === 'OPEN' ? 'your suggestions are waiting for approval' : 'you can suggest changes') : 'waiting for approval to help'}</span>
            </span>
            {p.role === 'editor' && <span className="text-xl text-terracotta" aria-hidden="true">›</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
