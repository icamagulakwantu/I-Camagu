import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import { primaryBtn, secondaryBtn } from './Ui.jsx'
import { pressable, inp, money, api } from './shared.js'

// Umbutho lending targets: each member raises a target by lending money out
// and bringing it back with interest. Profit (returned minus lent) counts.
export default function LendingTargets({ stokvelId }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [data, setData] = useState(null)
  const [mode, setMode] = useState(null) // 'round' | 'target'
  const [saving, setSaving] = useState(false)
  const [round, setRound] = useState({ lent: '', returned: '', note: '' })
  const [target, setTarget] = useState('')

  const base = `/api/stokvels/${stokvelId}/lending`
  const load = useCallback(async () => {
    try { setData(await api(base, accessToken)) }
    catch (err) { showToast(err.message, 'error'); setData({ isOfficial: false, members: [] }) }
  }, [base, accessToken, showToast])
  useEffect(() => { load() }, [load])

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const out = mode === 'target'
        ? await api(`${base}/target`, accessToken, { method: 'PUT', body: JSON.stringify({ target }) })
        : await api(`${base}/rounds`, accessToken, { method: 'POST', body: JSON.stringify(round) })
      showToast(out?.message || 'Saved', 'success')
      setMode(null); setRound({ lent: '', returned: '', note: '' }); setTarget('')
      await load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!data) return <Skeleton className="h-32 w-full" />
  const me = data.members.find((m) => m.isMe)
  const profit = Number(round.returned || 0) - Number(round.lent || 0)

  return (
    <div className="bg-white border-2 border-terracotta/25 rounded-soft p-4 space-y-3">
      <div>
        <p className="text-[10px] font-black uppercase text-ink-muted">Umbutho lending target</p>
        <p className="text-xs text-ink-muted mt-0.5">Lend money out, bring it back with interest. The interest you bring back counts towards your target.</p>
      </div>

      {me && (
        <div className="rounded-[14px] bg-cream p-3">
          {me.target > 0 ? (
            <>
              <div className="flex justify-between items-baseline">
                <p className="font-display font-bold text-lg text-ink">{money(me.raised)}</p>
                <p className="text-xs text-ink-muted">of {money(me.target)} · {me.percent}%</p>
              </div>
              <div className="h-2.5 rounded-full bg-ink/10 overflow-hidden mt-1.5">
                <div className="h-full bg-terracotta rounded-full transition-all duration-500" style={{ width: `${me.percent}%` }} />
              </div>
              <p className="text-[11px] text-ink-muted mt-1.5">
                {me.raised >= me.target ? 'Target reached. Well done.' : `${money(me.target - me.raised)} still to raise · ${me.rounds} round(s) recorded`}
              </p>
            </>
          ) : (
            <p className="text-xs text-ink">No target set yet. {data.isOfficial ? 'Set one for the group below.' : 'Ask an official to set one.'}</p>
          )}
        </div>
      )}

      {!mode && (
        <div className="flex gap-2">
          <button type="button" onClick={() => setMode('round')} className={`flex-1 py-2 text-sm ${primaryBtn}`}>Record money brought back</button>
          {data.isOfficial && (
            <button type="button" onClick={() => setMode('target')} className={`flex-1 py-2 text-sm ${secondaryBtn}`}>Set target</button>
          )}
        </div>
      )}

      {mode === 'round' && (
        <form onSubmit={save} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-ink-muted">I lent out (R)
              <input type="number" min="1" step="0.01" value={round.lent} onChange={(e) => setRound({ ...round, lent: e.target.value })} className={`${inp} mt-1`} required />
            </label>
            <label className="text-xs text-ink-muted">Came back (R)
              <input type="number" min="0" step="0.01" value={round.returned} onChange={(e) => setRound({ ...round, returned: e.target.value })} className={`${inp} mt-1`} required />
            </label>
          </div>
          <input placeholder="Note (optional), e.g. lent to a neighbour" value={round.note} onChange={(e) => setRound({ ...round, note: e.target.value })} className={inp} />
          {round.lent && round.returned && (
            <p className="text-xs text-ink">Interest earned this round: <strong>{money(Math.max(0, profit))}</strong></p>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className={`flex-1 py-2 ${primaryBtn}`}>{saving ? 'Saving...' : 'Save'}</button>
            <button type="button" onClick={() => setMode(null)} className={`flex-1 py-2 ${secondaryBtn}`}>Cancel</button>
          </div>
        </form>
      )}

      {mode === 'target' && (
        <form onSubmit={save} className="space-y-2">
          <label className="text-xs text-ink-muted">Target each member must raise (R)
            <input type="number" min="1" step="1" value={target} onChange={(e) => setTarget(e.target.value)} className={`${inp} mt-1`} required />
          </label>
          <p className="text-[11px] text-ink-muted">This sets the same target for every member.</p>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className={`flex-1 py-2 ${primaryBtn}`}>{saving ? 'Saving...' : 'Save target'}</button>
            <button type="button" onClick={() => setMode(null)} className={`flex-1 py-2 ${secondaryBtn}`}>Cancel</button>
          </div>
        </form>
      )}

      {data.members.length > 1 && (
        <div className="space-y-2 pt-1">
          <p className="text-[10px] font-black uppercase text-ink-muted">Group progress</p>
          {data.members.map((m) => (
            <div key={m.memberId}>
              <div className="flex justify-between text-xs">
                <span className={`truncate ${m.isMe ? 'font-bold text-ink' : 'text-ink'}`}>{m.isMe ? 'You' : m.name}</span>
                <span className="text-ink-muted flex-shrink-0">{money(m.raised)}{m.target > 0 ? ` / ${money(m.target)}` : ''}</span>
              </div>
              <div className="h-1.5 rounded-full bg-ink/5 overflow-hidden mt-1">
                <div className={`h-full rounded-full ${m.percent >= 100 ? 'bg-sage-500' : 'bg-terracotta/70'}`} style={{ width: `${m.percent}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
      <span className={`hidden ${pressable}`} />
    </div>
  )
}
