import { useState } from 'react'
import Icon from './Icon.jsx'

// Shown only to brand-new users (no ceremonies, no stokvels yet) so there is
// something to look at and tap on before they commit to creating anything of
// their own. Everything here is static sample data, kept entirely in local
// state — nothing is sent to the server and nothing is saved to the real
// account, so it's safe to show even to someone just browsing out of
// curiosity.
const HOW_IT_WORKS = [
  {
    icon: 'calendarRange',
    accent: '#c45c26',
    title: 'Create your ceremony',
    desc: 'Pick Umgidi, Ulwaluko, a wedding or any other rite — iCamagu builds your checklist and budget for you.',
  },
  {
    icon: 'send',
    accent: '#c1922f',
    title: 'Invite family to pledge',
    desc: 'Share a link so relatives can pledge what they are bringing — a goat, groceries, or cash.',
  },
  {
    icon: 'coins',
    accent: '#4a7a4a',
    title: 'Track every rand',
    desc: 'See your budget, what has been spent, and who still needs to pledge — all in one place.',
  },
]

const SAMPLE_ITEMS = [
  { id: 1, label: 'Clear and prepare the homestead', done: true },
  { id: 2, label: 'Order 2 cases of umqombothi ingredients', done: true },
  { id: 3, label: 'Confirm catering count — 120 guests', done: false },
  { id: 4, label: 'Collect pledges from the family', done: false },
]

const SAMPLE_BUDGET = 25000
const SAMPLE_SPENT = 18400

// Sample SmartMatch bulk-buy pool — also fake, local-only. Lets a new user
// feel the "join the pool, unlock the group price" mechanic without
// touching the real catalogue or basket.
const POOL_TARGET = 20
const POOL_STARTING = 14
const POOL_RETAIL = 220
const POOL_CASE_PRICE = 165

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.97]'

export default function FirstVisitExplainer({ onNavigate }) {
  const [items, setItems] = useState(SAMPLE_ITEMS)
  const [joinedPool, setJoinedPool] = useState(false)

  const toggle = (id) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i)))
  const doneCount = items.filter((i) => i.done).length
  const spentPercent = Math.min(100, Math.round((SAMPLE_SPENT / SAMPLE_BUDGET) * 100))

  const poolCount = joinedPool ? POOL_STARTING + 1 : POOL_STARTING
  const poolPercent = Math.min(100, Math.round((poolCount / POOL_TARGET) * 100))
  const poolSavings = POOL_RETAIL - POOL_CASE_PRICE

  return (
    <div className="mb-6">
      {/* How it works */}
      <p className="eyebrow text-ink-muted mb-2">New here? Here's how it works</p>
      <div className="space-y-2 mb-5">
        {HOW_IT_WORKS.map((step, i) => (
          <div key={step.title} className="bg-white border-2 border-terracotta/15 rounded-soft p-3.5 flex items-start gap-3 shadow-soft">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-display font-bold text-sm text-white"
              style={{ backgroundColor: step.accent }}
            >
              {i + 1}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-ink flex items-center gap-1.5">
                <Icon name={step.icon} size={14} color={step.accent} />
                {step.title}
              </p>
              <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tappable sample ceremony — fake data only, nothing saved */}
      <div className="bg-white border-2 border-terracotta/25 rounded-soft p-4 shadow-soft">
        <div className="flex items-center justify-between mb-1">
          <p className="font-display font-bold text-sm text-ink">Sample: Thabo's Umgidi</p>
          <span className="text-[9px] font-bold uppercase tracking-wide text-ink-muted bg-cream-dark px-2 py-0.5 rounded-pill">Try it — not real</span>
        </div>
        <p className="text-[11px] text-ink-muted mb-3">Tap a task to see how the checklist works. Nothing here is saved to your account.</p>

        <div className="divide-y divide-cream-dark/50 mb-3">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => toggle(item.id)}
              className="w-full flex items-center gap-3 py-2.5 text-left group"
            >
              <div
                className={`w-5.5 h-5.5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  item.done ? 'bg-sage-500 border-sage-500' : 'border-cream-dark group-hover:border-sage-300'
                }`}
                style={{ width: 22, height: 22 }}
              >
                {item.done && <Icon name="check" size={12} color="#fff" strokeWidth={2.5} />}
              </div>
              <span className={`flex-1 text-sm font-medium ${item.done ? 'text-ink-muted line-through' : 'text-ink'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </div>

        <div className="border-t border-cream-dark/50 pt-3">
          <div className="flex justify-between items-baseline mb-1">
            <p className="text-[11px] font-bold uppercase text-ink-muted">Sample budget</p>
            <p className="text-xs font-bold text-ink tabular">
              R{SAMPLE_SPENT.toLocaleString('en-ZA')} <span className="text-ink-muted font-normal">of R{SAMPLE_BUDGET.toLocaleString('en-ZA')}</span>
            </p>
          </div>
          <div className="w-full h-2 bg-cream-dark rounded-full overflow-hidden mb-2">
            <div className="h-full bg-sage-500 rounded-full transition-all duration-500" style={{ width: `${spentPercent}%` }} />
          </div>
          <p className="text-[11px] text-ink-muted">{doneCount}/{items.length} tasks done · 3 family members pledged so far</p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('ceremonyhub')}
          className={`w-full mt-4 wash-ember text-white font-bold py-3 rounded-pill text-sm ${pressable}`}
        >
          Create your own ceremony →
        </button>
      </div>

      {/* Tappable sample SmartMatch pool — fake data only, nothing saved */}
      <div className="bg-white border-2 border-terracotta/25 rounded-soft p-4 shadow-soft mt-4">
        <div className="flex items-center justify-between mb-1">
          <p className="font-display font-bold text-sm text-ink">Sample: Castle Lager case pool</p>
          <span className="text-[9px] font-bold uppercase tracking-wide text-ink-muted bg-cream-dark px-2 py-0.5 rounded-pill">Try it — not real</span>
        </div>
        <p className="text-[11px] text-ink-muted mb-3">Tap "Join pool" to see how SmartMatch unlocks bulk pricing. Nothing here is added to a real cart.</p>

        <div className="flex items-center gap-3 mb-3">
          <span className="w-14 h-14 bg-terracotta/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Icon name="cocktail" size={22} color="#c45c26" />
          </span>
          <div className="min-w-0">
            <p className="font-bold text-sm text-ink">Castle Lager — case of 24</p>
            <p className="text-xs text-ink-muted">
              Retail R{POOL_RETAIL} · Group price <span className="font-bold text-sage-700">R{POOL_CASE_PRICE}</span>
            </p>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex justify-between items-baseline mb-1">
            <p className="text-[11px] font-bold uppercase text-ink-muted">Pool progress</p>
            <p className="text-xs font-bold text-ink tabular">{poolCount}/{POOL_TARGET} joined</p>
          </div>
          <div className="w-full h-2 bg-cream-dark rounded-full overflow-hidden">
            <div className="h-full bg-terracotta rounded-full transition-all duration-500" style={{ width: `${poolPercent}%` }} />
          </div>
          <p className="text-[11px] text-ink-muted mt-1.5">
            {joinedPool
              ? `You're in! ${POOL_TARGET - poolCount} more members unlock the group price for everyone.`
              : `${POOL_TARGET - poolCount} more members needed to unlock R${poolSavings} savings per case.`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setJoinedPool((v) => !v)}
          className={`w-full py-3 rounded-pill text-sm font-bold ${pressable} ${
            joinedPool ? 'bg-sage-500 text-white' : 'bg-terracotta/10 text-terracotta border-2 border-terracotta/25'
          }`}
        >
          {joinedPool ? "You've joined this sample pool ✓" : 'Join pool'}
        </button>

        <button
          type="button"
          onClick={() => onNavigate('store')}
          className={`w-full mt-2 wash-ember text-white font-bold py-3 rounded-pill text-sm ${pressable}`}
        >
          Explore SmartMatch →
        </button>
      </div>
    </div>
  )
}
