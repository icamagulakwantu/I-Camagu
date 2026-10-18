import { useState } from 'react'
import Icon from '../../components/Icon.jsx'

// Interest rates are illustrative — actual rates change regularly.
// We show the CURRENT published call/savings account rates for the major
// SA banks and guide the organiser to verify with their branch.
// Rates are annual nominal interest rates (percent).
const BANKS = [
  {
    id: 'capitec',
    name: 'Capitec Bank',
    color: '#0047AB',
    product: 'Global One Savings',
    rate: 8.25,
    minBalance: 0,
    notes: 'No minimum balance. Highest rate on balances above R25k.',
    url: 'https://www.capitecbank.co.za',
  },
  {
    id: 'tymebank',
    name: 'TymeBank',
    color: '#00A86B',
    product: 'GoalSave',
    rate: 10.0,
    minBalance: 1,
    notes: 'Up to 10% p.a. if you save for 3+ months without withdrawing.',
    url: 'https://www.tymebank.co.za',
  },
  {
    id: 'african_bank',
    name: 'African Bank',
    color: '#E31837',
    product: 'Fixed Deposit / MyWorld',
    rate: 9.5,
    minBalance: 500,
    notes: 'Up to 9.5% on fixed deposits (3-12 months). Flexible savings lower.',
    url: 'https://www.africanbank.co.za',
  },
  {
    id: 'fnb',
    name: 'FNB',
    color: '#006400',
    product: 'FNB Savings Account',
    rate: 6.5,
    minBalance: 0,
    notes: 'Rate tiers — higher balance earns more. Check FNB branch for stokvel accounts.',
    url: 'https://www.fnb.co.za',
  },
  {
    id: 'nedbank',
    name: 'Nedbank',
    color: '#007B40',
    product: 'JustSave / ClubSave',
    rate: 6.0,
    minBalance: 0,
    notes: 'ClubSave is designed for stokvels specifically.',
    url: 'https://www.nedbank.co.za',
  },
  {
    id: 'standard_bank',
    name: 'Standard Bank',
    color: '#005B99',
    product: 'PureSave / MarketLink',
    rate: 5.75,
    minBalance: 0,
    notes: 'Standard Bank has a dedicated Stokvel Account product.',
    url: 'https://www.standardbank.co.za',
  },
  {
    id: 'absa',
    name: 'Absa',
    color: '#DC143C',
    product: 'Savings Account',
    rate: 5.5,
    minBalance: 0,
    notes: 'Absa Stokvel Account available — competitive for larger groups.',
    url: 'https://www.absa.co.za',
  },
]

// The retailer trade credit model:
// Instead of keeping money in the bank, the stokvel pre-commits a portion
// as a purchase order to an iCamagu-partnered supplier. The supplier
// guarantees goods at cost price. The "interest" equivalent is the discount
// vs. retail (typically 15-25% on alcohol and groceries).
const RETAILER_DISCOUNT = 0.20 // 20% average discount vs retail

const money = (n) =>
  `R${Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96]'

// ── BankInterestCalc ───────────────────────────────────────────────────────
// Pure client-side calculator. No API calls.
// Shows: interest earned across SA banks, a SmartMatch trade-credit
// comparison, and a clear recommendation.
export default function BankInterestCalc({ groupBalance = 0 }) {
  const [balance, setBalance] = useState(groupBalance > 0 ? String(groupBalance) : '')
  const [months, setMonths] = useState('12')
  const [showAll, setShowAll] = useState(false)
  const [tradePercent, setTradePercent] = useState('50')

  const bal = parseFloat(balance) || 0
  const mo = parseInt(months) || 12
  const tradeFraction = (parseFloat(tradePercent) || 50) / 100

  // Annual interest → monthly pro-rata (simple interest)
  const bankResults = BANKS.map((b) => {
    const interest = bal >= b.minBalance ? (bal * (b.rate / 100) * mo) / 12 : 0
    return { ...b, interest }
  }).sort((a, b) => b.interest - a.interest)

  const best = bankResults[0]

  // Trade credit model
  const tradeAmount = bal * tradeFraction
  const bankAmount = bal - tradeAmount
  const bankOnRemainder = bankAmount * (best.rate / 100) * mo / 12
  const retailSaving = tradeAmount * RETAILER_DISCOUNT
  const totalTradeModel = bankOnRemainder + retailSaving

  const displayed = showAll ? bankResults : bankResults.slice(0, 4)

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h3 className="font-display font-bold text-lg text-ink">Bank Interest Calculator</h3>
        <p className="text-xs text-ink-muted mt-0.5">
          See how much your group balance earns across SA banks, and compare that to the iCamagu SmartMatch trade model.
        </p>
      </div>

      {/* Inputs */}
      <div className="card-paper p-4 space-y-3">
        <p className="eyebrow text-ink-muted">Group savings details</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-ink-muted mb-1 block">Group balance (R)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-muted">R</span>
              <input type="number" min="0" step="100" placeholder="e.g. 15000"
                value={balance} onChange={(e) => setBalance(e.target.value)}
                className="w-full border border-ink/20 rounded-2xl pl-7 pr-3 py-2.5 text-sm bg-white focus:outline-none focus:border-terracotta/60" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-ink-muted mb-1 block">Duration (months)</label>
            <select value={months} onChange={(e) => setMonths(e.target.value)}
              className="w-full border border-ink/20 rounded-2xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-terracotta/60">
              <option value="1">1 month</option>
              <option value="3">3 months</option>
              <option value="6">6 months</option>
              <option value="12">12 months</option>
              <option value="24">24 months</option>
            </select>
          </div>
        </div>
      </div>

      {bal > 0 ? (
        <>
          {/* Bank comparison */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="eyebrow text-ink-muted">Bank comparison</p>
              <p className="text-[10px] text-ink-muted">{mo} month{mo !== 1 ? 's' : ''} · simple interest</p>
            </div>
            {displayed.map((b, i) => {
              const pct = best.interest > 0 ? (b.interest / best.interest) * 100 : 0
              return (
                <div key={b.id} className={`card-paper p-4 ${i === 0 ? 'border-2 border-terracotta/40' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        {i === 0 && (
                          <span className="text-[9px] font-black bg-terracotta text-white px-1.5 py-0.5 rounded-full uppercase">Best</span>
                        )}
                        <p className="font-bold text-sm text-ink">{b.name}</p>
                      </div>
                      <p className="text-[11px] text-ink-muted">{b.product} · {b.rate}% p.a.</p>
                      {b.minBalance > 0 && bal < b.minBalance && (
                        <p className="text-[11px] text-terracotta mt-0.5">
                          Min balance R{b.minBalance.toLocaleString()} required
                        </p>
                      )}
                      <div className="mt-2 h-1.5 rounded-full bg-ink/5 overflow-hidden">
                        <div className="h-full rounded-full bg-terracotta/70 transition-all duration-500"
                          style={{ width: `${Math.round(pct)}%` }} />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-display font-bold text-base text-terracotta">
                        {b.minBalance > 0 && bal < b.minBalance ? 'N/A' : money(b.interest)}
                      </p>
                      <p className="text-[10px] text-ink-muted">interest earned</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-ink-muted mt-2 leading-relaxed">{b.notes}</p>
                </div>
              )
            })}
            {bankResults.length > 4 && (
              <button type="button" onClick={() => setShowAll((v) => !v)}
                className={`w-full text-xs font-bold text-terracotta py-2 ${pressable}`}>
                {showAll ? 'Show fewer' : `Show all ${bankResults.length} banks`}
              </button>
            )}
            <p className="text-[10px] text-ink-muted px-1 leading-relaxed">
              Rates are approximate and change frequently. Verify with your bank before committing. Always ask your bank about their dedicated stokvel account options.
            </p>
          </div>

          {/* SmartMatch trade credit model */}
          <div className="card-paper border-2 border-terracotta/30 p-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <Icon name="cart" size={18} color="#c45c26" />
              <p className="font-bold text-sm text-ink">The iCamagu SmartMatch alternative</p>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              Instead of keeping all your money in a bank, split it: keep a portion earning interest, and pre-commit the rest as a bulk purchase order through iCamagu SmartMatch. The supplier gives you goods at cost — the saving is your "interest".
            </p>

            <div>
              <label className="text-[11px] font-bold text-ink-muted mb-1 block">
                % of balance to pre-commit to SmartMatch: <span className="text-terracotta">{tradePercent}%</span>
              </label>
              <input type="range" min="10" max="90" step="10"
                value={tradePercent} onChange={(e) => setTradePercent(e.target.value)}
                className="w-full accent-terracotta" />
              <div className="flex justify-between text-[10px] text-ink-muted mt-0.5">
                <span>10% — mostly bank</span>
                <span>90% — mostly SmartMatch</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-cream rounded-2xl p-3">
                <p className="text-[10px] font-black uppercase text-ink-muted">Bank interest</p>
                <p className="font-display font-bold text-base text-ink mt-0.5">{money(bankOnRemainder)}</p>
                <p className="text-[10px] text-ink-muted">on {money(bankAmount)}</p>
              </div>
              <div className="bg-terracotta/8 rounded-2xl p-3">
                <p className="text-[10px] font-black uppercase text-terracotta">SmartMatch saving</p>
                <p className="font-display font-bold text-base text-terracotta mt-0.5">{money(retailSaving)}</p>
                <p className="text-[10px] text-ink-muted">on {money(tradeAmount)} of goods</p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-terracotta/15 pt-3">
              <div>
                <p className="text-[11px] font-black text-ink">Combined benefit</p>
                <p className="text-[10px] text-ink-muted">bank interest + retail savings</p>
              </div>
              <p className="font-display font-bold text-xl text-terracotta">{money(totalTradeModel)}</p>
            </div>

            {totalTradeModel > best.interest && (
              <div className="bg-sage-50 border border-sage-200 rounded-2xl px-3 py-2.5">
                <p className="text-xs font-bold text-sage-700">
                  The SmartMatch model gives your group {money(totalTradeModel - best.interest)} more over {mo} month{mo !== 1 ? 's' : ''} than putting everything in {best.name}.
                </p>
              </div>
            )}

            <p className="text-[10px] text-ink-muted leading-relaxed">
              The {Math.round(RETAILER_DISCOUNT * 100)}% retail saving is an estimate based on average bulk-vs-retail price differences on alcohol and groceries. Actual savings depend on which products you order through SmartMatch.
            </p>
          </div>
        </>
      ) : (
        <div className="card-paper p-6 text-center">
          <Icon name="coins" size={32} color="#c45c26" />
          <p className="font-bold text-ink mt-3 mb-1">Enter your group balance</p>
          <p className="text-xs text-ink-muted">
            Type the amount your stokvel currently holds to see how much different banks would earn you.
          </p>
        </div>
      )}
    </div>
  )
}
