import { useState } from 'react'
import Icon from './Icon.jsx'
import { useT } from '../i18n/index.jsx'
import { fixedPlace } from '../../shared/seating.js'

// Who sits where (founder, 23 Nov 2026): at umgidi and every ceremony of
// isiko lakwaXhosa, each group sits in its own place. Ootata are always
// ebuhlanti and that place cannot be changed; every other place is the
// family's to set by its own house. Listed in order of seniority; the family
// moves groups up or down, changes where they sit and how many they are, and
// adds or removes groups.
export default function SeatingPlan({ groups, accessToken, ceremonyId, onGroups, onError }) {
  const t = useT()
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState({ place: '', estimatedSize: '' })
  const [adding, setAdding] = useState(false)
  const [newGroup, setNewGroup] = useState({ groupLabel: '', place: '' })
  const [busy, setBusy] = useState(false)

  const call = async (url, method, body) => {
    setBusy(true)
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t('Could not save. Please try again.'))
      onGroups(Array.isArray(data) ? data : [])
      return true
    } catch (err) {
      onError?.(err.message)
      return false
    } finally {
      setBusy(false)
    }
  }

  const startEdit = (g) => {
    setEditing(g.id)
    setDraft({ place: g.place || '', estimatedSize: g.estimatedSize ?? '' })
  }
  const saveEdit = async (g) => {
    if (await call(`/api/hierarchy/groups/${g.id}`, 'PATCH', { place: draft.place, estimatedSize: draft.estimatedSize })) setEditing(null)
  }
  const addGroup = async (e) => {
    e.preventDefault()
    if (await call('/api/hierarchy/groups', 'POST', { ceremonyId, ...newGroup })) {
      setNewGroup({ groupLabel: '', place: '' })
      setAdding(false)
    }
  }

  const people = groups.reduce((sum, g) => sum + (Number(g.estimatedSize) || 0), 0)

  return (
    <section aria-labelledby="seating-title" className="mb-5">
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <h3 id="seating-title" className="font-display text-[1.2rem] font-semibold text-ink">{t('Who sits where')}</h3>
          <p className="text-[13px] text-ink-muted">{t('In order of seniority. Ootata always sit ebuhlanti; every other place is your family’s to set, by your house.')}</p>
        </div>
        {people > 0 && <p className="flex-shrink-0 text-[13px] font-semibold text-ink-muted">{t('{n} people', { n: people })}</p>}
      </div>

      <ol className="space-y-2">
        {groups.map((g, i) => (
          <li key={g.id} className="rounded-2xl bg-white p-3 ring-1 ring-ink/[0.07]">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#1f3320] text-[13px] font-bold text-white">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold leading-snug text-ink">{g.groupLabel}</p>
                {editing === g.id ? (
                  <div className="mt-2 space-y-2">
                    {fixedPlace(g.groupLabel) ? (
                      <p className="text-[13px] text-ink-muted">{t('Ootata always sit ebuhlanti.')}</p>
                    ) : (
                      <label className="block text-[12px] font-semibold text-ink-muted">
                        {t('Where they sit')}
                        <input value={draft.place} onChange={(e) => setDraft({ ...draft, place: e.target.value })} maxLength={120}
                          className="mt-1 w-full rounded-xl px-3 py-2 text-[14px] text-ink ring-1 ring-ink/15" />
                      </label>
                    )}
                    <label className="block text-[12px] font-semibold text-ink-muted">
                      {t('How many people')}
                      <input value={draft.estimatedSize} onChange={(e) => setDraft({ ...draft, estimatedSize: e.target.value.replace(/\D/g, '').slice(0, 4) })} inputMode="numeric"
                        className="mt-1 w-28 rounded-xl px-3 py-2 text-[14px] text-ink ring-1 ring-ink/15" />
                    </label>
                    <div className="flex gap-2">
                      <button type="button" disabled={busy} onClick={() => saveEdit(g)} className="h-10 rounded-full bg-[#1f3320] px-5 text-[13px] font-bold text-white disabled:opacity-60">{t('Save')}</button>
                      <button type="button" onClick={() => setEditing(null)} className="h-10 px-3 text-[13px] font-semibold text-ink-muted">{t('Cancel')}</button>
                      <button type="button" disabled={busy} onClick={() => call(`/api/hierarchy/groups/${g.id}`, 'DELETE')} className="ml-auto h-10 px-3 text-[13px] font-semibold text-terracotta-dark">{t('Remove group')}</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => startEdit(g)} className="mt-0.5 block text-left text-[13px] leading-snug text-ink-muted">
                    <Icon name="mapPin" size={12} color="#8a8278" className="mr-1 inline -translate-y-px" />
                    {fixedPlace(g.groupLabel) ? t('Ebuhlanti, the kraal: always') : g.place || t('Add where they sit')}
                    {g.estimatedSize ? <span className="text-ink-muted/80"> · {t('{n} people', { n: g.estimatedSize })}</span> : null}
                  </button>
                )}
              </div>
              {editing !== g.id && (
                <div className="flex flex-shrink-0 flex-col">
                  <button type="button" disabled={busy || i === 0} onClick={() => call(`/api/hierarchy/groups/${g.id}/move`, 'POST', { direction: 'up' })}
                    aria-label={t('Move {group} up', { group: g.groupLabel })} className="flex h-8 w-9 items-center justify-center rounded-lg disabled:opacity-25">
                    <Icon name="chevron-up" size={16} color="#1f3320" />
                  </button>
                  <button type="button" disabled={busy || i === groups.length - 1} onClick={() => call(`/api/hierarchy/groups/${g.id}/move`, 'POST', { direction: 'down' })}
                    aria-label={t('Move {group} down', { group: g.groupLabel })} className="flex h-8 w-9 items-center justify-center rounded-lg disabled:opacity-25">
                    <Icon name="chevron-down" size={16} color="#1f3320" />
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>

      {adding ? (
        <form onSubmit={addGroup} className="mt-2 space-y-2 rounded-2xl bg-white p-3 ring-1 ring-ink/[0.07]">
          <input value={newGroup.groupLabel} onChange={(e) => setNewGroup({ ...newGroup, groupLabel: e.target.value })} maxLength={60} required
            placeholder={t('Group, e.g. Amakhosikazi, Abakhwenyana')} className="w-full rounded-xl border border-ink/20 px-3 py-2 text-[14px]" />
          <input value={newGroup.place} onChange={(e) => setNewGroup({ ...newGroup, place: e.target.value })} maxLength={120}
            placeholder={t('Where they sit')} className="w-full rounded-xl border border-ink/20 px-3 py-2 text-[14px]" />
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="h-10 rounded-full bg-[#1f3320] px-5 text-[13px] font-bold text-white disabled:opacity-60">{t('Add group')}</button>
            <button type="button" onClick={() => setAdding(false)} className="h-10 px-3 text-[13px] font-semibold text-ink-muted">{t('Cancel')}</button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-[14px] font-bold text-[#1f3320]">
          <Icon name="plus" size={15} color="#1f3320" /> {t('Add a group')}
        </button>
      )}
    </section>
  )
}
