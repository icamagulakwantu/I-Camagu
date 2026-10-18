import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import { pressable, inp, money, fmtDate, api } from './shared.js'

const STATUS_STYLE = {
  PENDING: 'bg-brand-ochre/15 text-brand-ochre',
  APPROVED: 'bg-terracotta/10 text-terracotta',
  REJECTED: 'bg-ink/10 text-ink-muted',
  REPAID: 'bg-sage-100 text-sage-700',
}
const STATUS_LABEL = { PENDING: 'Awaiting votes', APPROVED: 'Repaying', REJECTED: 'Declined', REPAID: 'Repaid' }

// LoanBoard: any member can ask the group for a loan. Officials vote; once
// enough approve (the stokvel's required approvals), it is issued and officials
// record repayments until it is settled. Borrowers cannot vote on their own.
export default function LoanBoard({ stokvelId, groupBalance }) {
  const { accessToken, user } = useAuth()
  const { showToast } = useToast()
  const [data, setData] = useState(null)
  const [requesting, setRequesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [amount, setAmount] = useState('')
  const [months, setMonths] = useState('3')
  const [interest, setInterest] = useState('5')
  const [reason, setReason] = useState('')
  const [repayDraft, setRepayDraft] = useState({})

  const base = `/api/stokvels/${stokvelId}/loans`
  const load = useCallback(async () => {
    try {
      setData(await api(base, accessToken))
    } catch (err) {
      showToast(err.message, 'error')
      setData({ loans: [], requiredApprovals: 2, isOfficial: false })
    }
  }, [base, accessToken, showToast])

  useEffect(() => { load() }, [load])

  const run = async (fn, okMsg) => {
    setSaving(true)
    try {
      const out = await fn()
      showToast(out?.message || okMsg, 'success')
      await load()
      return true
    } catch (err) {
      showToast(err.message, 'error')
      return false
    } finally {
      setSaving(false)
    }
  }

  const submitRequest = async (e) => {
    e.preventDefault()
    const ok = await run(() => api(base, accessToken, {
      method: 'POST',
      body: JSON.stringify({ amount, repayMonths: months, interestPercent: interest, reason }),
    }), 'Loan request sent to officials')
    if (ok) { setRequesting(false); setAmount(''); setReason('') }
  }

  const vote = (loanId, approve) => run(() => api(`${base}/${loanId}/vote`, accessToken, {
    method: 'POST', body: JSON.stringify({ approve }),
  }), approve ? 'Vote to approve recorded' : 'Vote to decline recorded')

  const repay = async (loanId) => {
    const ok = await run(() => api(`${base}/${loanId}/repay`, accessToken, {
      method: 'POST', body: JSON.stringify({ amount: repayDraft[loanId] }),
    }), 'Repayment recorded')
    if (ok) setRepayDraft((d) => ({ ...d, [loanId]: '' }))
  }

  if (!data) return <div className="space-y-2"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>

  const { loans, requiredApprovals, isOfficial } = data
  const outstanding = loans.filter((l) => l.status === 'APPROVED').reduce((s, l) => s + (l.totalDue - l.repaid), 0)
  const preview = Number(amount) > 0 ? Number(amount) * (1 + Number(interest || 0) / 100) : 0

  return (
    <div className="space-y-4">
      <div className="bg-white border-2 border-terracotta/25 rounded-soft p-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-black uppercase text-ink-muted">Owed back to group</p>
          <p className="font-display font-bold text-xl text-ink mt-0.5">{money(outstanding)}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase text-ink-muted">Available in group</p>
          <p className="font-display font-bold text-xl text-ink mt-0.5">{money(groupBalance)}</p>
        </div>
        <p className="col-span-2 text-xs text-ink-muted">
          Each loan needs {requiredApprovals} official vote{requiredApprovals === 1 ? '' : 's'} to be approved. Interest goes back into the group pot.
        </p>
      </div>

      {!requesting ? (
        <button type="button" onClick={() => setRequesting(true)}
          className={`w-full bg-terracotta text-white font-bold py-2.5 rounded-pill text-sm ${pressable}`}>
          Ask the group for a loan
        </button>
      ) : (
        <form onSubmit={submitRequest} className="bg-white border-2 border-terracotta/25 rounded-soft p-4 space-y-3">
          <p className="text-xs font-black uppercase text-ink-muted">Loan request</p>
          <input type="number" min="1" step="0.01" placeholder="Amount (R)" value={amount}
            onChange={(e) => setAmount(e.target.value)} className={inp} required />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-ink-muted">Repay over (months)
              <input type="number" min="1" max="36" value={months} onChange={(e) => setMonths(e.target.value)} className={`${inp} mt-1`} required />
            </label>
            <label className="text-xs text-ink-muted">Group interest (%)
              <input type="number" min="0" max="100" step="0.5" value={interest} onChange={(e) => setInterest(e.target.value)} className={`${inp} mt-1`} />
            </label>
          </div>
          <textarea rows={2} placeholder="What is the loan for? (e.g. school fees)" value={reason}
            onChange={(e) => setReason(e.target.value)} className={`${inp} resize-none`} />
          {preview > 0 && (
            <p className="text-xs text-ink">
              You will repay <strong>{money(preview)}</strong>, about <strong>{money(preview / Math.max(1, Number(months) || 1))}</strong> a month.
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className={`flex-1 bg-terracotta text-white font-bold py-2 rounded-pill text-sm ${pressable}`}>
              {saving ? 'Sending...' : 'Send request'}
            </button>
            <button type="button" onClick={() => setRequesting(false)}
              className={`flex-1 border-2 border-terracotta/25 font-bold py-2 rounded-pill text-sm ${pressable}`}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loans.length === 0 ? (
        <p className="text-sm text-ink-muted text-center py-6">No loans yet. Members can borrow from the group pot instead of a mashonisa.</p>
      ) : loans.map((l) => {
        const yes = l.votes.filter((v) => v.approve).length
        const canVote = isOfficial && l.status === 'PENDING' && l.borrowerId !== user?.id
        const progress = Math.min(100, (l.repaid / l.totalDue) * 100)
        return (
          <div key={l.id} className="bg-white border border-terracotta/15 rounded-soft p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-sm text-ink truncate">{l.borrowerName}</p>
                <p className="text-xs text-ink-muted">{fmtDate(l.createdAt)} · {l.repayMonths} month(s) · {l.interestPercent}% interest</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-pill flex-shrink-0 ${STATUS_STYLE[l.status]}`}>{STATUS_LABEL[l.status]}</span>
            </div>
            <p className="font-display font-bold text-lg text-ink">{money(l.amount)}</p>
            {l.reason && <p className="text-xs text-ink-muted">{l.reason}</p>}

            {l.status === 'PENDING' && (
              <p className="text-xs text-ink">{yes} of {requiredApprovals} approvals{l.votes.length ? ` · voted: ${l.votes.map((v) => v.name).join(', ')}` : ''}</p>
            )}
            {canVote && (
              <div className="flex gap-2">
                <button type="button" disabled={saving} onClick={() => vote(l.id, true)}
                  className={`flex-1 py-2 rounded-pill text-xs font-bold ${l.myVote === true ? 'bg-terracotta text-white' : 'bg-terracotta/10 text-terracotta'} ${pressable}`}>
                  Approve
                </button>
                <button type="button" disabled={saving} onClick={() => vote(l.id, false)}
                  className={`flex-1 py-2 rounded-pill text-xs font-bold ${l.myVote === false ? 'bg-ink text-white' : 'bg-ink/5 text-ink-muted'} ${pressable}`}>
                  Decline
                </button>
              </div>
            )}

            {(l.status === 'APPROVED' || l.status === 'REPAID') && (
              <div>
                <div className="flex justify-between text-[11px] text-ink-muted mb-1">
                  <span>Repaid {money(l.repaid)} of {money(l.totalDue)}</span>
                  <span>{money(l.monthlyInstalment)}/month</span>
                </div>
                <div className="h-2 rounded-full bg-ink/5 overflow-hidden">
                  <div className="h-full bg-terracotta rounded-full" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
            {isOfficial && l.status === 'APPROVED' && (
              <div className="flex gap-2 pt-1">
                <input type="number" min="0" step="0.01" placeholder="Repayment (R)" value={repayDraft[l.id] || ''}
                  onChange={(e) => setRepayDraft((d) => ({ ...d, [l.id]: e.target.value }))} className={inp} />
                <button type="button" disabled={saving || !repayDraft[l.id]} onClick={() => repay(l.id)}
                  className={`bg-terracotta text-white font-bold px-4 rounded-pill text-sm ${pressable}`}>
                  Record
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
