import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import { SubEmpty, primaryBtn, secondaryBtn } from './Ui.jsx'
import { money, fmtDate, api } from './shared.js'

// Plain-language names for the ledger accounts. In the ledger a debit is
// positive and a credit negative, so income accounts hold negative totals;
// `flip` shows them as positive numbers a member expects to read.
const SUMMARY = [
  { account: 'BANK', label: 'Cash in the bank', flip: false },
  { account: 'CONTRIBUTIONS', label: 'Contributions received', flip: true },
  { account: 'LOANS_RECEIVABLE', label: 'Loans still owed to the group', flip: false },
  { account: 'INTEREST_INCOME', label: 'Interest earned on loans', flip: true },
  { account: 'FINES_INCOME', label: 'Fines paid', flip: true },
  { account: 'BANK_INTEREST', label: 'Bank interest', flip: true },
  { account: 'EXPENSES', label: 'Group expenses', flip: false },
  { account: 'PAYOUTS', label: 'Payouts to members', flip: false },
  { account: 'BANK_FEES', label: 'Bank fees', flip: false },
]

const KIND_LABELS = {
  CONTRIBUTION: 'Contribution',
  LOAN_ISSUED: 'Loan issued',
  LOAN_REPAYMENT: 'Loan repayment',
  FINE_PAID: 'Fine paid',
  EXPENSE: 'Expense',
  INTEREST: 'Interest',
  PAYOUT: 'Payout',
  REVERSAL: 'Correction',
}

const kindLabel = (kind) =>
  KIND_LABELS[kind] || String(kind || '').toLowerCase().replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

// The size of an entry is the total of its debit side.
const entryAmount = (entry) =>
  entry.lines.reduce((sum, l) => (l.amountCents > 0 ? sum + l.amountCents : sum), 0) / 100

// Books: the group's tamper-evident record of every money movement. Read-only
// for every member; entries can only be added by the money flows themselves.
export default function Books({ stokvelId }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [balances, setBalances] = useState(null)
  const [entries, setEntries] = useState([])
  const [nextBefore, setNextBefore] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [checking, setChecking] = useState(false)
  const [check, setCheck] = useState(null)
  const [openId, setOpenId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api(`/api/stokvels/${stokvelId}/ledger?limit=25`, accessToken)
      setBalances(data.balances || {})
      setEntries(data.entries || [])
      setNextBefore(data.entries?.length >= 25 ? data.nextBefore : null)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [stokvelId, accessToken, showToast])

  useEffect(() => { load() }, [load])

  const loadMore = async () => {
    if (!nextBefore) return
    setLoadingMore(true)
    try {
      const data = await api(`/api/stokvels/${stokvelId}/ledger?limit=25&before=${nextBefore}`, accessToken)
      setEntries((prev) => [...prev, ...(data.entries || [])])
      setNextBefore(data.entries?.length >= 25 ? data.nextBefore : null)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoadingMore(false)
    }
  }

  const verify = async () => {
    setChecking(true)
    try {
      setCheck(await api(`/api/stokvels/${stokvelId}/ledger/verify`, accessToken))
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setChecking(false)
    }
  }

  if (loading) {
    return <div className="space-y-2"><Skeleton className="h-32 w-full" /><Skeleton className="h-16 w-full" /></div>
  }

  const rows = SUMMARY
    .map((s) => {
      const cents = balances?.[s.account]?.cents ?? 0
      return { ...s, value: (s.flip ? -cents : cents) / 100, hasData: cents !== 0 }
    })
    .filter((r) => r.hasData || r.account === 'BANK')

  return (
    <div className="space-y-4">
      <div className="bg-white border-2 border-terracotta/20 rounded-soft p-4">
        <p className="text-xs font-black uppercase text-ink-muted mb-1">The group's books</p>
        {rows.map((r) => (
          <div key={r.account} className="flex justify-between text-sm py-1">
            <span className="text-ink-muted">{r.label}</span>
            <span className="font-bold text-ink">{money(r.value)}</span>
          </div>
        ))}
        <p className="text-[11px] text-ink-muted mt-2 leading-relaxed">
          These records are written automatically when money is confirmed. Nobody can edit or delete them. A mistake is fixed by adding a visible correction.
        </p>
      </div>

      <div className="bg-white border-2 border-terracotta/20 rounded-soft p-4 space-y-2">
        <button type="button" onClick={verify} disabled={checking} className={`w-full py-2 ${secondaryBtn}`}>
          {checking ? 'Checking...' : 'Check the books have not been changed'}
        </button>
        {check && (
          <p className={`text-sm font-bold ${check.ok ? 'text-sage-700' : 'text-terracotta'}`}>
            {check.ok
              ? `All ${check.checked} entries check out.${check.complete ? '' : ' Only the first part of a very long record was checked.'}`
              : `A problem was found at entry ${check.brokenAtSeq}. Tell your officials straight away.`}
          </p>
        )}
      </div>

      {entries.length === 0 ? (
        <SubEmpty icon="file" title="No entries yet" description="Once contributions, loans or payouts are confirmed, they appear here." />
      ) : (
        <div className="bg-white border-2 border-terracotta/20 rounded-soft divide-y divide-cream-dark">
          {entries.map((e) => (
            <button key={e.id} type="button" onClick={() => setOpenId(openId === e.id ? null : e.id)}
              className="w-full text-left px-4 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink truncate">#{e.seq} · {kindLabel(e.kind)}</p>
                  <p className="text-[11px] text-ink-muted truncate">{fmtDate(e.createdAt)}{e.memo ? ` · ${e.memo}` : ''}</p>
                </div>
                <p className="text-sm font-bold text-ink flex-shrink-0">{money(entryAmount(e))}</p>
              </div>
              {openId === e.id && (
                <div className="mt-2 bg-cream/60 rounded-xl p-2 space-y-1">
                  {e.lines.map((l, i) => (
                    <div key={i} className="flex justify-between text-[11px]">
                      <span className="text-ink-muted">{SUMMARY.find((s) => s.account === l.account)?.label || l.account}</span>
                      <span className="font-bold text-ink">{l.amountCents > 0 ? 'In ' : 'Out '}{money(Math.abs(l.amountCents) / 100)}</span>
                    </div>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {nextBefore && (
        <button type="button" onClick={loadMore} disabled={loadingMore} className={`w-full py-2.5 ${primaryBtn}`}>
          {loadingMore ? 'Loading...' : 'Show older entries'}
        </button>
      )}
    </div>
  )
}
