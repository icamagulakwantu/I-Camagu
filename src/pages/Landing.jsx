import { useEffect, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { CEREMONY_IMAGE } from '../data/ceremonyImages.js'
import { CAMPAIGN_SOURCE_STORAGE_KEY as SRC_KEY, cleanCampaignSource } from '../../shared/campaignSource.js'

/**
 * Public page shown before sign-in. It should feel like the morning of an
 * umgidi: proud, loud and full of family, and say plainly what iCamagu does
 * for that day. No invented testimonials or numbers.
 * ?src= is stored once on first touch for campaign attribution.
 * Keep the no-custody claim disabled until the server-side policy is independently verified.
 */
const NO_CUSTODY_LIVE = false

// The celebrations people come to iCamagu to plan, in the words they use.
const CELEBRATIONS = [
  {
    key: 'umgidi',
    image: CEREMONY_IMAGE.UMGIDI,
    name: 'Umgidi',
    tag: 'His homecoming',
    line: 'Your son comes home a man. Welcome him with the whole clan.',
    needs: ['Sheep & cattle', 'Umqombothi', 'Drinks', 'New clothes'],
  },
  {
    key: 'wedding',
    image: CEREMONY_IMAGE.WEDDING,
    name: 'Umtshato',
    tag: 'Your wedding',
    line: 'From lobola talks to the day two families become one.',
    needs: ['Lobola', 'Izibizo gifts', 'Catering', 'Guest list'],
  },
  {
    key: 'ulwaluko',
    image: CEREMONY_IMAGE.ULWALUKO,
    name: 'Ulwaluko',
    tag: 'Guidance for mothers',
    line: 'Step-by-step guidance for a mother preparing her son, from a verified ingcibi to his return.',
    needs: ['Verified ingcibi', 'Before the mountain', 'Mountain phase', 'His return'],
  },
]

const MORE_CEREMONIES = ['Intambo Enkulu', 'Inkobe zikaMama', 'Ukubuyisa', 'Umsebenzi weGqirha', 'Ukukhapha']

// What each part of the app is for, said plainly.
const FLOW = [
  {
    icon: 'clipboard',
    color: '#a3471a',
    title: 'A clear plan for every ceremony',
    body: 'Each ceremony comes with its steps, roles, timeline and budget, so it is done properly, with dignity, and the same way every time.',
  },
  {
    icon: 'heartHandshake',
    color: '#b88a2c',
    title: 'Family pledges in one place',
    body: 'Share one link. Relatives at home and abroad pledge what they will bring or give, and you can see what is covered and what is still needed.',
  },
  {
    icon: 'cart',
    color: '#2e4a2e',
    title: 'Buy together for better prices',
    body: 'Families and stokvels pool their orders for drinks, meat, livestock and groceries, and unlock bulk discounts no single household gets.',
  },
  {
    icon: 'coins',
    color: '#3d5a80',
    title: 'Stokvels that run properly',
    body: 'Group savings with simple systems: a ledger every member can see, approvals, and every contribution, payout and loan interest recorded.',
  },
]

// What the Shrine Fund stands for, from the Ubuhlanti page itself.
const FUND_POINTS = [
  { icon: 'sprout', title: 'Owned by us', body: 'A community-owned investment fund. Pledge from R1.' },
  { icon: 'landmark', title: '60 / 40', body: 'Every business it backs is 40% community-owned, run by people from the community.' },
  { icon: 'users', title: 'Decided by us', body: 'Projects need majority support and a clear return for the community.' },
]

function CelebrationCard({ item }) {
  return (
    <article className="relative w-[78%] max-w-[300px] flex-shrink-0 snap-start overflow-hidden rounded-[26px] bg-[#1c1612] shadow-[0_24px_48px_-24px_rgba(28,22,18,0.7)]">
      <div className="relative h-56">
        <img src={item.image} alt="" className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1c1612] via-[#1c1612]/30 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-cream/95 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-terracotta-dark">
          {item.tag}
        </span>
        <div className="absolute inset-x-4 bottom-3">
          <h3 className="font-display text-[1.7rem] font-semibold leading-none text-cream">{item.name}</h3>
        </div>
      </div>
      <div className="px-4 pb-4 pt-2">
        <p className="text-[14px] leading-snug text-cream/90">{item.line}</p>
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={`What ${item.name} needs`}>
          {item.needs.map((n) => (
            <li key={n} className="rounded-full border border-ochre-light/35 px-2.5 py-1 text-[11px] font-bold text-ochre-light">{n}</li>
          ))}
        </ul>
      </div>
    </article>
  )
}

export default function Landing({ onJoin, onSignIn }) {
  const [inviteType, setInviteType] = useState(null)

  useEffect(() => {
    try {
      if (localStorage.getItem('icamagu_join_stokvel_id')) setInviteType('stokvel')
      else if (localStorage.getItem('icamagu_join_clan_code')) setInviteType('clan')
      else if (localStorage.getItem('icamagu_join_pool_id')) setInviteType('pool')
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
      {/* —— Hero: clean type on a warm dark ground; the photos live in the cards below —— */}
      <header className="relative overflow-hidden bg-[#1c1612]">
        <div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-terracotta-dark/50 blur-2xl" />
        <div aria-hidden="true" className="absolute -left-20 top-1/2 h-60 w-60 rounded-full bg-ochre/20 blur-2xl" />

        <div className="relative z-10 mx-auto flex max-w-lg flex-col px-5 pb-32 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src="/icons/source/gateway-mark-1024.png" alt="" width="40" height="40" className="h-10 w-10" />
              <p className="font-display text-xl font-semibold tracking-tight text-cream">iCamagu</p>
            </div>
            <button
              type="button"
              onClick={onSignIn}
              className="pressable rounded-full border border-cream/40 bg-black/20 px-4 py-2 text-sm font-bold text-cream backdrop-blur-sm"
            >
              Sign in
            </button>
          </div>

          <div className="mt-12">
            {inviteType && (
              <div className="mb-6 rounded-2xl border border-ochre-light/40 bg-white/[0.06] px-4 py-3 text-sm leading-relaxed text-cream">
                {inviteType === 'stokvel' && 'You have been invited to join a stokvel on iCamagu. Join free to continue with your invitation.'}
                {inviteType === 'clan' && 'You have been invited to a family clan group on iCamagu. Join free to continue with your invitation.'}
                {inviteType === 'pool' && 'You have been invited to a SmartMatch group order on iCamagu. Join free to continue with your invitation.'}
              </div>
            )}
            <p className="text-[12px] font-extrabold uppercase tracking-[0.2em] text-ochre-light">Siyavuya · We celebrate</p>
            <h1 className="mt-3 font-display text-[2.6rem] font-semibold leading-[1.02] text-cream text-balance">
              Celebrate like a nation.{' '}
              <span className="italic text-ochre-light">Plan like a family.</span>
            </h1>
            <p className="mt-4 max-w-md text-[16px] leading-relaxed text-cream/90">
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
            </div>
            <p className="mt-3 text-xs text-cream/70">Free to join · Works on slow data · Install from your browser</p>
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

      {/* —— How the day comes together —— */}
      <section aria-labelledby="flow-heading" className="mx-auto max-w-lg px-5 pt-12">
        <p className="eyebrow text-terracotta-dark">Kunye · Together</p>
        <h2 id="flow-heading" className="mt-1 font-display text-[1.9rem] font-semibold leading-tight text-ink text-balance">
          The whole family, one plan, one big day.
        </h2>
        <ol className="mt-7 space-y-5">
          {FLOW.map((f, i) => (
            <li key={f.title} className="relative ml-5 rounded-[22px] border border-ink/[0.06] bg-white py-4 pl-11 pr-4 shadow-soft">
              <span
                aria-hidden="true"
                className="absolute -left-5 top-4 flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-[0_10px_20px_-10px_rgba(28,22,18,0.6)] ring-4 ring-cream"
                style={{ backgroundColor: f.color }}
              >
                <Icon name={f.icon} size={20} color="#ffffff" />
              </span>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: f.color }}>Step {i + 1}</p>
              <h3 className="mt-0.5 text-[16px] font-bold text-ink">{f.title}</h3>
              <p className="mt-1 text-[14px] leading-snug text-ink-muted">{f.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* —— Pride —— */}
      <section aria-labelledby="pride-heading" className="mx-auto max-w-lg px-5 pt-14">
        <div className="relative overflow-hidden rounded-[30px] bg-terracotta-dark px-6 pb-7 pt-8 text-cream shadow-[0_28px_56px_-28px_rgba(163,71,26,0.9)]">
          <div aria-hidden="true" className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-ochre-light/20" />
          <div aria-hidden="true" className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-black/15" />
          <p className="relative text-[12px] font-extrabold uppercase tracking-[0.2em] text-ochre-light">Siyazingca</p>
          <h2 id="pride-heading" className="relative mt-2 font-display text-[2.1rem] font-semibold leading-[1.05] text-balance">
            We are proud of who we are.
          </h2>
          <p className="relative mt-3 text-[15px] leading-relaxed text-cream/90">
            ClanMatch brings long-lost families and siblings back together through iziduko, whether they live in
            Mthatha, Joburg, London or Berlin. One family at a time, we unite the Xhosa nation.
          </p>
          <div className="relative mt-6 rounded-[22px] bg-cream p-4 text-ink">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-terracotta-dark">Did you know</p>
            <p className="mt-1 text-[14px] leading-snug">
              Laduma Ngxokolo first made his MaXhosa knitwear for <span className="font-bold">amakrwala</span>,
              young men home from ulwaluko. Today the world wears it.
            </p>
          </div>
        </div>
      </section>

      {/* —— Ubuhlanti: the Shrine Fund —— */}
      <section aria-labelledby="fund-heading" className="mx-auto max-w-lg px-5 pt-14">
        <div className="relative overflow-hidden rounded-[30px] bg-[#1c1612] text-cream shadow-[0_28px_56px_-28px_rgba(28,22,18,0.9)]">
          <div aria-hidden="true" className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-ochre-light/15" />
          <div aria-hidden="true" className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-terracotta-dark/35" />
          <div className="relative px-6 pb-7 pt-8">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.2em] text-ochre-light">Ubuhlanti bakwaXhosa · The Shrine Fund</p>
            <h2 id="fund-heading" className="mt-2 font-display text-[2.1rem] font-semibold leading-[1.04] text-balance">
              Together we can build greatness.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-cream/90">
              Every rand we spend on our ceremonies can help build our own wealth. The Shrine Fund is our
              nation&rsquo;s seed capital: open to all, public in its books, and invested in businesses we own,
              so our money stays in our communities for longer.
            </p>
            <ul className="mt-6 space-y-2">
              {FUND_POINTS.map((p) => (
                <li key={p.title} className="flex items-start gap-3 rounded-[18px] border border-cream/10 bg-white/[0.06] p-3.5">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-ochre-light/20">
                    <Icon name={p.icon} size={17} color="#e0a94e" />
                  </span>
                  <span>
                    <span className="block text-[14px] font-bold leading-tight text-cream">{p.title}</span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-cream/75">{p.body}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-5 font-display text-lg italic text-ochre-light">Sakha isizwe. We are building a nation.</p>
          </div>
        </div>
      </section>

      {/* —— Trust —— */}
      <section aria-labelledby="trust-heading" className="mx-auto max-w-lg space-y-3 px-5 pt-10">
        <h2 id="trust-heading" className="sr-only">Trust</h2>
        <div className="flex gap-3.5 rounded-[22px] border border-ink/[0.06] bg-white px-5 py-4 shadow-soft">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-terracotta-dark/10" aria-hidden>
            <Icon name="shieldCheck" size={19} color="#a3471a" />
          </span>
          <div>
            <p className="text-[15px] font-bold text-ink">Only verified ingcibi</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
              iCamagu is the trust source. An ingcibi&rsquo;s contact details are only shared once they are verified.
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
                ? 'iCamagu never holds, pools or transfers your funds. You pay the merchant or the person you are giving to directly, and we keep the record.'
                : 'You pay the merchant or the person you are giving to directly. iCamagu keeps the record, so the books stay clear for everyone.'}
            </p>
          </div>
        </div>
      </section>

      {/* —— Final call —— */}
      <section className="mx-auto max-w-lg px-5 pb-14 pt-10">
        <div className="relative overflow-hidden rounded-[30px] bg-terracotta-dark px-6 pb-7 pt-9 text-center text-cream">
          <div aria-hidden="true" className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-ochre-light/20" />
          <div className="relative">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.2em] text-ochre-light">Masiqale</p>
            <p className="mt-2 font-display text-[1.9rem] font-semibold leading-tight text-balance">
              What are we celebrating next?
            </p>
            <button
              type="button"
              onClick={onJoin}
              className="pressable mt-6 min-h-[52px] w-full rounded-full bg-cream px-6 text-[16px] font-bold text-terracotta-dark"
            >
              Start planning, free →
            </button>
            <button type="button" onClick={onSignIn} className="mt-4 text-sm font-bold text-cream/85 underline-offset-2 hover:underline">
              Already a member? Sign in
            </button>
          </div>
        </div>
        <p className="mt-8 text-center font-display text-base italic text-ink">Umntu ngumntu ngabantu</p>
        <p className="mt-1 text-center text-xs text-ink-muted">i-camagu.co.za · Made in South Africa, for amaXhosa everywhere</p>
      </section>
    </div>
  )
}
