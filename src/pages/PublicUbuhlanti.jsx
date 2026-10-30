import { useState, useEffect } from 'react'

// Public, no-login view of Ubuhlanti bakwa Xhosa, reached at /ubuhlanti.
// The fund is meant to be open to everyone — not only iCamagu members — so
// this page renders outside the authenticated app and talks to the public
// shrine-fund endpoints. Same honest copy as the in-app screen: no live
// payment gateway exists yet, so a donation here records a pledge and a
// person follows up to complete the real transfer.
const money = (n) =>
  `R${Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const pressable =
  'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none'

function PublicUbuhlanti() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState('')
  const [donorName, setDonorName] = useState('')
  const [donorEmail, setDonorEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const fetchTotal = () => {
    fetch('/api/stokvels/shrine-fund/total')
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }

  useEffect(fetchTotal, [])

  const submitDonation = async (e) => {
    e.preventDefault()
    const numericAmount = parseFloat(amount)
    if (!numericAmount || numericAmount < 1) {
      setFeedback({ type: 'error', message: 'Donations start from R1.' })
      return
    }
    setSubmitting(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/stokvels/shrine-fund/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numericAmount,
          donorName: donorName || undefined,
          donorEmail: donorEmail || undefined,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Could not record your donation')
      setFeedback({ type: 'success', message: result.message })
      setAmount('')
      setDonorName('')
      setDonorEmail('')
      fetchTotal()
    } catch (err) {
      setFeedback({ type: 'error', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream pb-16">
      <div className="bg-gradient-to-br from-terracotta to-brand-ochre text-white px-5 pt-12 pb-10 rounded-b-[2.5rem] relative overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-64 h-64 bg-white/10 rounded-full" />
        <div className="relative max-w-xl mx-auto">
          <h1 className="font-display font-bold text-3xl leading-tight">Ubuhlanti bakwa Xhosa</h1>
          <p className="text-white/85 text-sm font-bold mt-1.5">
            Our Community Shrine &amp; Development Fund
          </p>
          <p className="text-white/80 text-sm mt-2 leading-relaxed">
            Rooted in Xhosa tradition, open to every family in our communities. Built together, one
            voluntary contribution at a time — visible to everyone, owned by no one alone.
          </p>
        </div>
      </div>

      <div className="px-4 -mt-6 max-w-xl mx-auto">
        <div className="bg-white border-2 border-terracotta/25 rounded-soft p-6 shadow-card text-center">
          {loading ? (
            <div className="h-12 w-48 mx-auto bg-cream-dark/50 rounded animate-pulse" />
          ) : (
            <>
              <p className="text-[11px] font-black uppercase tracking-widest text-ink-muted mb-1">
                Total raised, all-time
              </p>
              <p className="font-display font-extrabold text-4xl text-terracotta">
                {money(data?.totalAmount || 0)}
              </p>
            </>
          )}
        </div>

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
                      <p className="font-display font-bold text-sm text-ink whitespace-nowrap">
                        {money(row.amount)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-terracotta/10">
                  <p className="text-xs font-bold text-ink-muted">Still uncommitted</p>
                  <p className="font-display font-bold text-sm text-terracotta">
                    {money(data.liquidReserve || 0)}
                  </p>
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

        <form
          onSubmit={submitDonation}
          className="bg-white border-2 border-terracotta/25 rounded-soft p-5 shadow-soft mt-4 space-y-2.5"
        >
          <p className="text-sm font-bold text-ink">Donate to the fund</p>
          <input
            type="number"
            min="1"
            step="any"
            placeholder="Amount (ZAR) — R1 or more"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
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
            We don't yet have a live payment gateway or bank details on file — submitting this
            records your pledge, and someone from iCamagu will personally follow up to complete the
            transfer.
          </p>
          {feedback && (
            <p
              className={`text-xs font-bold leading-relaxed ${
                feedback.type === 'success' ? 'text-sage-600' : 'text-terracotta'
              }`}
            >
              {feedback.message}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className={`w-full bg-ink text-white font-bold py-3 rounded-pill ${pressable}`}
          >
            {submitting ? 'Submitting...' : 'Pledge this donation'}
          </button>
        </form>

        <div className="bg-white border border-terracotta/15 rounded-soft p-4 mt-4">
          <p className="text-xs font-black uppercase text-ink-muted mb-2">What this is</p>
          <p className="text-sm text-ink leading-relaxed">
            This is not a fee — it is the seed capital of our communities, a sacred sanctuary in the
            spirit of a homestead kraal, and long-term investment in agricultural research,
            fisheries, and livestock economies of scale across the Eastern Cape's arable land and
            coastline that no single family or stokvel could build alone. Its roots are Xhosa; its
            gate is open to every family who lives among us.
          </p>
          <p className="text-sm text-ink leading-relaxed mt-2">
            Every contribution is voluntary: a stokvel member may choose to add a suggested share
            when they request their own payout, or anyone can donate directly from R1 upward.
            iCamagu also commits a share of its own platform profit to the fund as it grows.
          </p>
          <p className="text-sm text-ink leading-relaxed mt-2">
            What the fund builds next is decided by the community, not by iCamagu alone — put to a
            majority vote, with a standing committee drawn from churches, Amaqhirha and Amaxhwele
            (traditional healers), and community leaders, visionaries, thinkers, and academics
            weighing each opportunity.
          </p>
          <p className="text-sm text-ink font-bold leading-relaxed mt-2">
            A fund built by the people, protected by the cloud, and dedicated to the advancement of
            our communities for generations to come.
          </p>
          <p className="text-[11px] text-ink-muted mt-3 italic">
            The exact governance process and how the fund is eventually deployed are still being
            finalised — this page will grow more detailed as those decisions are made.
          </p>
        </div>

        <p className="text-center text-xs text-ink-muted mt-6">
          <a href="/" className="font-bold text-terracotta underline">
            Open iCamagu
          </a>
        </p>
      </div>
    </div>
  )
}

export default PublicUbuhlanti
