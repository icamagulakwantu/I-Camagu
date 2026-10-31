import { useEffect, useState } from 'react'
import Icon from '../components/Icon.jsx'

/**
 * Public marketing page shown before sign-in.
 * Story matches pamphlet + welcome brief. No fake testimonials.
 * ?src= is stored once on first touch for campaign attribution.
 * Keep the no-custody claim disabled until the server-side policy is independently verified.
 */
const NO_CUSTODY_LIVE = false
const SRC_KEY = 'icamagu_campaign_src'

const STEPS = [
  {
    n: '1',
    icon: 'calendar',
    title: 'Plan',
    line: 'Pick your ceremony. Ready checklist, timeline and budget.',
    color: 'bg-terracotta',
  },
  {
    n: '2',
    icon: 'share',
    title: 'Share',
    line: 'One link to family. Relatives pledge what they will bring — Ukugida.',
    color: 'bg-ochre',
  },
  {
    n: '3',
    icon: 'cart',
    title: 'Buy together',
    line: 'Group orders. Merchants send offers. You pay the merchant directly.',
    color: 'bg-sage',
  },
  {
    n: '4',
    icon: 'coins',
    title: 'Save together',
    line: 'Run your stokvel: contributions, approvals, statements you can trust.',
    color: 'bg-[#3d5a80]',
  },
  {
    n: '5',
    icon: 'book',
    title: 'Remember',
    line: 'Find your clan by iziduko. Keep records. Honour our history.',
    color: 'bg-[#6b4c9a]',
  },
]

const PILLARS = [
  {
    icon: 'calendar',
    title: 'Plan a ceremony',
    body: 'Ulwaluko, Umgidi, Intambo Enkulu and more — checklist, hierarchy, budget and share link in one place.',
    accent: 'border-terracotta/40',
  },
  {
    icon: 'cart',
    title: 'Buy with real power',
    body: 'Stokvels and families already pool. iCamagu turns that into negotiating leverage: group orders, merchant offers, bulk pricing you can see.',
    accent: 'border-sage/50',
  },
  {
    icon: 'coins',
    title: 'Save with clear books',
    body: 'Contributions, official approvals, statements. Built for how stokvels and burial societies actually work — not a generic wallet.',
    accent: 'border-[#3d5a80]/40',
  },
  {
    icon: 'users',
    title: 'Find your people',
    body: 'Four iziduko lines and surname. Clan groups, messages, House of AmaXhosa — history held with verification, not rumour.',
    accent: 'border-[#6b4c9a]/40',
  },
]

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
      const src = params.get('src')
      if (src && /^[a-zA-Z0-9_-]{1,40}$/.test(src) && !localStorage.getItem(SRC_KEY)) {
        localStorage.setItem(SRC_KEY, src)
      }
    } catch {
      /* ignore */
    }
  }, [])

  return (
    <div className="min-h-screen bg-cream text-ink">
      {/* —— Hero —— */}
      <header className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 100% 80% at 50% -20%, rgba(193,146,47,0.22), transparent 55%),'
              + 'radial-gradient(ellipse 80% 50% at 100% 50%, rgba(74,122,74,0.12), transparent 50%),'
              + 'linear-gradient(165deg, #2b2218 0%, #3d2e22 45%, #1f1a15 100%)',
          }}
        />
        <div aria-hidden className="bead-band bead-fade absolute inset-x-0 bottom-0 z-10 opacity-90" />

        <div className="relative z-10 mx-auto max-w-lg px-5 pb-12 pt-8">
          <div className="mb-8 flex items-center gap-2.5">
            <img src="/icons/source/gateway-mark-1024.png" alt="" width="44" height="44" className="h-11 w-11" />
            <div>
              <p className="font-display text-2xl font-semibold tracking-tight text-cream">iCamagu</p>
              <p className="text-xs font-medium tracking-wide text-ochre-light/90">uMntu ngumntu ngabantu</p>
            </div>
          </div>

          <p className="eyebrow mb-3 text-ochre-light">Culture before capital</p>
          {inviteType && (
            <div className="mb-4 rounded-2xl border border-ochre-light/35 bg-white/10 px-4 py-3 text-sm leading-relaxed text-cream">
              {inviteType === 'stokvel' && 'You have been invited to join a stokvel on iCamagu. Learn how the platform works, then join to continue with your invitation.'}
              {inviteType === 'clan' && 'You have been invited to a family clan group on iCamagu. Learn how the platform works, then join to continue with your invitation.'}
              {inviteType === 'pool' && 'You have been invited to a SmartMatch group order on iCamagu. Learn how the platform works, then join to continue with your invitation.'}
            </div>
          )}
          <h1 className="font-display text-[2.15rem] font-semibold leading-[1.08] text-cream text-balance">
            Plan the ceremony.{' '}
            <span className="text-ochre-light">Share the load.</span>{' '}
            Buy together. Keep our culture strong.
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-cream/85">
            One home for Xhosa ceremonies, family giving, stokvels and group buying.
            Everything is connected — so nothing is lost between WhatsApp, notebooks and the day of the event.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onJoin}
              className="pressable min-h-12 rounded-full bg-terracotta px-7 text-[15px] font-bold text-white shadow-[0_12px_28px_-10px_rgba(196,92,38,0.85)]"
            >
              Join free →
            </button>
            <button
              type="button"
              onClick={onSignIn}
              className="pressable min-h-12 rounded-full border border-cream/35 bg-white/5 px-7 text-[15px] font-bold text-cream backdrop-blur-sm"
            >
              Sign in
            </button>
          </div>
          <p className="mt-4 text-xs text-cream/60">
            Free to join · No app store · Works on slow data · Install from your browser
          </p>
        </div>
      </header>

      {/* —— How it works —— */}
      <section className="mx-auto max-w-lg px-5 py-12" aria-labelledby="how-heading">
        <p className="eyebrow text-terracotta">How iCamagu works</p>
        <h2 id="how-heading" className="mt-1 font-display text-2xl font-semibold text-ink">
          Five steps. Start anywhere.
        </h2>
        <ol className="mt-8 space-y-3">
          {STEPS.map((s) => (
            <li key={s.n} className="card-paper flex gap-3.5 p-4 pl-3.5">
              <span
                className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${s.color} text-white shadow-sm`}
                aria-hidden
              >
                <Icon name={s.icon} size={20} color="#fff" />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-[13px] font-bold text-ink">
                  <span className="text-ink-muted font-semibold">{s.n}.</span> {s.title}
                </p>
                <p className="mt-0.5 text-sm leading-snug text-ink-muted">{s.line}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* —— Connected —— */}
      <section className="mx-auto max-w-lg px-5 pb-4">
        <div className="rounded-3xl border border-ochre/25 bg-gradient-to-br from-[#faf6ee] to-[#f0e4d3] p-5 shadow-soft">
          <p className="eyebrow text-ochre">Everything is connected</p>
          <p className="mt-2 text-sm leading-relaxed text-ink">
            Your ceremony checklist feeds the group orders. Gifts pledged by family count in your budget.
            Your clan and your stokvel stand with you — one source of truth instead of scattered chats.
          </p>
        </div>
      </section>

      {/* —— Money stays yours (claim gated on server evidence) —— */}
      <section className="mx-auto max-w-lg px-5 py-8">
        <div className="flex gap-3.5 rounded-3xl bg-brand-black px-5 py-5 text-cream shadow-elevated">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-ochre/20" aria-hidden>
            <Icon name="lock" size={18} color="#c1922f" />
          </span>
          <div>
            <p className="font-display text-lg font-semibold text-cream">
              {NO_CUSTODY_LIVE ? 'Your money stays yours' : 'You pay people directly'}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-cream/80">
              {NO_CUSTODY_LIVE
                ? 'iCamagu never holds, pools or transfers your funds. You pay the merchant or the person you are giving to — directly. We record what you declare so the books stay clear.'
                : 'You pay the merchant or the person you are giving to — directly. iCamagu records what you declare so the books stay clear.'}
            </p>
          </div>
        </div>
      </section>

      {/* —— Stokvel power —— */}
      <section className="mx-auto max-w-lg px-5 py-6" aria-labelledby="stokvel-heading">
        <p className="eyebrow text-sage">For stokvels & burial societies</p>
        <h2 id="stokvel-heading" className="mt-1 font-display text-2xl font-semibold text-ink text-balance">
          You already save together. Now buy with the power of the group.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          A stokvel is already collective strength. What has been missing is a way to turn that strength into{' '}
          <strong className="font-semibold text-ink">real negotiating leverage</strong> with suppliers —
          alcohol, meat, groceries, livestock — without handing your money to an app.
        </p>
        <ul className="mt-5 space-y-3">
          {[
            'Pool demand near you. See progress toward the next price break.',
            'Merchants send offers. An official path accepts the best one. You still pay the merchant yourself.',
            'Clear ledgers, official approvals, statements — the discipline burial societies and stokvels already demand, digitised without losing ubuntu.',
          ].map((t) => (
            <li key={t} className="flex gap-2.5 text-sm leading-snug text-ink">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sage" aria-hidden />
              {t}
            </li>
          ))}
        </ul>
      </section>

      {/* —— Ubuhlanti / creators —— */}
      <section className="relative mx-auto max-w-lg overflow-hidden px-5 py-10" aria-labelledby="shrine-heading">
        <div
          className="rounded-[28px] px-5 py-8 text-cream shadow-elevated"
          style={{
            background:
              'radial-gradient(ellipse 90% 70% at 10% 0%, rgba(193,146,47,0.35), transparent 50%),'
              + 'linear-gradient(155deg, #1e301e 0%, #2d4a2d 40%, #1a2418 100%)',
          }}
        >
          <p className="eyebrow text-ochre-light">Ubuhlanti bakwa Xhosa</p>
          <h2 id="shrine-heading" className="mt-2 font-display text-[1.65rem] font-semibold leading-tight text-cream text-balance">
            From consumers to creators of our own wealth.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-cream/85">
            The shrine and development fund is a public, transparent vessel. Anyone can make a pledge from R1;
            a public donation counts once a person confirms the transfer. Stokvel members may opt in to
            contribute a share when their payout clears.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-cream/85">
            Picture a nation that owns its ceremonies, its savings, its bulk power and its memory —
            the way sovereign communities elsewhere have turned identity into lasting economic ground.
            iCamagu is infrastructure for that path: culture first, capital in service of it.
          </p>
          <p className="mt-4 text-xs font-medium tracking-wide text-ochre-light/90">
            Transparent · Communal · Accountable
          </p>
        </div>
      </section>

      {/* —— Pillars —— */}
      <section className="mx-auto max-w-lg px-5 py-8" aria-labelledby="pillars-heading">
        <p className="eyebrow text-terracotta">Inside the app</p>
        <h2 id="pillars-heading" className="mt-1 font-display text-2xl font-semibold text-ink">
          One login. The full picture.
        </h2>
        <div className="mt-6 grid gap-3">
          {PILLARS.map((p) => (
            <article key={p.title} className={`card-paper border-l-4 ${p.accent} p-4`}>
              <div className="flex items-center gap-2">
                <Icon name={p.icon} size={18} color="#c45c26" />
                <h3 className="text-[15px] font-bold text-ink">{p.title}</h3>
              </div>
              <p className="mt-1.5 text-sm leading-snug text-ink-muted">{p.body}</p>
            </article>
          ))}
        </div>
        <p className="mt-5 text-center text-xs text-ink-muted">
          Plus: Directory of healers and vendors · Ekoyini Mobile Bar · Cultural tourism ·
          Family archive · Did you know · Coming with the elders (more ceremonies after review)
        </p>
      </section>

      {/* —— Proof slot (honest empty) —— */}
      <section className="mx-auto max-w-lg px-5 pb-6">
        <div className="rounded-2xl border border-dashed border-cream-dark bg-white/60 px-4 py-5 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">Living proof</p>
          <p className="mt-2 text-sm text-ink-muted leading-snug">
            When stokvels are running, ceremonies planned and group orders fulfilled on the platform,
            those real numbers will live here — never invented claims.
          </p>
        </div>
      </section>

      {/* —— Final CTA —— */}
      <section className="mx-auto max-w-lg px-5 pb-16 pt-4">
        <div className="card-paper p-6 text-center">
          <p className="font-display text-xl font-semibold text-ink">Start with one thing</p>
          <p className="mt-2 text-sm text-ink-muted">
            Plan a ceremony, join a stokvel, or find your clan. Free to join.
          </p>
          <button
            type="button"
            onClick={onJoin}
            className="pressable mt-5 min-h-12 w-full rounded-full bg-terracotta px-6 text-[15px] font-bold text-white shadow-terracotta"
          >
            Join free →
          </button>
          <button
            type="button"
            onClick={onSignIn}
            className="mt-3 text-sm font-bold text-terracotta underline-offset-2 hover:underline"
          >
            Already have an account? Sign in
          </button>
        </div>
        <p className="mt-8 text-center text-xs text-ink-muted">
          i-camagu.co.za · Built for South Africa
        </p>
      </section>
    </div>
  )
}
