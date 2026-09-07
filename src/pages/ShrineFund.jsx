import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import Icon from '../components/Icon.jsx'

const money = (n) => `R${Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none'

function ShrineFund({ onBack }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [donateOpen, setDonateOpen] = useState(false)
  const [donateAmount, setDonateAmount] = useState('')
  const [donorName, setDonorName] = useState('')
  const [donorEmail, setDonorEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchTotal = () => {
    fetch('/api/stokvels/shrine-fund/total', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }

  useEffect(fetchTotal, [accessToken])

  const submitDonation = async (e) => {
    e.preventDefault()
    const amount = parseFloat(donateAmount)
    if (!amount || amount < 1) {
      showToast('Donations start from R1', 'error')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/stokvels/shrine-fund/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ amount, donorName: donorName || undefined, donorEmail: donorEmail || undefined }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Could not record donation')
      showToast(result.message, 'success')
      setDonateOpen(false)
      setDonateAmount('')
      setDonorName('')
      setDonorEmail('')
      fetchTotal()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen pb-24 bg-cream">
      <div className="bg-gradient-to-br from-terracotta to-brand-ochre text-white px-5 pt-12 pb-10 rounded-b-[2.5rem] relative overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-64 h-64 bg-white/10 rounded-full" />
        <div className="relative">
          <button type="button" onClick={onBack} className="text-sm text-white/80 mb-3 flex items-center gap-1.5">
            <Icon name="arrowRight" size={14} color="#ffffff" className="rotate-180" /> Back
          </button>
          <div className="flex items-center gap-2.5">
            <Icon name="flame" size={26} color="#ffffff" strokeWidth={1.5} />
            <h1 className="font-display font-bold text-3xl leading-tight">Ubuhlanti bakwa Xhosa</h1>
          </div>
          <p className="text-white/85 text-sm font-bold mt-1.5">The Sovereign Xhosa Shrine &amp; Development Fund</p>
          <p className="text-white/80 text-sm mt-2 leading-relaxed">
            Built together, one voluntary contribution at a time — visible to everyone, owned by no one alone.
          </p>
        </div>
      </div>

      <div className="px-4 -mt-6">
        <div className="bg-white border-2 border-terracotta/25 rounded-soft p-6 shadow-card text-center">
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
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="bg-white border border-terracotta/15 rounded-soft p-3 text-center">
              <p className="font-display font-bold text-lg text-ink">{data?.payoutContributionCount || 0}</p>
              <p className="text-[9px] font-bold text-ink-muted uppercase tracking-wide mt-0.5 leading-tight">Payout contributions</p>
            </div>
            <div className="bg-white border border-terracotta/15 rounded-soft p-3 text-center">
              <p className="font-display font-bold text-lg text-ink">{data?.donationCount || 0}</p>
              <p className="text-[9px] font-bold text-ink-muted uppercase tracking-wide mt-0.5 leading-tight">Public donations</p>
            </div>
            <div className="bg-white border border-terracotta/15 rounded-soft p-3 text-center">
              <p className="font-display font-bold text-lg text-ink">{data?.suggestedRate ? `${(data.suggestedRate * 100).toFixed(0)}%` : '—'}</p>
              <p className="text-[9px] font-bold text-ink-muted uppercase tracking-wide mt-0.5 leading-tight">Suggested contribution rate</p>
            </div>
          </div>
        )}

        {/* Where the fund's money has actually gone. Only real, recorded
            allocations appear — until then this says so plainly rather than
            showing a row of zeros that looks like activity. */}
        {!loading && (
          <div className="bg-white border border-terracotta/15 rounded-soft p-4 mt-4">
            <p className="text-[11px] font-black uppercase tracking-widest text-ink-muted mb-2">
              Where the fund has been invested
            </p>
            {data?.allocationsBySector?.length ? (
              <>
                <div className="space-y-2">
                  {data.allocationsBySector.map((row) => (
                    <div key={row.sector} className="flex items-center justify-between gap-3">
                      <p className="text-sm text-ink">{row.label}</p>
                      <p className="font-display font-bold text-sm text-ink whitespace-nowrap">{money(row.amount)}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-terracotta/10">
                  <p className="text-xs font-bold text-ink-muted">Still uncommitted</p>
                  <p className="font-display font-bold text-sm text-terracotta">{money(data.liquidReserve || 0)}</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-muted leading-relaxed">
                Nothing has been committed out of the fund yet. Every allocation will be listed here
                with what it funded, as it happens.
              </p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setDonateOpen((v) => !v)}
          className={`w-full mt-4 bg-terracotta text-white font-bold py-3.5 rounded-pill shadow-glow flex items-center justify-center gap-2 ${pressable}`}
        >
          <Icon name="heart" size={17} color="#fff" /> {donateOpen ? 'Cancel' : 'Donate — from R1'}
        </button>

        {donateOpen && (
          <form onSubmit={submitDonation} className="bg-white border-2 border-terracotta/25 rounded-soft p-5 shadow-soft mt-3 space-y-2.5">
            <input
              type="number"
              min="1"
              step="any"
              placeholder="Amount (ZAR) — R1 or more"
              value={donateAmount}
              onChange={(e) => setDonateAmount(e.target.value)}
              className="w-full h-12 border-2 border-cream-dark rounded-soft px-4 text-sm focus:outline-none focus:border-terracotta"
              required
            />
            <input
              type="text"
              placeholder="Your name (optional — you may stay anonymous)"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              className="w-full h-12 border-2 border-cream-dark rounded-soft px-4 text-sm focus:outline-none focus:border-terracotta"
            />
            <input
              type="email"
              placeholder="Email (optional, so we can follow up)"
              value={donorEmail}
              onChange={(e) => setDonorEmail(e.target.value)}
              className="w-full h-12 border-2 border-cream-dark rounded-soft px-4 text-sm focus:outline-none focus:border-terracotta"
            />
            <p className="text-[11px] text-ink-muted leading-relaxed">
              We don't yet have a live payment gateway or bank details on file — submitting this records your
              pledge, and someone from iCamagu will personally follow up to complete the transfer.
            </p>
            <button
              type="submit"
              disabled={submitting}
              className={`w-full bg-ink text-white font-bold py-3 rounded-pill ${pressable}`}
            >
              {submitting ? 'Submitting...' : 'Pledge this donation'}
            </button>
          </form>
        )}

        <div className="bg-white border border-terracotta/15 rounded-soft p-4 mt-4">
          <p className="text-xs font-black uppercase text-ink-muted mb-2">What this is</p>
          <p className="text-sm text-ink leading-relaxed">
            This is not a fee — it is the sovereign seed capital of the Xhosa nation, a sacred sanctuary in the
            spirit of a homestead kraal, and long-term investment in agricultural research, fisheries, and
            livestock economies of scale across the Eastern Cape's arable land and coastline that no single
            family or stokvel could build alone.
          </p>
          <p className="text-sm text-ink leading-relaxed mt-2">
            Every contribution is voluntary: a stokvel member may choose to add a suggested share when they
            request their own payout, or anyone can donate directly from R1 upward. iCamagu also commits a
            share of its own platform profit to the fund as it grows.
          </p>
          <p className="text-sm text-ink leading-relaxed mt-2">
            What the fund builds next is decided by the community, not by iCamagu alone — put to a majority
            vote, with a standing committee drawn from churches, Amaqhirha and Amaxhwele (traditional healers),
            and community leaders, visionaries, thinkers, and academics weighing each opportunity.
          </p>
          <p className="text-sm text-ink font-bold leading-relaxed mt-2">
            A fund built by the people, protected by the cloud, and dedicated to the advancement of the Xhosa
            nation for generations to come.
          </p>
          <p className="text-[11px] text-ink-muted mt-3 italic">
            The exact governance process and how the fund is eventually deployed are still being finalised —
            this page will grow more detailed as those decisions are made.
          </p>
        </div>
      </div>
    </div>
  )
}

export default ShrineFund
