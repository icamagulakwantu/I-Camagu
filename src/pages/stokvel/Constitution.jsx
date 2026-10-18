import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import Icon from '../../components/Icon.jsx'

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none'
const inp = 'w-full border border-ink/20 rounded-2xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-terracotta/60'
const money = (n) => `R${Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmt = (iso) => new Date(iso).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const DEFAULT_CONSTITUTION = {
  purpose: '',
  meetingFrequency: 'Monthly',
  meetingDay: '',
  meetingLocation: '',
  contributionAmount: '',
  contributionFrequency: 'Monthly',
  contributionDueDay: '',
  lateFineDays: '3',
  lateFineAmount: '',
  absenceFineAmount: '',
  maxAbsences: '3',
  payoutOrder: 'rotating',
  payoutSchedule: '',
  membershipRequirements: '',
  terminationRules: '',
  signatories: '',
  bankName: '',
  bankAccountHolder: '',
  additionalRules: '',
}

// ── Constitution ───────────────────────────────────────────────────────────
// Editable group constitution / rules document stored at
// /api/stokvels/:id/constitution.
// Also renders the tamper-evident audit trail from /api/stokvels/:id/audit.
export default function Constitution({ stokvelId, isOrganiser }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [constitution, setConstitution] = useState(null)
  const [auditLog, setAuditLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState(DEFAULT_CONSTITUTION)
  const [activeSection, setActiveSection] = useState('constitution')

  const load = async () => {
    setLoading(true)
    try {
      const [constRes, auditRes] = await Promise.all([
        fetch(`/api/stokvels/${stokvelId}/constitution`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`/api/stokvels/${stokvelId}/audit`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ])
      if (constRes.ok) {
        const data = await constRes.json()
        setConstitution(data)
        setDraft({ ...DEFAULT_CONSTITUTION, ...data })
      }
      const auditData = auditRes.ok ? await auditRes.json() : []
      setAuditLog(Array.isArray(auditData) ? auditData : [])
    } catch {
      /* fail silently — constitution may not exist yet */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [stokvelId])

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/stokvels/${stokvelId}/constitution`, {
        method: constitution ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(draft),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save constitution')
      showToast('Constitution saved', 'success')
      setEditing(false)
      load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const Field = ({ label, value }) =>
    value ? (
      <div>
        <p className="text-[11px] font-black uppercase text-ink-muted mb-0.5">{label}</p>
        <p className="text-sm text-ink">{value}</p>
      </div>
    ) : null

  if (loading) return <div className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>

  return (
    <div className="space-y-4 pb-6">
      {/* Section toggle */}
      <div className="flex rounded-pill border-2 border-terracotta/20 bg-white p-1">
        <button type="button" onClick={() => setActiveSection('constitution')}
          className={`flex-1 rounded-pill py-1.5 text-[12px] font-bold transition-colors ${
            activeSection === 'constitution' ? 'bg-terracotta text-white' : 'text-ink-muted'
          }`}>
          Constitution
        </button>
        <button type="button" onClick={() => setActiveSection('audit')}
          className={`flex-1 rounded-pill py-1.5 text-[12px] font-bold transition-colors ${
            activeSection === 'audit' ? 'bg-terracotta text-white' : 'text-ink-muted'
          }`}>
          Audit trail ({auditLog.length})
        </button>
      </div>

      {activeSection === 'audit' ? (
        <div className="space-y-2">
          <p className="text-xs text-ink-muted">
            Every admin action is logged here. This record cannot be edited.
          </p>
          {auditLog.length === 0 ? (
            <div className="card-paper p-6 text-center">
              <Icon name="activity" size={28} color="#c45c26" />
              <p className="font-bold text-ink mt-2 mb-1">No actions logged yet</p>
              <p className="text-xs text-ink-muted">Admin actions (confirming contributions, issuing fines, recording payouts) will appear here.</p>
            </div>
          ) : (
            auditLog.map((entry, i) => (
              <div key={i} className="card-paper p-3 flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-terracotta/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon name="activity" size={13} color="#c45c26" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-ink font-semibold">{entry.action}</p>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    {entry.actorName || 'Admin'} &bull; {fmt(entry.createdAt)}
                  </p>
                  {entry.details && <p className="text-[11px] text-ink-muted">{entry.details}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      ) : editing ? (
        <form onSubmit={save} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg text-ink">Edit Constitution</h3>
            <button type="button" onClick={() => setEditing(false)} className="text-xs text-ink-muted font-bold">Cancel</button>
          </div>

          {/* Purpose */}
          <div className="card-paper p-4 space-y-3">
            <p className="eyebrow text-ink-muted">Purpose & meetings</p>
            <div>
              <label className="text-[11px] font-bold text-ink-muted mb-1 block">Group purpose</label>
              <textarea rows={2} placeholder="What is this stokvel for?"
                value={draft.purpose} onChange={(e) => setDraft((d) => ({ ...d, purpose: e.target.value }))}
                className={`${inp} resize-none`} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-ink-muted mb-1 block">Meeting frequency</label>
                <select value={draft.meetingFrequency}
                  onChange={(e) => setDraft((d) => ({ ...d, meetingFrequency: e.target.value }))} className={inp}>
                  <option>Weekly</option>
                  <option>Fortnightly</option>
                  <option>Monthly</option>
                  <option>Quarterly</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-ink-muted mb-1 block">Meeting day</label>
                <input type="text" placeholder="e.g. Last Saturday"
                  value={draft.meetingDay} onChange={(e) => setDraft((d) => ({ ...d, meetingDay: e.target.value }))}
                  className={inp} />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-ink-muted mb-1 block">Usual meeting location</label>
              <input type="text" placeholder="e.g. Rotating, or a fixed address"
                value={draft.meetingLocation} onChange={(e) => setDraft((d) => ({ ...d, meetingLocation: e.target.value }))}
                className={inp} />
            </div>
          </div>

          {/* Contributions & fines */}
          <div className="card-paper p-4 space-y-3">
            <p className="eyebrow text-ink-muted">Contributions & penalties</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-ink-muted mb-1 block">Contribution (R)</label>
                <input type="number" min="0" placeholder="500"
                  value={draft.contributionAmount}
                  onChange={(e) => setDraft((d) => ({ ...d, contributionAmount: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="text-[11px] font-bold text-ink-muted mb-1 block">Due by (day of month)</label>
                <input type="number" min="1" max="31" placeholder="1"
                  value={draft.contributionDueDay}
                  onChange={(e) => setDraft((d) => ({ ...d, contributionDueDay: e.target.value }))} className={inp} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-ink-muted mb-1 block">Late fine (R)</label>
                <input type="number" min="0" placeholder="50"
                  value={draft.lateFineAmount}
                  onChange={(e) => setDraft((d) => ({ ...d, lateFineAmount: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="text-[11px] font-bold text-ink-muted mb-1 block">Fine after (days)</label>
                <input type="number" min="1" placeholder="3"
                  value={draft.lateFineDays}
                  onChange={(e) => setDraft((d) => ({ ...d, lateFineDays: e.target.value }))} className={inp} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-ink-muted mb-1 block">Absence fine (R)</label>
                <input type="number" min="0" placeholder="50"
                  value={draft.absenceFineAmount}
                  onChange={(e) => setDraft((d) => ({ ...d, absenceFineAmount: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="text-[11px] font-bold text-ink-muted mb-1 block">Max absences</label>
                <input type="number" min="1" placeholder="3"
                  value={draft.maxAbsences}
                  onChange={(e) => setDraft((d) => ({ ...d, maxAbsences: e.target.value }))} className={inp} />
              </div>
            </div>
          </div>

          {/* Payout rules */}
          <div className="card-paper p-4 space-y-3">
            <p className="eyebrow text-ink-muted">Payout rules</p>
            <div>
              <label className="text-[11px] font-bold text-ink-muted mb-1 block">Payout order</label>
              <select value={draft.payoutOrder}
                onChange={(e) => setDraft((d) => ({ ...d, payoutOrder: e.target.value }))} className={inp}>
                <option value="rotating">Rotating (Umgalelo)</option>
                <option value="lottery">Lottery / draw</option>
                <option value="need_based">Need-based vote</option>
                <option value="annual">Annual lump sum to all</option>
                <option value="goods">Goods / ceremony supplies (SmartMatch)</option>
                <option value="custom">Custom — see notes</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-ink-muted mb-1 block">Payout schedule / notes</label>
              <textarea rows={2} placeholder="Describe when and how payouts happen..."
                value={draft.payoutSchedule}
                onChange={(e) => setDraft((d) => ({ ...d, payoutSchedule: e.target.value }))}
                className={`${inp} resize-none`} />
            </div>
          </div>

          {/* Membership & banking */}
          <div className="card-paper p-4 space-y-3">
            <p className="eyebrow text-ink-muted">Membership & banking</p>
            <div>
              <label className="text-[11px] font-bold text-ink-muted mb-1 block">Membership requirements</label>
              <textarea rows={2} placeholder="Who can join? Any entrance fee?"
                value={draft.membershipRequirements}
                onChange={(e) => setDraft((d) => ({ ...d, membershipRequirements: e.target.value }))}
                className={`${inp} resize-none`} />
            </div>
            <div>
              <label className="text-[11px] font-bold text-ink-muted mb-1 block">Termination / expulsion rules</label>
              <textarea rows={2} placeholder="What happens if a member leaves or is expelled?"
                value={draft.terminationRules}
                onChange={(e) => setDraft((d) => ({ ...d, terminationRules: e.target.value }))}
                className={`${inp} resize-none`} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-ink-muted mb-1 block">Bank</label>
                <input type="text" placeholder="e.g. Capitec"
                  value={draft.bankName}
                  onChange={(e) => setDraft((d) => ({ ...d, bankName: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="text-[11px] font-bold text-ink-muted mb-1 block">Account holder</label>
                <input type="text" placeholder="Group name or signatories"
                  value={draft.bankAccountHolder}
                  onChange={(e) => setDraft((d) => ({ ...d, bankAccountHolder: e.target.value }))} className={inp} />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-ink-muted mb-1 block">Signatories (names)</label>
              <input type="text" placeholder="e.g. Thandi Dlamini, Nomvula Khumalo"
                value={draft.signatories}
                onChange={(e) => setDraft((d) => ({ ...d, signatories: e.target.value }))} className={inp} />
            </div>
          </div>

          {/* Additional rules */}
          <div className="card-paper p-4">
            <label className="text-[11px] font-bold text-ink-muted mb-1 block">Additional rules</label>
            <textarea rows={4} placeholder="Any other rules the group has agreed on..."
              value={draft.additionalRules}
              onChange={(e) => setDraft((d) => ({ ...d, additionalRules: e.target.value }))}
              className={`${inp} resize-none`} />
          </div>

          <button type="submit" disabled={saving}
            className={`w-full bg-terracotta text-white font-bold py-3 rounded-pill text-sm ${pressable}`}>
            {saving ? 'Saving...' : 'Save constitution'}
          </button>
        </form>
      ) : constitution ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg text-ink">Group Constitution</h3>
            {isOrganiser && (
              <button type="button" onClick={() => setEditing(true)}
                className={`text-xs font-bold text-terracotta ${pressable}`}>Edit</button>
            )}
          </div>

          {[
            { section: 'Purpose & meetings', fields: [
              { label: 'Purpose', value: constitution.purpose },
              { label: 'Meeting frequency', value: constitution.meetingFrequency },
              { label: 'Meeting day', value: constitution.meetingDay },
              { label: 'Meeting location', value: constitution.meetingLocation },
            ]},
            { section: 'Contributions & penalties', fields: [
              { label: 'Contribution amount', value: constitution.contributionAmount ? money(constitution.contributionAmount) : null },
              { label: 'Due by (day of month)', value: constitution.contributionDueDay },
              { label: 'Late fine', value: constitution.lateFineAmount ? `${money(constitution.lateFineAmount)} after ${constitution.lateFineDays} days` : null },
              { label: 'Absence fine', value: constitution.absenceFineAmount ? money(constitution.absenceFineAmount) : null },
              { label: 'Max absences before expulsion', value: constitution.maxAbsences },
            ]},
            { section: 'Payout rules', fields: [
              { label: 'Payout order', value: constitution.payoutOrder },
              { label: 'Payout schedule', value: constitution.payoutSchedule },
            ]},
            { section: 'Membership & banking', fields: [
              { label: 'Membership requirements', value: constitution.membershipRequirements },
              { label: 'Termination rules', value: constitution.terminationRules },
              { label: 'Bank', value: constitution.bankName },
              { label: 'Account holder', value: constitution.bankAccountHolder },
              { label: 'Signatories', value: constitution.signatories },
            ]},
            { section: 'Additional rules', fields: [
              { label: '', value: constitution.additionalRules },
            ]},
          ].map(({ section, fields }) => {
            const populated = fields.filter((f) => f.value)
            if (populated.length === 0) return null
            return (
              <div key={section} className="card-paper p-4 space-y-3">
                <p className="eyebrow text-ink-muted">{section}</p>
                {populated.map((f) => <Field key={f.label} label={f.label} value={f.value} />)}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card-paper p-6 text-center">
          <Icon name="file" size={32} color="#c45c26" />
          <p className="font-bold text-ink mt-3 mb-1">No constitution yet</p>
          <p className="text-xs text-ink-muted mb-4">
            {isOrganiser
              ? 'Document your group rules so every member knows the terms. This replaces the paper constitution you carry to meetings.'
              : 'The organiser has not yet uploaded the group constitution.'}
          </p>
          {isOrganiser && (
            <button type="button" onClick={() => setEditing(true)}
              className={`bg-terracotta text-white font-bold px-6 py-2.5 rounded-pill text-sm ${pressable}`}>
              Write constitution
            </button>
          )}
        </div>
      )}
    </div>
  )
}
