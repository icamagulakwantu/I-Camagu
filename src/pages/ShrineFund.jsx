import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import Icon from '../components/Icon.jsx'
import { CEREMONY_IMAGE } from '../data/ceremonyImages.js'

const money = (n) => `R${Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none'

// Copy note: the fund is rooted in Xhosa tradition but open to every family
// living in our communities (Sotho, Zulu, Coloured and others in P.E. and
// beyond), so ownership wording says "local community", never one nation.
const PHASES = [
  {
    icon: 'store',
    accent: '#a3471a',
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
    accent: '#2e4a2e',
    phase: 'Phase 3 — Primary Industries & Legacy',
    headline: 'Mining, property, and large-scale community investment.',
    body: "Once the foundation is solid, the fund moves into primary industries — mining, agriculture, fisheries, property, and livestock economies of scale across the Eastern Cape's arable land and coastline. No single family or stokvel could build this alone. Together, we can.",
  },
]

const PILLARS = [
  { icon: 'shieldCheck', label: 'Safety & Security', desc: 'Community-employed private security to combat extortion and crime in our streets.' },
  { icon: 'book', label: 'Libraries & Education', desc: 'Community libraries where knowledge is free and every child has a place to study.' },
  { icon: 'sprout', label: 'Parks, Gyms & Playgrounds', desc: 'Healthy, beautiful spaces — trees, playgrounds, gyms, and weekend activities that keep communities united.' },
  { icon: 'wheat', label: 'Nutrition & Food Access', desc: 'Ensuring every household has access to healthy, nutritious food starting from public schools outward.' },
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

  const field = 'w-full h-12 rounded-2xl border border-ink/10 bg-cream px-4 text-sm focus:border-terracotta focus:outline-none'

  return (
    <div className="relative isolate mx-auto min-h-screen max-w-md bg-cream pb-28">
      {/* Hero: the homestead at dusk, and what this fund is for. */}
      <header className="relative overflow-hidden bg-[#1f3320] px-5 pb-24 pt-6 text-cream">
        <img src={CEREMONY_IMAGE.ULWALUKO} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1f3320]/50 via-[#1f3320]/40 to-[#1f3320]" />
        <div className="relative">
          <button type="button" onClick={onBack} className="pressable mb-8 flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5 text-sm font-bold text-cream backdrop-blur-sm">
            <Icon name="arrowLeft" size={14} color="#fffdf9" /> Back
          </button>
          <p className="text-[12px] font-extrabold uppercase tracking-[0.2em] text-ochre-light">Ubuhlanti bakwaXhosa · Shrine Fund</p>
          <h1 className="mt-2 font-display text-[2.4rem] font-semibold leading-[1.02] text-balance">
            Together we build <span className="italic text-ochre-light">greatness.</span>
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-cream/90">
            Our community&rsquo;s own investment fund. Rooted in Xhosa tradition, open to every family in our
            communities, and built to keep our rand at home and turn it into businesses we own.
          </p>
        </div>
      </header>

      <div className="relative z-10 -mt-16 space-y-5 px-4">
        {/* Total raised: rises out of the hero */}
        <section aria-label="Fund total" className="rounded-[26px] bg-white p-5 shadow-[0_22px_44px_-22px_rgba(28,22,18,0.55)]">
          {loading ? (
            <Skeleton className="mx-auto h-12 w-48" />
          ) : loadFailed ? (
            <div className="text-center">
              <p className="text-sm text-ink-muted">Could not load the fund total. Not R0, just not loaded yet.</p>
              <button type="button" onClick={fetchTotal} className="mt-2 text-xs font-bold text-terracotta-dark underline">Try again</button>
            </div>
          ) : (
            <>
              <p className="eyebrow">Raised together, all-time</p>
              <p className="mt-1 font-display text-[2.6rem] font-semibold leading-none text-terracotta-dark">{money(data?.totalAmount || 0)}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-ink/[0.06] pt-4">
                {[
                  [data?.payoutContributionCount || 0, 'From stokvel payouts'],
                  [data?.donationCount || 0, 'Public donations'],
                  [data?.suggestedRate ? `${(data.suggestedRate * 100).toFixed(0)}%` : '3%', 'Suggested share'],
                ].map(([value, label]) => (
                  <div key={label}>
                    <p className="font-display text-xl font-semibold text-ink">{value}</p>
                    <p className="mt-0.5 text-[11px] font-bold leading-tight text-ink-muted">{label}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          <button
            type="button"
            onClick={() => setDonateOpen((v) => !v)}
            className={`mt-5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full font-bold ${donateOpen ? 'bg-cream-dark text-ink' : 'bg-terracotta text-white shadow-terracotta'} ${pressable}`}
          >
            {donateOpen ? 'Cancel' : <><Icon name="heart" size={17} color="#fff" /> Pledge to the fund, from R1</>}
          </button>

          {donateOpen && (
            <form onSubmit={submitDonation} className="mt-4 space-y-2.5">
              <input type="number" min="1" step="any" placeholder="Amount (ZAR), R1 or more" value={donateAmount} onChange={(e) => setDonateAmount(e.target.value)} className={field} required />
              <input type="text" placeholder="Your name (optional, you may stay anonymous)" value={donorName} onChange={(e) => setDonorName(e.target.value)} className={field} />
              <input type="email" placeholder="Email (optional, so we can follow up)" value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)} className={field} />
              <p className="text-xs leading-relaxed text-ink-muted">
                We don&rsquo;t yet have a live payment gateway. Submitting records your pledge, and someone from iCamagu will personally follow up to complete the transfer.
              </p>
              <button type="submit" disabled={submitting} className={`w-full rounded-full bg-[#1f3320] py-3.5 font-bold text-white ${pressable}`}>
                {submitting ? 'Submitting...' : 'Pledge this donation'}
              </button>
            </form>
          )}
        </section>

        {/* Where it has gone */}
        {!loading && !loadFailed && (
          <section className="rounded-[22px] border border-ink/[0.06] bg-white p-4 shadow-soft">
            <p className="eyebrow mb-2">Where the fund has been invested</p>
            {data?.allocationsBySector?.length ? (
              <>
                <div className="space-y-2">
                  {data.allocationsBySector.map((row) => (
                    <div key={row.sector} className="flex items-center justify-between gap-3">
                      <p className="text-sm text-ink">{row.label}</p>
                      <p className="whitespace-nowrap font-display text-sm font-semibold text-ink">{money(row.amount)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-ink/[0.06] pt-3">
                  <p className="text-xs font-bold text-ink-muted">Still uncommitted</p>
                  <p className="font-display text-sm font-semibold text-terracotta-dark">{money(data.liquidReserve || 0)}</p>
                </div>
              </>
            ) : (
              <p className="text-sm leading-relaxed text-ink-muted">
                Nothing has been committed out of the fund yet. Every allocation will be listed here with what it funded, as it happens.
              </p>
            )}
          </section>
        )}

        {/* What this is */}
        <section className="relative overflow-hidden rounded-[28px] bg-terracotta-dark p-6 text-cream">
          <span aria-hidden="true" className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-ochre-light/20" />
          <p className="relative text-[12px] font-extrabold uppercase tracking-[0.2em] text-ochre-light">Asiyo ntlawulo · Not a fee</p>
          <h2 className="relative mt-2 font-display text-[1.7rem] font-semibold leading-tight">The seed capital of our communities.</h2>
          <p className="relative mt-3 text-[14px] leading-relaxed text-cream/90">
            A long-term, community-owned investment fund dedicated to building economies that keep our rand circulating within our communities for longer before it leaves.
          </p>
          <p className="relative mt-3 text-[14px] leading-relaxed text-cream/90">
            Ubuhlanti, the homestead kraal, comes from Xhosa tradition, but its gate is open to every family who lives, works and celebrates in our communities, whatever their own customs.
          </p>
          <p className="relative mt-3 text-[14px] leading-relaxed text-cream/90">
            Every contribution is voluntary: a stokvel member may choose to add a suggested share when they request their own payout, or anyone can donate directly from R1 upward. iCamagu also commits a share of its own platform profit to the fund as it grows.
          </p>
          <p className="relative mt-4 font-display text-lg italic text-ochre-light">
            Built by the people, for the advancement of our communities for generations to come.
          </p>
        </section>

        {/* Governance */}
        <section className="rounded-[26px] border border-ink/[0.06] bg-white p-5 shadow-soft">
          <p className="eyebrow text-sage">Decided by us</p>
          <h2 className="mt-1 font-display text-[1.45rem] font-semibold leading-tight text-ink">How it is governed</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink">
            What the fund builds is decided by the community, not by iCamagu alone. A standing committee is drawn from the structures where our communities already gather: imibutho, schools, community organisations, local social media pages, and WhatsApp groups that represent real neighbourhoods.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink">
            Committee members are selected on merit and willingness to serve, not through elections that can be manipulated. Projects put to the community must pass two tests: they must have majority support, and they must be demonstrably profitable or carry a clear, measurable impact milestone that benefits the broader community.
          </p>
          <div className="relative mt-5 rounded-[20px] bg-[#1f3320] p-4 pt-5 text-cream">
            <div className="flex items-end gap-3">
              <p className="font-display text-[2.2rem] font-semibold leading-none text-ochre-light">60<span className="text-cream/50">/</span>40</p>
              <p className="pb-1 text-[12px] font-extrabold uppercase tracking-[0.14em] text-cream/80">Ownership model</p>
            </div>
            <div className="mt-3 flex h-2.5 overflow-hidden rounded-full" aria-hidden="true">
              <span className="w-[60%] bg-cream/80" />
              <span className="w-[40%] bg-ochre-light" />
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-cream/85">
              Every business the fund invests in is 60% privately owned and 40% community-owned, and the private owners must come from the communities the business serves. Profit stays local. Ownership stays local.
            </p>
          </div>
        </section>

        {/* Roadmap: one journey, three phases */}
        <section>
          <p className="eyebrow px-1">Indlela · The road ahead</p>
          <h2 className="mt-1 px-1 font-display text-[1.6rem] font-semibold leading-tight text-ink">From the spaza to the mine.</h2>
          <ol className="relative mt-5 space-y-4 pl-6">
            <span aria-hidden="true" className="absolute bottom-6 left-[21px] top-6 w-[3px] rounded-full bg-gradient-to-b from-terracotta-dark via-ochre to-sage" />
            {PHASES.map((ph) => (
              <li key={ph.phase} className="relative rounded-[22px] border border-ink/[0.06] bg-white py-4 pl-9 pr-4 shadow-soft">
                <span
                  aria-hidden="true"
                  className="absolute -left-5 top-4 flex h-10 w-10 items-center justify-center rounded-2xl ring-4 ring-cream"
                  style={{ backgroundColor: ph.accent }}
                >
                  <Icon name={ph.icon} size={18} color="#ffffff" />
                </span>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: ph.accent }}>{ph.phase}</p>
                <p className="mt-1 text-[15px] font-bold leading-snug text-ink">{ph.headline}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{ph.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Pillars */}
        <section className="rounded-[28px] bg-sage p-3 pb-3.5">
          <div className="px-2 pb-4 pt-2 text-cream">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-cream/70">What we are building</p>
            <h2 className="mt-0.5 font-display text-[1.45rem] font-semibold leading-tight">Communities we are proud of</h2>
          </div>
          <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 pt-3">
            {PILLARS.map((pl) => (
              <div key={pl.label} className="relative rounded-[20px] bg-cream px-3.5 pb-3.5 pt-8">
                <span aria-hidden="true" className="absolute -top-4 left-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white" style={{ boxShadow: '0 0 0 4px #2e4a2e' }}>
                  <Icon name={pl.icon} size={19} color="#2e4a2e" />
                </span>
                <p className="text-[14px] font-bold leading-tight text-ink">{pl.label}</p>
                <p className="mt-1 text-[12px] leading-snug text-ink-muted">{pl.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Inspiration */}
        <section className="rounded-[26px] border border-ink/[0.06] bg-white p-5 shadow-soft">
          <p className="eyebrow">Standing on shoulders</p>
          <p className="mt-3 text-sm leading-relaxed text-ink">
            This fund draws inspiration from models that have already changed lives. The Seminole Tribe of Florida built sovereign economic power through community-owned enterprise. The Grameen Bank proved that communities lending to themselves, without traditional collateral, can eliminate poverty at scale. Japan&rsquo;s public school meal programmes showed the world that community nutrition is a policy choice, not a luxury.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink">
            We are not reinventing the wheel. We are taking what works, rooting it in the values of ubuntu that our communities share, and building it here, starting in our townships and rural areas and growing into every community that is ready to build together.
          </p>
        </section>

        <p className="px-1 pb-4 text-xs italic leading-relaxed text-ink-muted">
          The exact governance process and how the fund is eventually deployed are still being finalised. This page will grow more detailed as those decisions are made.
        </p>
      </div>
    </div>
  )
}

export default ShrineFund
