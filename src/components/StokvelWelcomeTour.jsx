import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none'
const money = (n) => `R${Number(n).toLocaleString('en-ZA', { maximumFractionDigits: 2 })}`

const TYPE_PURPOSE = {
  ALCOHOL_BULK_POOL: 'Members buy drinks together in bulk to save money.',
  UMGALELO_ROTATING: 'Everyone pays in each month and one member receives the pot in turn.',
  CEREMONY_SAVINGS: 'Members save together for ceremonies such as umgidi, funerals and weddings.',
  EXISTING_STOKVEL_UPGRADE: 'An existing stokvel that now keeps its records on iCamagu.',
  RECIPROCAL_GIFTING: 'Members give to each other at ceremonies and are repaid in kind.',
}

const OFFICIAL_ROLE = { CHAIRPERSON: 'Chairperson', TREASURER: 'Treasurer', SECRETARY: 'Secretary' }

function Row({ label, value }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-3 py-2 border-b border-cream-dark/70 last:border-0">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="text-sm font-bold text-ink text-right">{value}</span>
    </div>
  )
}

// Builds the four tour screens from what the stokvel has actually set up, so
// nothing is invented. Anything the organiser has not filled in is left out.
function buildSteps(stokvel, rules, referenceCode) {
  const purpose = rules?.purpose || TYPE_PURPOSE[stokvel.type] || ''
  const contribution = rules?.contributionAmount || stokvel.contributionAmount
  const officials = (stokvel.officials || []).map((o) => {
    const member = stokvel.members?.find((m) => m.userId === o.userId)
    const name = member ? `${member.user.firstName} ${member.user.lastName}` : null
    return name ? { name, role: OFFICIAL_ROLE[o.role] || 'Official' } : null
  }).filter(Boolean)

  return [
    {
      title: `Welcome to ${stokvel.name}`,
      body: (
        <>
          <p className="text-base text-ink">{purpose || 'Your group saves and plans together.'}</p>
          <div className="mt-3">
            <Row label="Members" value={String(stokvel.members?.length || 0)} />
            <Row label="Your reference" value={referenceCode} />
          </div>
        </>
      ),
    },
    {
      title: 'What you pay',
      body: (
        <>
          <div>
            <Row label="Amount" value={contribution ? money(contribution) : 'Not set yet'} />
            <Row label="How often" value={rules?.contributionFrequency || stokvel.contributionFrequency} />
            <Row label="Pay by day" value={rules?.contributionDueDay ? `Day ${rules.contributionDueDay} of the month` : null} />
            <Row label="Late fine" value={rules?.lateFineAmount ? `${money(rules.lateFineAmount)} after ${rules.lateFineDays} days` : null} />
          </div>
          <p className="text-sm text-ink-muted mt-3">
            Pay into the group account, then open the Contributions tab and tap Submit. Use your reference so the officials can find your payment.
          </p>
        </>
      ),
    },
    {
      title: 'Who looks after the money',
      body: (
        <>
          {officials.length > 0 ? (
            <div>{officials.map((o) => <Row key={o.name} label={o.role} value={o.name} />)}</div>
          ) : (
            <p className="text-sm text-ink-muted">The organiser has not named officials yet.</p>
          )}
          <p className="text-sm text-ink-muted mt-3">
            An official confirms each payment. Nobody can confirm their own, so the money is always checked by someone else.
          </p>
        </>
      ),
    },
    {
      title: 'The rules of the group',
      body: (
        <>
          <div>
            <Row label="Meetings" value={[rules?.meetingFrequency, rules?.meetingDay].filter(Boolean).join(', ')} />
            <Row label="Where" value={rules?.meetingLocation} />
            <Row label="Payouts" value={rules?.payoutSchedule} />
            <Row label="Missed meetings" value={rules?.absenceFineAmount ? `${money(rules.absenceFineAmount)} fine` : null} />
          </div>
          {rules?.additionalRules && <p className="text-sm text-ink mt-3">{rules.additionalRules}</p>}
          {!rules && <p className="text-sm text-ink-muted">The organiser has not written the rules yet. You can read them later in the Rules tab.</p>}
          <p className="text-sm text-ink-muted mt-3">You can read all of this again any time in the Rules tab.</p>
        </>
      ),
    },
  ]
}

// A short guided tour shown once when someone joins a stokvel: what it is
// for, what they pay, who the officials are, and the rules.
export default function StokvelWelcomeTour({ stokvelId, onClose }) {
  const { accessToken } = useAuth()
  const [data, setData] = useState(null)
  const [step, setStep] = useState(0)

  useEffect(() => {
    let cancelled = false
    const headers = { Authorization: `Bearer ${accessToken}` }
    const load = async () => {
      const [detailRes, rulesRes] = await Promise.all([
        fetch(`/api/stokvels/${stokvelId}`, { headers }).catch(() => null),
        fetch(`/api/stokvels/${stokvelId}/constitution`, { headers }).catch(() => null),
      ])
      if (!detailRes?.ok) { onClose(); return }
      const detail = await detailRes.json()
      const rules = rulesRes?.ok ? await rulesRes.json().catch(() => null) : null
      if (!cancelled) setData({ detail, rules })
    }
    load()
    return () => { cancelled = true }
  }, [stokvelId, accessToken, onClose])

  if (!data) return null
  const steps = buildSteps(data.detail.stokvel, data.rules, data.detail.myReferenceCode)
  const current = steps[step]
  const last = step === steps.length - 1

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-cream w-full max-w-md rounded-soft shadow-soft p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-terracotta">Step {step + 1} of {steps.length}</p>
          <button type="button" onClick={onClose} className="text-sm text-ink-muted font-semibold px-2 py-1">Skip</button>
        </div>
        <div className="flex gap-1.5 mb-4">
          {steps.map((s, i) => (
            <div key={s.title} className={`h-1.5 flex-1 rounded-pill ${i <= step ? 'bg-sage-500' : 'bg-ink/10'}`} />
          ))}
        </div>
        <h2 className="font-display font-bold text-2xl text-ink mb-3">{current.title}</h2>
        <div className="max-h-[50vh] overflow-y-auto">{current.body}</div>
        <div className="flex gap-2 mt-5">
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)}
              className={`flex-1 border-2 border-terracotta/40 text-ink font-bold py-3 rounded-pill text-base ${pressable}`}>
              Back
            </button>
          )}
          <button type="button" onClick={() => (last ? onClose() : setStep(step + 1))}
            className={`flex-1 bg-sage-500 text-white font-bold py-3 rounded-pill text-base ${pressable}`}>
            {last ? 'Got it' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
