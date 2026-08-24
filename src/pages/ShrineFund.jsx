import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import Icon from '../components/Icon.jsx'

const money = (n) => `R${Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function ShrineFund({ onBack }) {
  const { accessToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch('/api/stokvels/shrine-fund/total', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [accessToken])

  return (
    <div className="min-h-screen pb-24 bg-cream">
      <div className="bg-gradient-to-br from-terracotta to-brand-ochre text-white px-5 pt-12 pb-10 rounded-b-[2.5rem] relative overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-64 h-64 bg-white/10 rounded-full" />
        <div className="relative">
          <button type="button" onClick={onBack} className="text-sm text-white/80 mb-3 flex items-center gap-1.5">
            <Icon name="arrowRight" size={14} color="#ffffff" className="rotate-180" /> Back
          </button>
          <p className="text-xs font-black uppercase tracking-widest text-white/80 mb-1">Ubuhlanti bakwa Xhosa</p>
          <div className="flex items-center gap-2.5">
            <Icon name="flame" size={26} color="#ffffff" strokeWidth={1.5} />
            <h1 className="font-display font-bold text-2xl">Shrine Fund</h1>
          </div>
          <p className="text-white/80 text-sm mt-2 leading-relaxed">
            Built together, one stokvel payout at a time — visible to everyone, owned by no one alone.
          </p>
        </div>
      </div>

      <div className="px-4 -mt-6">
        <div className="bg-white border-2 border-ink rounded-soft p-6 shadow-card text-center">
          {loading ? (
            <Skeleton className="h-12 w-48 mx-auto" />
          ) : (
            <>
              <p className="text-[11px] font-black uppercase tracking-widest text-ink-muted mb-1">Total raised, all-time</p>
              <p className="font-display font-extrabold text-4xl text-terracotta">{money(data?.totalAmount || 0)}</p>
            </>
          )}
        </div>

        {!loading && (
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-white border border-ink/15 rounded-soft p-4 text-center">
              <p className="font-display font-bold text-xl text-ink">{data?.contributionCount || 0}</p>
              <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wide mt-0.5">Payouts contributed</p>
            </div>
            <div className="bg-white border border-ink/15 rounded-soft p-4 text-center">
              <p className="font-display font-bold text-xl text-ink">{data?.rate ? `${(data.rate * 100).toFixed(0)}%` : '—'}</p>
              <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wide mt-0.5">Current tithe rate</p>
            </div>
          </div>
        )}

        <div className="bg-white border border-ink/15 rounded-soft p-4 mt-4">
          <p className="text-xs font-black uppercase text-ink-muted mb-2">What this is</p>
          <p className="text-sm text-ink leading-relaxed">
            Every time a stokvel payout clears, a small, itemised tithe is set aside into this shared fund —
            shown transparently to the person receiving that payout, and added here for everyone to see. It's
            the seed of something bigger than any one stokvel: capital the community builds collectively,
            for what the community decides to build together next.
          </p>
          <p className="text-[11px] text-ink-muted mt-3 italic">
            The exact tithe rate and how the fund is eventually used are still being finalised — this page will
            grow more detailed as those decisions are made.
          </p>
        </div>
      </div>
    </div>
  )
}

export default ShrineFund
