import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import Icon from '../components/Icon.jsx'
import { clanInviteMessage, clanInviteUrl, whatsappShareUrl } from '../lib/inviteLinks.js'

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none'
const inputClass = 'w-full border-2 border-ink/20 rounded-soft px-4 py-3 text-base focus:outline-none focus:border-sage-500'

function GroupCard({ group, actionLabel, onAction, busy }) {
  return (
    <div className="bg-white border-2 border-terracotta/15 rounded-soft p-4 shadow-soft">
      <p className="text-[11px] font-black uppercase tracking-wide text-terracotta">{group.clanName}</p>
      <p className="font-display font-bold text-lg text-ink leading-tight mt-0.5">{group.name}</p>
      <p className="text-xs text-ink-muted mt-0.5">{group.memberCount} member{group.memberCount === 1 ? '' : 's'}</p>
      {group.description && <p className="text-sm text-ink mt-2">{group.description}</p>}
      <button type="button" onClick={onAction} disabled={busy}
        className={`mt-3 w-full bg-sage-500 text-white font-bold py-3 rounded-pill text-base ${pressable}`}>
        {busy ? 'Please wait...' : actionLabel}
      </button>
    </div>
  )
}

// One clan group: the WhatsApp share (the main way families move over),
// the member list, and leave/remove.
function GroupDetail({ groupId, onBack, authedFetch }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [group, setGroup] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const res = await authedFetch(`/api/iziduko/groups/${groupId}`).catch(() => null)
    const data = res ? await res.json().catch(() => ({})) : {}
    if (!res?.ok) {
      showToast(data.error || 'Could not open the group', 'error')
      onBack()
      return
    }
    setGroup(data)
  }, [authedFetch, groupId, onBack, showToast])

  useEffect(() => { load() }, [load])

  if (!group) return <div className="px-4 mt-5 space-y-3"><Skeleton className="h-40 w-full" /><Skeleton className="h-20 w-full" /></div>

  const isCreator = group.role === 'CREATOR'
  const message = clanInviteMessage(group.clanName, group.name, group.inviteCode)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(clanInviteUrl(group.inviteCode))
      showToast('Link copied', 'success')
    } catch {
      showToast('Could not copy. Press and hold the link to copy it.', 'error')
    }
  }

  const call = async (url, method, okMessage, after) => {
    setBusy(true)
    try {
      const res = await authedFetch(url, { method })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      showToast(okMessage || data.message, 'success')
      after?.(data)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="px-4 mt-5 space-y-4">
      <button type="button" onClick={onBack} className="text-sm font-bold text-sage-700 flex items-center gap-1">
        <Icon name="arrowLeft" size={14} /> All clan groups
      </button>

      <div>
        <p className="text-[11px] font-black uppercase tracking-wide text-terracotta">{group.clanName}</p>
        <h2 className="font-display font-bold text-2xl text-ink leading-tight">{group.name}</h2>
        {group.description && <p className="text-sm text-ink-muted mt-1">{group.description}</p>}
      </div>

      {/* Bringing the family over from WhatsApp */}
      <div className="bg-white border-2 border-sage-500/40 rounded-soft p-4 shadow-soft">
        <p className="font-display font-bold text-lg text-ink">Bring your WhatsApp group</p>
        <ol className="mt-2 space-y-1.5 text-sm text-ink">
          <li className="flex gap-2"><span className="font-black text-sage-700">1.</span> Tap the green button below.</li>
          <li className="flex gap-2"><span className="font-black text-sage-700">2.</span> WhatsApp opens. Choose your family group.</li>
          <li className="flex gap-2"><span className="font-black text-sage-700">3.</span> Press send. Everyone who taps the link joins here.</li>
        </ol>
        <a href={whatsappShareUrl(message)} target="_blank" rel="noopener noreferrer"
          className={`mt-3 w-full bg-[#1f9d55] text-white font-bold py-3.5 rounded-pill text-base flex items-center justify-center gap-2 ${pressable}`}>
          <Icon name="share" size={18} color="#fff" /> Share to WhatsApp
        </a>
        <button type="button" onClick={copyLink}
          className={`mt-2 w-full bg-cream border-2 border-cream-dark text-ink font-bold py-3 rounded-pill text-sm flex items-center justify-center gap-2 ${pressable}`}>
          <Icon name="copy" size={16} /> Copy the link instead
        </button>
        <details className="mt-3">
          <summary className="text-xs font-bold text-ink-muted cursor-pointer">See the message that will be sent</summary>
          <p className="mt-2 text-xs text-ink whitespace-pre-line bg-cream rounded-soft p-3">{message}</p>
        </details>
      </div>

      <div className="bg-white border-2 border-terracotta/15 rounded-soft p-4">
        <p className="text-xs font-black uppercase tracking-wide text-ink-muted">Members ({group.members.length})</p>
        <ul className="mt-2 divide-y divide-cream-dark">
          {group.members.map((m) => (
            <li key={m.userId} className="py-2.5 flex items-center gap-3">
              <span className="w-9 h-9 rounded-full bg-sage-50 flex items-center justify-center flex-shrink-0">
                <Icon name="user" size={16} color="#4a7a4a" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-sm text-ink truncate">
                  {m.firstName || 'Member'} {m.lastName || ''}{m.userId === user?.id ? ' (you)' : ''}
                </span>
                {m.role === 'CREATOR' && <span className="block text-[11px] text-terracotta font-bold">Started the group</span>}
              </span>
              {isCreator && m.role !== 'CREATOR' && (
                <button type="button" disabled={busy}
                  onClick={() => call(`/api/iziduko/groups/${group.id}/members/${m.userId}`, 'DELETE', 'Member removed', load)}
                  className={`text-xs font-bold text-terracotta underline ${pressable}`}>
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {isCreator ? (
        <button type="button" disabled={busy}
          onClick={() => call(`/api/iziduko/groups/${group.id}/invite-link`, 'POST', 'New link made. The old link no longer works.', (d) => setGroup((g) => ({ ...g, inviteCode: d.inviteCode })))}
          className={`w-full text-sm font-bold text-ink-muted py-2 ${pressable}`}>
          Link shared with the wrong people? Make a new link
        </button>
      ) : (
        <button type="button" disabled={busy}
          onClick={() => call(`/api/iziduko/groups/${group.id}/leave`, 'DELETE', 'You have left the group', onBack)}
          className={`w-full text-sm font-bold text-terracotta py-2 ${pressable}`}>
          Leave this group
        </button>
      )}
    </div>
  )
}

// Clan groups: start one for your clan, join one that matches your iziduko,
// or bring the family's WhatsApp group over with one link.
export default function ClanGroups({ onBack, onGoToClanLines, initialGroupId, onConsumeInitialGroup }) {
  const { user, accessToken } = useAuth()
  const { showToast } = useToast()
  const [openId, setOpenId] = useState(initialGroupId || null)
  const [mine, setMine] = useState(null)
  const [suggested, setSuggested] = useState({ hasClan: true, groups: [] })
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ clanName: user?.paternalIziduko || '', name: '', description: '' })
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    if (initialGroupId) onConsumeInitialGroup?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const authedFetch = useCallback((url, options = {}) => fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, ...options.headers },
  }), [accessToken])

  const loadLists = useCallback(async () => {
    const [mineRes, sugRes] = await Promise.all([
      authedFetch('/api/iziduko/groups').catch(() => null),
      authedFetch('/api/iziduko/groups/suggested').catch(() => null),
    ])
    const mineData = mineRes?.ok ? await mineRes.json() : { groups: [] }
    const sugData = sugRes?.ok ? await sugRes.json() : { hasClan: true, groups: [] }
    setMine(mineData.groups || [])
    setSuggested({ hasClan: sugData.hasClan !== false, groups: sugData.groups || [] })
  }, [authedFetch])

  useEffect(() => { if (!openId) loadLists() }, [openId, loadLists])

  const closeDetail = useCallback(() => setOpenId(null), [])

  const createGroup = async (e) => {
    e.preventDefault()
    setBusyId('create')
    try {
      const res = await authedFetch('/api/iziduko/groups', { method: 'POST', body: JSON.stringify(form) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not start the group')
      showToast('Your clan group is ready. Now invite the family.', 'success')
      setCreating(false)
      setForm({ clanName: user?.paternalIziduko || '', name: '', description: '' })
      setOpenId(data.id)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  const joinSuggested = async (group) => {
    setBusyId(group.id)
    try {
      const res = await authedFetch(`/api/iziduko/groups/${group.id}/join`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not join')
      showToast(data.message, 'success')
      setOpenId(group.id)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="min-h-screen pb-28 bg-cream">
      <div className="bg-gradient-to-br from-sage-500 to-sage-600 text-white px-5 pt-10 pb-6 rounded-b-[2.5rem]">
        <button type="button" onClick={onBack} className="text-sm text-white/70 mb-3 block">← Back</button>
        <h1 className="font-display font-bold text-2xl">Clan Groups</h1>
        <p className="text-white/80 text-sm mt-1">Your clan, together in one safe place.</p>
      </div>

      {openId ? (
        <GroupDetail groupId={openId} onBack={closeDetail} authedFetch={authedFetch} />
      ) : (
        <div className="px-4 mt-5 space-y-6">
          {!creating ? (
            <button type="button" onClick={() => setCreating(true)}
              className={`w-full bg-terracotta text-white font-bold py-4 rounded-pill text-base flex items-center justify-center gap-2 shadow-soft ${pressable}`}>
              <Icon name="users" size={18} color="#fff" /> Start a clan group
            </button>
          ) : (
            <form onSubmit={createGroup} className="bg-white border-2 border-terracotta/25 rounded-soft p-4 space-y-3 shadow-soft">
              <p className="font-display font-bold text-lg text-ink">Start a clan group</p>
              <p className="text-xs text-ink-muted -mt-2">Already have a WhatsApp group? Start it here, then share one link into WhatsApp.</p>
              <label className="block">
                <span className="text-sm font-bold text-ink">Clan name</span>
                <input value={form.clanName} onChange={(e) => setForm({ ...form, clanName: e.target.value })}
                  placeholder="e.g. AmaCirha" className={`${inputClass} mt-1`} required />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-ink">Group name</span>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. AmaCirha of Mdantsane" className={`${inputClass} mt-1`} required />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-ink">What is the group for? (optional)</span>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Family news, imigidi and funerals" rows={2} maxLength={300} className={`${inputClass} mt-1`} />
              </label>
              <div className="flex gap-2">
                <button type="submit" disabled={busyId === 'create'}
                  className={`flex-1 bg-sage-500 text-white font-bold py-3 rounded-pill text-base ${pressable}`}>
                  {busyId === 'create' ? 'Starting...' : 'Start group'}
                </button>
                <button type="button" onClick={() => setCreating(false)}
                  className={`px-5 bg-cream border-2 border-cream-dark font-bold py-3 rounded-pill text-base ${pressable}`}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          <section>
            <p className="text-xs font-black uppercase tracking-wide text-ink-muted mb-2">My clan groups</p>
            {mine === null ? (
              <div className="space-y-2"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
            ) : mine.length === 0 ? (
              <p className="text-sm text-ink-muted bg-white rounded-soft p-4 border-2 border-cream-dark">
                You are not in a clan group yet. Start one above, or join one below.
              </p>
            ) : (
              <div className="space-y-3">
                {mine.map((g) => (
                  <GroupCard key={g.id} group={g} actionLabel="Open" onAction={() => setOpenId(g.id)} />
                ))}
              </div>
            )}
          </section>

          <section>
            <p className="text-xs font-black uppercase tracking-wide text-ink-muted mb-2">Groups for your clan</p>
            {!suggested.hasClan ? (
              <div className="bg-white border-2 border-ochre/40 rounded-soft p-4">
                <p className="font-bold text-ink">Add your iziduko to find your clan</p>
                <p className="text-sm text-ink-muted mt-1">We use your clan names to show groups that belong to your family.</p>
                {onGoToClanLines && (
                  <button type="button" onClick={onGoToClanLines}
                    className={`mt-3 w-full bg-sage-500 text-white font-bold py-3 rounded-pill text-base ${pressable}`}>
                    Add my iziduko
                  </button>
                )}
              </div>
            ) : suggested.groups.length === 0 ? (
              <p className="text-sm text-ink-muted bg-white rounded-soft p-4 border-2 border-cream-dark">
                No other groups for your clan yet. You can be the first to start one.
              </p>
            ) : (
              <div className="space-y-3">
                {suggested.groups.map((g) => (
                  <GroupCard key={g.id} group={g} actionLabel="Join" busy={busyId === g.id} onAction={() => joinSuggested(g)} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
