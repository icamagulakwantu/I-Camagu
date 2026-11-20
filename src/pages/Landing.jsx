import { useEffect, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { CEREMONY_IMAGE } from '../data/ceremonyImages.js'
import { CAMPAIGN_SOURCE_STORAGE_KEY as SRC_KEY, cleanCampaignSource } from '../../shared/campaignSource.js'

/**
 * Public page shown before sign-in. It should feel like the morning of an
 * umgidi: proud, loud and full of family, and say plainly what i-Camagu does
 * for that day. No invented testimonials or numbers.
 * ?src= is stored once on first touch for campaign attribution.
 * Keep the no-custody claim disabled until the server-side policy is independently verified.
 */
const NO_CUSTODY_LIVE = false

// The celebrations people come to i-Camagu to plan, in the words they use.
const CELEBRATIONS = [
  {
    // Ulwaluko and umgidi are planned as one: from the mountain to the homecoming.
    key: 'ulwaluko-umgidi',
    icon: 'drum',
    image: CEREMONY_IMAGE.UMGIDI,
    name: 'Ulwaluko & Umgidi',
    tag: 'His journey to manhood',
    line: 'From the mountain to the homecoming: one plan, with a guide for his mother.',
    needs: ['Verified ingcibi', 'Building the ibhoma', 'Umgidi feast', 'Ubukrwala'],
  },
  {
    key: 'wedding',
    icon: 'heartHandshake',
    image: CEREMONY_IMAGE.WEDDING,
    name: 'Umtshato',
    tag: 'Your wedding',
    line: 'From ukucela and lobola to umdudo, the day two families become one.',
    needs: ['Lobola', 'Umdudo', 'Catering', 'Guest list'],
  },
]

const MORE_CEREMONIES = ['Imbeleko', 'Intonjane', 'Intambo Enkulu', 'Inkobe zikaMama', 'Ukubuyisa', 'Umsebenzi weGqirha', 'Ukukhapha']

// The i-Camagu journey: every pillar, in the order a family lives it, ending
// in what is kept forever.
const JOURNEY = [
  { icon: 'users', step: 'Isiduko', title: 'Find your clan', body: 'Your iziduko and izinqulo, the people who share your bloodline, and your clan where you live.' },
  { icon: 'clipboard', step: 'Isicwangciso', title: 'Plan the ceremony', body: 'Every step with a date to aim for, the budget and the roles, from ulwaluko and umgidi to a wedding.' },
  { icon: 'heartHandshake', step: 'Isithembiso', title: 'The family pledges', body: 'One link to the family group. Relatives at home and abroad pledge, and suggest what you forgot.' },
  { icon: 'coins', step: 'Umgalelo', title: 'Save together', body: 'Your stokvel with a constitution, minutes and books every member can see.' },
  { icon: 'cart', step: 'Thenga kunye', title: 'Buy together with SmartMatch', body: 'SmartMatch puts orders from families and stokvels near you into one big order at bulk prices, then divides it and delivers or you collect nearby.' },
  { icon: 'drum', step: 'Umhla', title: 'The day itself', body: 'Everything ticked, everyone in their place, the umqombothi brewed to the guest count.' },
  { icon: 'image', step: 'Inkumbulo', title: 'Remembered forever', body: 'The ukugida book of who brought what, and the family archive of photos and records. Never lost.' },
]


// What the Shrine Fund stands for, from the Ubuhlanti page itself.
const FUND_POINTS = [
  { icon: 'sprout', title: 'Owned by the people', body: 'The Shrine belongs to the Xhosa nation at large, to advance it. Pledge from R1.' },
  { icon: 'landmark', title: 'A share and a return', body: 'Some things the Shrine owns outright. In businesses it backs, it holds an agreed share and earns a return.' },
  { icon: 'users', title: 'Decided by us', body: 'Projects need majority support and a clear return for the community.' },
]

// Dark card: the photo fades into the card, and a small gold badge with the
// ceremony's icon sits on the seam between photo and text.
function CelebrationCard({ item }) {
  return (
    <article className="relative w-[78%] max-w-[300px] flex-shrink-0 snap-start overflow-hidden rounded-[26px] bg-[#1f3320] shadow-[0_24px_48px_-24px_rgba(28,22,18,0.7)]">
      <div className="relative h-52">
        <img src={item.image} alt="" className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1f3320] via-[#1f3320]/25 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-cream/95 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#6f655a]">
          {item.tag}
        </span>
        <h3 className="absolute bottom-3 left-4 right-16 font-display text-[1.5rem] font-semibold leading-[1.05] text-cream">{item.name}</h3>
      </div>
      <span
        aria-hidden="true"
        className="absolute right-4 top-[11.5rem] flex h-11 w-11 items-center justify-center rounded-full bg-ochre-light ring-4 ring-[#1f3320]"
      >
        <Icon name={item.icon} size={19} color="#1f3320" />
      </span>
      <div className="px-4 pb-4 pt-3">
        <span aria-hidden="true" className="block h-px w-10 bg-ochre-light/70" />
        <p className="mt-3 text-[14px] leading-snug text-cream/90">{item.line}</p>
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={`What ${item.name} needs`}>
          {item.needs.map((n) => (
            <li key={n} className="rounded-full border border-cream/25 px-2.5 py-1 text-[11px] font-bold text-cream/80">{n}</li>
          ))}
        </ul>
      </div>
    </article>
  )
}

// Public clan search: anyone can find their clan and its praise names before
// joining. The server returns clan names and praises only, never people.
function ClanFinder({ onJoin }) {
  const [query, setQuery] = useState('')
  const [state, setState] = useState({ status: 'idle', results: [] })
  const trimmed = query.trim()

  useEffect(() => {
    if (trimmed.length < 2) { setState({ status: 'idle', results: [] }); return undefined }
    let cancelled = false
    setState((current) => ({ ...current, status: 'loading' }))
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/iziduko/public/clans?${new URLSearchParams({ q: trimmed, limit: '6' })}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Search failed')
        if (!cancelled) setState({ status: 'ready', results: data.results || [], suggestions: Boolean(data.suggestions) })
      } catch {
        if (!cancelled) setState({ status: 'error', results: [] })
      }
    }, 280)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [trimmed])

  return (
    <div className="mt-6">
      <label className="relative block">
        <span className="sr-only">Search your clan name</span>
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
          <Icon name="search" size={18} color="#6b645a" />
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type your clan, e.g. Cirha, MamTshawe, Jola"
          className="h-14 w-full rounded-[18px] border-0 bg-cream pl-11 pr-4 text-[15px] text-ink shadow-[0_14px_30px_-18px_rgba(0,0,0,0.6)] focus:outline-none focus:ring-2 focus:ring-ochre-light"
        />
      </label>
      <div aria-live="polite" className="mt-3 space-y-2">
        {state.status === 'loading' && <p className="text-sm text-cream/75">Searching the clans…</p>}
        {state.status === 'error' && <p className="text-sm text-cream/85">The clan search could not load. Try again in a moment.</p>}
        {state.status === 'ready' && state.results.length === 0 && (
          <p className="text-sm text-cream/85">
            We could not find &ldquo;{trimmed}&rdquo; yet. Join and add it: every clan belongs here, and the community helps confirm it.
          </p>
        )}
        {state.status === 'ready' && state.suggestions && state.results.length > 0 && (
          <p className="text-sm text-cream/85">Did you mean one of these?</p>
        )}
        {state.results.map((clan) => (
          <div key={clan.id} className="flex items-start gap-3 rounded-[18px] bg-white/[0.08] p-3.5">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-ochre-light font-display text-lg font-semibold text-[#1f3320]">
              {clan.head.replace(/^Ama/, '').charAt(0)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-lg font-semibold leading-tight text-cream">{clan.head}{clan.female && <span className="ml-1.5 font-sans text-xs font-semibold text-cream/60">· {clan.female}</span>}</span>
              {clan.praises?.length > 0 && <span className="mt-0.5 block text-[13px] leading-snug text-cream/80">{clan.praises.join(' · ')}</span>}
            </span>
          </div>
        ))}
        {state.results.length > 0 && (
          <p className="text-xs text-cream/65">Praise names come from community sources and can differ between families.</p>
        )}
        {state.results.length > 0 && (
          <button
            type="button"
            onClick={onJoin}
            className="pressable mt-2 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-cream text-[15px] font-extrabold text-[#1f3320]"
          >
            Join and find your clan family <Icon name="arrowRight" size={16} color="#1f3320" />
          </button>
        )}
      </div>
    </div>
  )
}

// What clan matching does, in plain words.
const CLAN_POINTS = [
  { icon: 'search', title: 'Find your clan and its praises', body: 'Search your isiduko and see it with its izinqulo, the praise names that carry your ancestors.' },
  { icon: 'users', title: 'Find your bloodline', body: 'Members of your clan share one root ancestor, even if he lived eight generations ago. i-Camagu brings that family back together.' },
  { icon: 'mapPin', title: 'Your clan, where you live', body: 'AmaCirha in Gqeberha, AmaZangwa in Joburg or London: see your clan near you and start clan groups together.' },
]

export default function Landing({ onJoin, onSignIn }) {
  const [inviteType, setInviteType] = useState(null)

  useEffect(() => {
    try {
      if (localStorage.getItem('icamagu_join_stokvel_id')) setInviteType('stokvel')
      else if (localStorage.getItem('icamagu_join_clan_code')) setInviteType('clan')
      else if (localStorage.getItem('icamagu_join_pool_id')) setInviteType('pool')
      else if (localStorage.getItem('icamagu_template_invite')) setInviteType('template')
    } catch { /* storage unavailable */ }
  }, [])

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const src = cleanCampaignSource(params.get('src'))
      if (src && !localStorage.getItem(SRC_KEY)) {
        localStorage.setItem(SRC_KEY, src)
      }
    } catch {
      /* ignore */
    }
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden bg-cream text-ink">
      {/* —— Hero: light and warm, like a celebration morning; the photos live in the cards below —— */}
      <header className="relative overflow-hidden bg-gradient-to-b from-[#fbf3e8] to-cream">

        <div className="relative z-10 mx-auto flex max-w-lg flex-col px-5 pb-32 pt-6">
          <div className="flex items-center justify-between">
            <img src="/images/brand/logo-horizontal.png" alt="i-Camagu" width="132" height="55" className="h-[52px] w-auto" />
            <button
              type="button"
              onClick={onSignIn}
              className="pressable rounded-full border border-ink/15 bg-white/70 px-4 py-2 text-sm font-bold text-ink"
            >
              Sign in
            </button>
          </div>

          <div className="mt-12">
            {inviteType && (
              <div className="mb-6 rounded-2xl border border-terracotta/25 bg-white/80 px-4 py-3 text-sm leading-relaxed text-ink">
                {inviteType === 'stokvel' && 'You have been invited to join a stokvel on i-Camagu. Join free to continue with your invitation.'}
                {inviteType === 'clan' && 'You have been invited to a family clan group on i-Camagu. Join free to continue with your invitation.'}
                {inviteType === 'template' && 'You have been invited to help plan a ceremony on i-Camagu. Join free or sign in, then ask to edit the plan.'}
                {inviteType === 'pool' && 'You have been invited to a SmartMatch group order on i-Camagu. Join free to continue with your invitation.'}
              </div>
            )}
            <p className="text-[12px] font-extrabold uppercase tracking-[0.2em] text-[#6f655a]">Siyavuya · We celebrate</p>
            <h1 className="mt-3 font-display text-[2.6rem] font-semibold leading-[1.02] text-ink text-balance">
              Celebrate like a nation.{' '}
              <span className="italic text-[#2e4a2e]">Plan like a family.</span>
            </h1>
            <p className="mt-4 max-w-md text-[16px] leading-relaxed text-ink-light">
              Your son&rsquo;s umgidi. Your wedding. Every ceremony that makes us amaXhosa, planned with
              structure, funded together and celebrated with family at home and across the world.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onJoin}
                className="pressable min-h-[52px] rounded-full bg-terracotta px-7 text-[16px] font-bold text-white shadow-[0_14px_32px_-10px_rgba(196,92,38,0.95)]"
              >
                Start planning, free →
              </button>
              <a
                href="#clan"
                className="pressable flex min-h-[52px] items-center justify-center gap-2 rounded-full border-2 border-[#2e4a2e]/25 bg-white/70 px-7 text-[16px] font-bold text-[#2e4a2e]"
              >
                <Icon name="search" size={17} color="#2e4a2e" /> Find your clan
              </a>
              <a href="#journey" className="pressable flex min-h-[44px] items-center justify-center gap-1.5 text-[15px] font-bold text-[#2e4a2e] sm:min-h-[52px]">
                See the whole journey <Icon name="arrowDown" size={16} color="#2e4a2e" />
              </a>
            </div>
            <p className="mt-3 text-xs text-ink-muted">Free to join · Works on slow data · Install from your browser</p>
          </div>
        </div>
      </header>

      {/* —— The celebrations, rising out of the hero —— */}
      <section aria-labelledby="celebrate-heading" className="relative z-20 -mt-24">
        <h2 id="celebrate-heading" className="sr-only">Ceremonies you can plan</h2>
        <div className="no-scrollbar flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-5 pb-10">
          {CELEBRATIONS.map((c) => <CelebrationCard key={c.key} item={c} />)}
        </div>
        <div className="mx-auto -mt-5 max-w-lg px-5">
          <p className="text-[13px] leading-relaxed text-ink-muted">
            And <span className="font-bold text-ink">{MORE_CEREMONIES.join(', ')}</span>: each with its own plan.
          </p>
        </div>
      </section>

      {/* —— Clan: the foundation. A traditional social network under one kingdom —— */}
      <section id="clan" aria-labelledby="clan-heading" className="mx-auto max-w-lg scroll-mt-6 px-5 pt-10">
        <div className="relative overflow-hidden rounded-[30px] bg-[#2e4a2e] px-6 pb-7 pt-8 text-cream shadow-[0_28px_56px_-28px_rgba(31,51,32,0.9)]">
          <p className="relative text-[12px] font-extrabold uppercase tracking-[0.2em] text-cream/60">Isiduko sakho · Your clan</p>
          <h2 id="clan-heading" className="relative mt-2 font-display text-[2.1rem] font-semibold leading-[1.05] text-balance">
            Your clan is your <span className="italic text-ochre-light">first family.</span>
          </h2>
          <p className="relative mt-3 text-[15px] leading-relaxed text-cream/90">
            A clan network, not just a social network. Every clan, under one kingdom: the Xhosa nation we come from and belong to.
          </p>
          <div className="relative">
            <ClanFinder onJoin={onJoin} />
          </div>
          <ul className="relative mt-6 space-y-2">
            {CLAN_POINTS.map((point) => (
              <li key={point.title} className="flex items-start gap-3 rounded-[18px] border border-cream/10 bg-white/[0.06] p-3.5">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-ochre-light/20">
                  <Icon name={point.icon} size={17} color="#e0a94e" />
                </span>
                <span>
                  <span className="block text-[14px] font-bold leading-tight text-cream">{point.title}</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-cream/75">{point.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* —— The journey: every pillar, one path —— */}
      <section id="journey" aria-labelledby="journey-heading" className="mx-auto max-w-lg scroll-mt-6 px-5 pt-12">
        <p className="eyebrow text-[#6f655a]">Uhambo · The journey</p>
        <h2 id="journey-heading" className="mt-1 font-display text-[1.9rem] font-semibold leading-tight text-ink text-balance">
          From your clan to the day, and kept forever.
        </h2>
        <ol className="relative mt-7 space-y-4 pl-7">
          <span aria-hidden="true" className="absolute bottom-8 left-[26px] top-6 w-[3px] rounded-full bg-[#2e4a2e]/20" />
          {JOURNEY.map((j, i) => (
            <li key={j.title} className="relative rounded-[22px] border border-ink/[0.06] bg-white py-4 pl-11 pr-4 shadow-soft">
              <span
                aria-hidden="true"
                className="absolute -left-5 top-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2e4a2e] text-white shadow-[0_10px_20px_-10px_rgba(28,22,18,0.6)] ring-4 ring-cream"
              >
                <Icon name={j.icon} size={20} color="#ffffff" />
              </span>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#6f655a]">{i + 1} · {j.step}</p>
              <h3 className="mt-0.5 text-[16px] font-bold text-ink">{j.title}</h3>
              <p className="mt-1 text-[14px] leading-snug text-ink-muted">{j.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* —— Pride —— */}
      <section aria-labelledby="pride-heading" className="mx-auto max-w-lg px-5 pt-14">
        <div className="relative overflow-hidden rounded-[30px] border border-ink/[0.06] bg-white px-6 pb-7 pt-8 text-ink shadow-soft">
          <p className="relative text-[12px] font-extrabold uppercase tracking-[0.2em] text-[#6f655a]">Siyazingca</p>
          <h2 id="pride-heading" className="relative mt-2 font-display text-[2.1rem] font-semibold leading-[1.05] text-balance">
            We are proud of who we are.
          </h2>
          <p className="relative mt-3 text-[15px] leading-relaxed text-ink-light">
            Learn the rites from the elders who know them, the kings and heroes who carried our name, and the
            reasons behind every ceremony. Then pass it on to the young ones.
          </p>
          <div className="relative mt-6 rounded-[22px] bg-cream p-4 text-ink">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#6f655a]">Did you know</p>
            <p className="mt-1 text-[14px] leading-snug">
              Laduma Ngxokolo first made his MaXhosa knitwear for <span className="font-bold">amakrwala</span>,
              young men home from ulwaluko. Today the world wears it.
            </p>
          </div>
        </div>
      </section>

      {/* —— Ubuhlanti: the Shrine Fund —— */}
      <section aria-labelledby="fund-heading" className="mx-auto max-w-lg px-5 pt-14">
        <div className="relative overflow-hidden rounded-[30px] bg-[#efe6d8] text-ink">
          <div className="relative px-6 pb-7 pt-8">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.2em] text-[#6f655a]">Ubuhlanti bakwaXhosa · The Shrine Fund</p>
            <h2 id="fund-heading" className="mt-2 font-display text-[2.1rem] font-semibold leading-[1.04] text-balance">
              Together we can build greatness.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-light">
              Every rand we spend on our ceremonies can help build our own wealth. The Shrine Fund is our
              nation&rsquo;s seed capital: open to all, public in its books, and invested in businesses we own,
              so our money stays in our communities for longer.
            </p>
            <ul className="mt-6 space-y-2">
              {FUND_POINTS.map((p) => (
                <li key={p.title} className="flex items-start gap-3 rounded-[18px] bg-white p-3.5">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#2e4a2e]/10">
                    <Icon name={p.icon} size={17} color="#2e4a2e" />
                  </span>
                  <span>
                    <span className="block text-[14px] font-bold leading-tight text-ink">{p.title}</span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-ink-muted">{p.body}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-5 font-display text-lg italic text-[#2e4a2e]">Sakha isizwe. We are building a nation.</p>
          </div>
        </div>
      </section>

      {/* —— Trust —— */}
      <section aria-labelledby="trust-heading" className="mx-auto max-w-lg space-y-3 px-5 pt-10">
        <h2 id="trust-heading" className="sr-only">Trust</h2>
        <div className="flex gap-3.5 rounded-[22px] border border-ink/[0.06] bg-white px-5 py-4 shadow-soft">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#2e4a2e]/10" aria-hidden>
            <Icon name="shieldCheck" size={19} color="#2e4a2e" />
          </span>
          <div>
            <p className="text-[15px] font-bold text-ink">Only verified ingcibi</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
              i-Camagu is the trust source. An ingcibi&rsquo;s contact details are only shared once they are verified.
              If yours is not in the app, choose one who is.
            </p>
          </div>
        </div>
        <div className="flex gap-3.5 rounded-[22px] border border-ink/[0.06] bg-white px-5 py-4 shadow-soft">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-sage/10" aria-hidden>
            <Icon name="lock" size={18} color="#2e4a2e" />
          </span>
          <div>
            <p className="text-[15px] font-bold text-ink">
              {NO_CUSTODY_LIVE ? 'Your money stays yours' : 'You pay people directly'}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
              {NO_CUSTODY_LIVE
                ? 'i-Camagu never holds, pools or transfers your funds. You pay the merchant or the person you are giving to directly, and we keep the record.'
                : 'You pay the merchant or the person you are giving to directly. i-Camagu keeps the record, so the books stay clear for everyone.'}
            </p>
          </div>
        </div>
      </section>

      {/* —— Final call —— */}
      <section className="mx-auto max-w-lg px-5 pb-14 pt-10">
        <div className="relative overflow-hidden rounded-[30px] bg-[#1f3320] px-6 pb-7 pt-9 text-center text-cream">
          <div className="relative">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.2em] text-cream/60">Masiqale</p>
            <p className="mt-2 font-display text-[1.9rem] font-semibold leading-tight text-balance">
              What are we celebrating next?
            </p>
            <button
              type="button"
              onClick={onJoin}
              className="pressable mt-6 min-h-[52px] w-full rounded-full bg-terracotta px-6 text-[16px] font-bold text-white"
            >
              Start planning, free →
            </button>
            <button type="button" onClick={onSignIn} className="mt-4 text-sm font-bold text-cream/85 underline-offset-2 hover:underline">
              Already a member? Sign in
            </button>
          </div>
        </div>
        <img src="/images/brand/logo-stacked.png" alt="i-Camagu" loading="lazy" className="mx-auto mt-10 h-40 w-auto" />
        <p className="mt-4 text-center font-display text-base italic text-ink">Umntu ngumntu ngabantu</p>
        <p className="mt-1 text-center text-xs text-ink-muted">i-camagu.co.za · Made in South Africa, for amaXhosa everywhere</p>
      </section>
    </div>
  )
}
