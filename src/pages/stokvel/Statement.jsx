import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import { pressable, inp, money, fmtDate, api } from './shared.js'

const today = () => new Date().toISOString().slice(0, 10)
const startOfYear = () => `${new Date().getFullYear()}-01-01`

// Quote a CSV cell so commas and quotes in names do not break the columns.
const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`

// Statement: a ledger of every confirmed money movement in a date range
// (contributions, payouts, fines paid, loans and repayments) with a running
// total. Members can download it as a spreadsheet or print it.
export default function Statement({ stokvelId, stokvelName }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [from, setFrom] = useState(startOfYear())
  const [to, setTo] = useState(today())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await api(`/api/stokvels/${stokvelId}/statement?from=${from}&to=${to}`, accessToken))
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [stokvelId, from, to, accessToken, showToast])

  useEffect(() => { load() }, [load])

  const downloadCsv = () => {
    if (!data) return
    const rows = [
      ['Date', 'Type', 'Member', 'Amount (R)', 'Running total (R)'],
      ...data.entries.map((e) => [fmtDate(e.date), e.type, e.who, e.amount.toFixed(2), e.running.toFixed(2)]),
    ]
    // Leading BOM so Excel opens the file as UTF-8.
    const csv = '\uFEFF' + rows.map((r) => r.map(cell).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${(stokvelName || 'stokvel').replace(/[^a-z0-9]+/gi, '-')}-statement-${from}-to-${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totals = data?.totals
  const summary = totals ? [
    { label: 'Contributions in', value: totals.contributions },
    { label: 'Payouts out', value: totals.payouts },
    { label: 'Fines paid in', value: totals.fines },
    { label: 'Loans issued', value: totals.loansIssued },
    { label: 'Loan repayments', value: totals.repayments },
  ] : []

  return (
    <div className="space-y-4">
      <div className="bg-white border-2 border-terracotta/25 rounded-soft p-4 space-y-3">
        <p className="text-xs font-black uppercase text-ink-muted">Statement period</p>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-ink-muted">From
            <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={`${inp} mt-1`} />
          </label>
          <label className="text-xs text-ink-muted">To
            <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={`${inp} mt-1`} />
          </label>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={downloadCsv} disabled={!data?.entries?.length}
            className={`flex-1 bg-terracotta text-white font-bold py-2 rounded-pill text-sm ${pressable}`}>
            Download spreadsheet
          </button>
          <button type="button" onClick={() => window.print()} disabled={!data?.entries?.length}
            className={`flex-1 border-2 border-terracotta/25 font-bold py-2 rounded-pill text-sm ${pressable}`}>
            Print
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2"><Skeleton className="h-32 w-full" /><Skeleton className="h-16 w-full" /></div>
      ) : !data ? null : (
        <>
          <div className="bg-white border border-terracotta/15 rounded-soft p-4">
            {summary.map((s) => (
              <div key={s.label} className="flex justify-between text-sm py-1">
                <span className="text-ink-muted">{s.label}</span>
                <span className={`font-bold ${s.value < 0 ? 'text-terracotta' : 'text-ink'}`}>{money(s.value)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm pt-2 mt-1 border-t border-cream-dark">
              <span className="font-bold text-ink">Net for period</span>
              <span className="font-display font-bold text-lg text-ink">{money(totals.net)}</span>
            </div>
          </div>

          {data.entries.length === 0 ? (
            <p className="text-sm text-ink-muted text-center py-6">No confirmed transactions in this period.</p>
          ) : (
            <div className="bg-white border border-terracotta/15 rounded-soft divide-y divide-cream-dark">
              {data.entries.map((e, i) => (
                <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink truncate">{e.type} · {e.who}</p>
                    <p className="text-[11px] text-ink-muted">{fmtDate(e.date)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${e.amount < 0 ? 'text-terracotta' : 'text-sage-700'}`}>
                      {e.amount < 0 ? '-' : '+'}{money(Math.abs(e.amount))}
                    </p>
                    <p className="text-[10px] text-ink-muted">{money(e.running)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
