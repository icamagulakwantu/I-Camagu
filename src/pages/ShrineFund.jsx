import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import Icon from '../components/Icon.jsx'

const money = (n) => `R${Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none'

// Copy note: the fund is rooted in Xhosa tradition but open to every family
// living in our communities (Sotho, Zulu, Coloured and others in P.E. and
// beyond), so ownership wording says "local community", never one nation.
const PHASES = [
  {
    icon: 'store',
    accent: '#c45c26',
    phase: 'Phase 1 — Township & Rural Economy',
    headline: 'Keep the rand circulating in our communities.',
    body: 'We start where the money already flows daily. Spaza shops, taverns, car washes, garages, school uniform manufacturing, and community banks. These are businesses our communities spend money in every single day — yet the profits leave. The fund takes a 40% community stake in these businesses, with 60% remaining in the hands of local owners from our own communities. Our rand stays home longer before it leaves.',
  },
  {
    icon: 'calendarRange',
    accent: '#c1922f',
    phase: 'Phase 2 — Food & Secondary Industries',
    headline: 'Own the food value chain.',
    body: 'From township food access to farming, processing, and distribution. Every community deserves nutritious food at fair prices. We model what schools in Japan have shown the world — that when children eat well, communities thrive. We move into food production, packaging, and local supply networks, targeting the Eastern Cape and beyond.',
  },
  {
    icon: 'coins',
    accent: '#4a7a4a',
    phase: 'Phase 3 — Primary Industries & Legacy',
    headline: 'Mining, property, and large-scale community investment.',
    body: "Once the foundation is solid, the fund moves into primary industries — mining, agriculture, fisheries, property, and livestock economies of scale across the Eastern Cape's arable land and coastline. No single family or stokvel could build this alone. Together, we can.",
  },
]

const PILLARS = [
  { icon: 'shield', label: 'Safety & Security', desc: 'Community-employed private security to combat extortion and crime in our streets.' },
  { icon: 'bookOpen', label: 'Libraries & Education', desc: 'Community libraries where knowledge is free and every child has a place to study.' },
  { icon: 'users', label: 'Parks, Gyms & Playgrounds', desc: 'Healthy, beautiful spaces — trees, playgrounds, gyms, and weekend activities that keep communities united.' },
  { icon: 'heart', label: 'Nutrition & Food Access', desc: 'Ensuring every household has access to healthy, nutritious food starting from public schools outward.' },
]

function ShrineFund({ onBack }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [donateOpen, setDonateOpen] = useState(false)
  const [donateAmount, setDonateAmount] = useState('')
  const [donorName, setDonorName] = useState('')
  const [donorEmail, setDonorEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchTotal = () => {
    setLoadFailed(false)
    fetch('/api/stokvels/shrine-fund/total', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(async (res) => {
        if (!res.ok) throw new Error('Could not load fund total')
        return res.json()
      })
      .then((d) => setData(d))
      .catch(() => { setData(null); setLoadFailed(true) })
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
    // Solid cream background + isolate prevents hero gradient from bleeding
    // over whatever page was rendered underneath this one
    <div className="relative isolate min-h-screen pb-24" style={{ backgroundColor: '#f7f2eb' }}>

      {/* Hero — explicit solid bg so it never bleeds through */}
      <div className="relative" style={{ background: 'linear-gradient(135deg, #c45c26 0%, #a34a1e 100%)' }}>
        <div className="px-5 pt-12 pb-10">
          <button type="button" onClick={onBack} className="text-sm text-white/80 mb-3 flex items-center gap-1.5">
            <Icon name="arrowRight" size={14} color="#ffffff" className="rotate-180" /> Back
          </button>
          <div className="flex items-center gap-2.5 mb-3">
            <Icon name="flame" size={26} color="#ffffff" strokeWidth={1.5} />
            <h1 className="font-display font-bold text-3xl leading-tight text-white">Ubuhlanti bakwa Xhosa</h1>
          </div>
          <p className="text-white/90 text-sm font-bold">Our Community Shrine &amp; Development Fund</p>
          <p className="text-white/75 text-sm mt-2 leading-relaxed">
            A community-owned investment fund, rooted in Xhosa tradition and open to every family in our communities. It starts at grass roots — township and rural economies — and grows into a legacy for generations to come.
          </p>
        </div>
      </div>

      <div className="px-4 -mt-6 space-y-4">

        {/* Fund total */}
        <div className="bg-white border-2 border-terracotta/25 rounded-soft p-6 shadow-card text-center">
          {loading ? (
            <Skeleton className="h-12 w-48 mx-auto" />
          ) : loadFailed ? (
            <>
              <p className="text-sm text-ink-muted">Could not load the fund total — not R0, just not loaded yet.</p>
              <button type="button" onClick={fetchTotal} className="text-xs font-bold text-terracotta mt-2 underline">Try again</button>
            </>
          ) : (
            <>
              <p className="text-[11px] font-black uppercase tracking-widest text-ink-muted mb-1">Total raised, all-time</p>
              <p className="font-display font-extrabold text-4xl text-terracotta">{money(data?.totalAmount || 0)}</p>
            </>
          )}
        </div>

        {!loading && !loadFailed && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white border border-terracotta/15 rounded-soft p-3 text-center">
              <p className="font-display font-bold text-lg text-ink">{data?.payoutContributionCount || 0}</p>
              <p className="text-[9px] font-bold text-ink-muted uppercase tracking-wide mt-0.5 leading-tight">Payout contributions</p>
            </div>
            <div className="bg-white border border-terracotta/15 rounded-soft p-3 text-center">
              <p className="font-display font-bold text-lg text-ink">{data?.donationCount || 0}</p>
              <p className="text-[9px] font-bold text-ink-muted uppercase tracking-wide mt-0.5 leading-tight">Public donations</p>
            </div>
            <div className="bg-white border border-terracotta/15 rounded-soft p-3 text-center">
              <p className="font-display font-bold text-lg text-ink">{data?.suggestedRate ? `${(data.suggestedRate * 100).toFixed(0)}%` : '3%'}</p>
              <p className="text-[9px] font-bold text-ink-muted uppercase tracking-wide mt-0.5 leading-tight">Suggested contribution rate</p>
            </div>
          </div>
        )}

        {/* Allocations */}
        {!loading && !loadFailed && (
          <div className="bg-white border border-terracotta/15 rounded-soft p-4">
            <p className="text-[11px] font-black uppercase tracking-widest text-ink-muted mb-2">Where the fund has been invested</p>
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
                Nothing has been committed out of the fund yet. Every allocation will be listed here with what it funded, as it happens.
              </p>
            )}
          </div>
        )}

        {/* Donate button */}
        <button
          type="button"
          onClick={() => setDonateOpen((v) => !v)}
          className={`w-full font-bold py-3.5 rounded-pill flex items-center justify-center gap-2 text-white ${pressable}`}
          style={{ background: 'linear-gradient(135deg, #c45c26 0%, #a34a1e 100%)' }}
        >
          <Icon name="heart" size={17} color="#fff" /> {donateOpen ? 'Cancel' : 'Donate — from R1'}
        </button>

        {donateOpen && (
          <form onSubmit={submitDonation} className="bg-white border-2 border-terracotta/25 rounded-soft p-5 space-y-2.5">
            <input type="number" min="1" step="any" placeholder="Amount (ZAR) — R1 or more" value={donateAmount} onChange={(e) => setDonateAmount(e.target.value)}
              className="w-full h-12 border-2 border-cream-dark rounded-soft px-4 text-sm focus:outline-none focus:border-terracotta" required />
            <input type="text" placeholder="Your name (optional — you may stay anonymous)" value={donorName} onChange={(e) => setDonorName(e.target.value)}
              className="w-full h-12 border-2 border-cream-dark rounded-soft px-4 text-sm focus:outline-none focus:border-terracotta" />
            <input type="email" placeholder="Email (optional, so we can follow up)" value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)}
              className="w-full h-12 border-2 border-cream-dark rounded-soft px-4 text-sm focus:outline-none focus:border-terracotta" />
            <p className="text-[11px] text-ink-muted leading-relaxed">
              We don't yet have a live payment gateway — submitting this records your pledge, and someone from iCamagu will personally follow up to complete the transfer.
            </p>
            <button type="submit" disabled={submitting} className={`w-full bg-ink text-white font-bold py-3 rounded-pill ${pressable}`}>
              {submitting ? 'Submitting...' : 'Pledge this donation'}
            </button>
          </form>
        )}

        {/* What this is */}
        <div className="bg-white border border-terracotta/15 rounded-soft p-5">
          <p className="eyebrow text-ink-muted mb-3">What this is</p>
          <p className="text-sm text-ink leading-relaxed">
            This is not a fee. It is the seed capital of our communities — a long-term, community-owned investment fund dedicated to building economies that keep our rand circulating within our communities for longer before it leaves.
          </p>
          <p className="text-sm text-ink leading-relaxed mt-3">
            Ubuhlanti — the homestead kraal — comes from Xhosa tradition, but its gate is open to every family who lives, works and celebrates in our communities, whatever their own customs.
          </p>
          <p className="text-sm text-ink leading-relaxed mt-3">
            Every contribution is voluntary: a stokvel member may choose to add a suggested share when they request their own payout, or anyone can donate directly from R1 upward. iCamagu also commits a share of its own platform profit to the fund as it grows.
          </p>
          <p className="text-sm font-bold text-ink leading-relaxed mt-3">
            A fund built by the people, protected by the cloud, and dedicated to the advancement of our communities for generations to come.
          </p>
        </div>

        {/* Governance */}
        <div className="bg-white border border-terracotta/15 rounded-soft p-5">
          <p className="eyebrow text-ink-muted mb-3">How it is governed</p>
          <p className="text-sm text-ink leading-relaxed">
            What the fund builds is decided by the community — not by iCamagu alone. A standing committee is drawn from the structures where our communities already gather: imibutho, schools, community organisations, local social media pages, and WhatsApp groups that represent real neighbourhoods.
          </p>
          <p className="text-sm text-ink leading-relaxed mt-3">
            Committee members are selected on merit and willingness to serve — not through elections that can be manipulated. Projects put to the community must pass two tests: they must have majority support, and they must be demonstrably profitable or carry a clear, measurable impact milestone that benefits the broader community.
          </p>
          <div className="bg-terracotta/5 border border-terracotta/20 rounded-2xl px-4 py-3 mt-4">
            <p className="text-xs font-bold text-terracotta mb-1">The 60/40 ownership model</p>
            <p className="text-xs text-ink-muted leading-relaxed">
              Every business the fund invests in is 60% privately owned and 40% community-owned — and the private owners must come from the communities the business serves. Profit stays local. Ownership stays local. Community wealth grows with every business that succeeds.
            </p>
          </div>
        </div>

        {/* Roadmap */}
        <div>
          <p className="eyebrow text-ink-muted px-1 mb-3">Where we invest — the roadmap</p>
          <div className="space-y-3">
            {PHASES.map((p) => (
              <div key={p.phase} className="bg-white border border-terracotta/15 rounded-soft p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: p.accent + '18' }}>
                    <Icon name={p.icon} size={18} color={p.accent} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: p.accent }}>{p.phase}</p>
                    <p className="font-bold text-sm text-ink leading-snug">{p.headline}</p>
                    <p className="text-xs text-ink-muted leading-relaxed mt-1.5">{p.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pillars */}
        <div>
          <p className="eyebrow text-ink-muted px-1 mb-3">What we are building in our communities</p>
          <div className="grid grid-cols-2 gap-3">
            {PILLARS.map((p) => (
              <div key={p.label} className="bg-white border border-sage-200 rounded-soft p-3.5">
                <div className="w-8 h-8 rounded-xl bg-sage-50 flex items-center justify-center mb-2">
                  <Icon name={p.icon} size={16} color="#4a7a4a" />
                </div>
                <p className="font-bold text-xs text-ink leading-snug">{p.label}</p>
                <p className="text-[10px] text-ink-muted leading-relaxed mt-1">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Inspiration */}
        <div className="bg-white border border-terracotta/15 rounded-soft p-5">
          <p className="eyebrow text-ink-muted mb-3">Standing on shoulders</p>
          <p className="text-sm text-ink leading-relaxed">
            This fund draws inspiration from models that have already changed lives. The Seminole Tribe of Florida built sovereign economic power through community-owned enterprise. The Grameen Bank proved that communities lending to themselves — without traditional collateral — can eliminate poverty at scale. Japan's public school meal programmes showed the world that community nutrition is a policy choice, not a luxury.
          </p>
          <p className="text-sm text-ink leading-relaxed mt-3">
            We are not reinventing the wheel. We are taking what works, rooting it in the values of ubuntu that our communities share, and building it here — starting in our townships and rural areas, growing into every community that is ready to build together.
          </p>
        </div>

        {/* Disclaimer */}
        <div className="pb-4">
          <p className="text-[11px] text-ink-muted italic leading-relaxed">
            The exact governance process and how the fund is eventually deployed are still being finalised — this page will grow more detailed as those decisions are made.
          </p>
        </div>
      </div>
    </div>
  )
}

export default ShrineFund
