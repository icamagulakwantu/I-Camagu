import { useState, useEffect } from 'react'
import { useToast } from '../components/ui/Toast.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { cn } from '../lib/utils'
import Icon from '../components/Icon.jsx'
import EkoyiniQuoteForm from './EkoyiniQuoteForm.jsx'

const STATUS_STYLE = {
  PENDING: 'bg-brand-ochre/15 text-brand-ochre',
  QUOTED: 'bg-brand-blue/15 text-brand-blue',
  CONFIRMED: 'bg-sage-100 text-sage-700',
  DECLINED: 'bg-terracotta/15 text-terracotta',
}

const STATUS_LABEL = {
  PENDING: 'Awaiting quote',
  QUOTED: 'Quoted — check your email',
  CONFIRMED: 'Confirmed',
  DECLINED: 'Declined',
}

function MyQuoteRequests({ onBack }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [quotes, setQuotes] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/ekoyini/quote/mine', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Could not load your quote requests')
        if (!cancelled) setQuotes(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setQuotes([])
          showToast(err.message, 'error')
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [accessToken, showToast])

  return (
    <div className="min-h-screen pb-24 bg-cream px-4 pt-12">
      <button type="button" onClick={onBack} className={`text-sm text-brand-black/60 mb-4 block ${pressable}`}>← Back</button>
      <h1 className="font-display font-bold text-2xl text-ink mb-1">My Quote Requests</h1>
      <p className="text-xs text-ink-muted mb-5">Status of every Ekoyini booking request you've sent</p>

      {loading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : quotes.length === 0 ? (
        <div className="bg-white border-2 border-terracotta/25 rounded-soft p-5 text-center">
          <p className="text-sm text-ink-muted">You haven't requested a quote yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quotes.map((q) => (
            <div key={q.id} className="bg-white border-2 border-terracotta/25 rounded-soft p-4">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="font-bold text-[15px] text-ink">{q.packageSelected} package</p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {q.eventType?.replace(/_/g, ' ')} · {new Date(q.eventDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-ink-muted">{q.venueArea}{q.city ? `, ${q.city}` : ''} · {q.guestCount} guests</p>
                </div>
                <span className={cn('text-[10px] font-bold uppercase px-2 py-1 rounded-pill whitespace-nowrap', STATUS_STYLE[q.status] || 'bg-brand-black/10 text-brand-black/60')}>
                  {STATUS_LABEL[q.status] || q.status}
                </span>
              </div>
              <p className="text-[11px] text-ink-muted/70 mt-2">Submitted {new Date(q.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Icon, not emoji — matches the line-icon set used everywhere else in the
// app. No exact "champagne" or "crown" glyph exists in that set, so these
// are the closest real fits rather than invented new icon shapes.
const PACKAGES = [
  { id: 'heritage', name: 'Heritage', icon: 'beer', price: 'R4,500', desc: 'Essential bar setup' },
  { id: 'signature', name: 'Signature', icon: 'cocktail', price: 'R7,500', desc: 'Premium selection' },
  { id: 'prestige', name: 'Prestige', icon: 'gift', price: 'R12,000', desc: 'Full luxury experience' },
  { id: 'royal', name: 'Royal', icon: 'shieldCheck', price: 'R18,000', desc: 'The complete package' },
  { id: 'custom', name: 'Custom', icon: 'settings', price: 'Quote', desc: 'Tailored to your needs' },
]

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none'

export default function Ekoyini({ onBack }) {
  const { showToast } = useToast()
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [showMyRequests, setShowMyRequests] = useState(false)

  if (showMyRequests) {
    return <MyQuoteRequests onBack={() => setShowMyRequests(false)} />
  }

  if (selectedPackage) {
    const packageData = PACKAGES.find(pkg => pkg.id === selectedPackage) || PACKAGES[0]
    return (
      <EkoyiniQuoteForm
        selectedPackage={{ ...packageData, id: packageData.id.toUpperCase() }}
        onBack={() => setSelectedPackage(null)}
        onSubmitted={(message) => {
          showToast(message || 'Quote request sent!', 'success')
          setSelectedPackage(null)
        }}
      />
    )
  }

  return (
    <div className="min-h-screen pb-24 bg-cream">
      {/* Header */}
      <div className="bg-gradient-to-br from-sage-500 to-sage-600 text-white px-5 pt-12 pb-8 rounded-b-[2.5rem] relative overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-64 h-64 bg-white/5 rounded-full" />
        <div className="relative">
          <div className="flex justify-between items-start">
            <button type="button" onClick={onBack} className={`text-sm text-white/70 mb-3 block ${pressable}`}>← Back</button>
            <button type="button" onClick={() => setShowMyRequests(true)} className={`flex items-center gap-1.5 text-xs font-bold text-white/90 bg-white/10 px-3 py-1.5 rounded-pill ${pressable}`}>
              <Icon name="clipboard" size={14} color="#fff" />
              My Requests
            </button>
          </div>
          <h1 className="font-display font-bold text-3xl">Ekoyini Mobile Bar</h1>
          <p className="text-white/70 text-sm mt-1">Premium bar service for your ceremony</p>
        </div>
      </div>

      {/* Package Selection */}
      <div className="px-4 mt-6 space-y-3">
        <h2 className="font-display font-bold text-xl text-ink mb-1">Select Package</h2>
        <p className="text-xs text-ink-muted mb-4">Choose a package that fits your ceremony size</p>

        {PACKAGES.map((pkg) => (
          <button
            key={pkg.id}
            type="button"
            onClick={() => setSelectedPackage(pkg.id)}
            className={cn(
              'w-full bg-white border-2 rounded-soft p-4 flex items-center gap-4 text-left transition-all duration-200 border-terracotta/25 hover:border-sage-300 hover:-translate-y-0.5 hover:shadow-card',
              pressable
            )}
          >
            <div className="w-12 h-12 rounded-full bg-sage-50 flex items-center justify-center flex-shrink-0">
              <Icon name={pkg.icon} size={22} color="#4a7a4a" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <p className="font-bold text-[15px] text-ink">{pkg.name}</p>
                <p className="font-display font-bold text-lg text-terracotta">{pkg.price}</p>
              </div>
              <p className="text-xs text-ink-muted">{pkg.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="h-8" />
    </div>
  )
}
