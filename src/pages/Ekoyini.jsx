import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { cn } from '../lib/utils'
import EkoyiniQuoteForm from './EkoyiniQuoteForm.jsx'

const PACKAGES = [
  { id: 'heritage', name: 'Heritage', emoji: '🥂', price: 'R4,500', desc: 'Essential bar setup' },
  { id: 'signature', name: 'Signature', emoji: '🍾', price: 'R7,500', desc: 'Premium selection' },
  { id: 'prestige', name: 'Prestige', emoji: '🍹', price: 'R12,000', desc: 'Full luxury experience' },
  { id: 'royal', name: 'Royal', emoji: '👑', price: 'R18,000', desc: 'The complete package' },
  { id: 'custom', name: 'Custom', emoji: '✨', price: 'Quote', desc: 'Tailored to your needs' },
]

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none'

export default function Ekoyini({ onBack }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [step, setStep] = useState(1)
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [form, setForm] = useState({
    eventDate: '',
    guestCount: '',
    venueType: 'indoor',
    cocktailService: false,
    glasswareUpgrade: false,
    culturalTourism: false,
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    specialRequests: '',
  })
  const [submitting, setSubmitting] = useState(false)

  if (selectedPackage && step === 3) {
    const packageData = PACKAGES.find(pkg => pkg.id === selectedPackage) || PACKAGES[0]
    return (
      <EkoyiniQuoteForm
        selectedPackage={{ ...packageData, id: packageData.id.toUpperCase() }}
        onBack={() => setStep(1)}
        onSubmitted={(message) => {
          showToast(message || 'Quote request sent!', 'success')
          setStep(1)
          setSelectedPackage(null)
        }}
      />
    )
  }

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const submitQuote = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/ekoyini/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ package: selectedPackage, ...form })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Quote submission failed')
      showToast('Quote sent! Check your email.', 'success')
      setStep(1)
      setSelectedPackage(null)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen pb-24 bg-cream">
      {/* Header */}
      <div className="bg-gradient-to-br from-sage-500 to-sage-600 text-white px-5 pt-12 pb-8 rounded-b-[2.5rem] relative overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-64 h-64 bg-white/5 rounded-full" />
        <div className="relative">
          <button type="button" onClick={onBack} className={`text-sm text-white/70 mb-3 block ${pressable}`}>← Back</button>
          <h1 className="font-display font-bold text-3xl">Ekoyini Mobile Bar</h1>
          <p className="text-white/70 text-sm mt-1">Premium bar service for your ceremony</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="px-5 mt-6">
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex-1 h-2 rounded-full bg-cream-dark overflow-hidden">
              <div className={cn(
                'h-full bg-sage-500 transition-all duration-500 ease-snap',
                step >= s ? 'w-full' : 'w-0'
              )} />
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Package Selection */}
      {step === 1 && (
        <div className="px-4 space-y-3">
          <h2 className="font-display font-bold text-xl text-ink mb-1">Select Package</h2>
          <p className="text-xs text-ink-muted mb-4">Choose a package that fits your ceremony size</p>
          
          {PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              type="button"
              onClick={() => setSelectedPackage(pkg.id)}
              className={cn(
                'w-full bg-white border-2 rounded-soft p-4 flex items-center gap-4 text-left transition-all duration-200',
                selectedPackage === pkg.id
                  ? 'border-sage-500 shadow-glow bg-sage-50'
                  : 'border-ink hover:border-sage-300 hover:-translate-y-0.5 hover:shadow-card',
                pressable
              )}
            >
              <div className="w-12 h-12 rounded-full bg-sage-50 flex items-center justify-center text-2xl flex-shrink-0">
                {pkg.emoji}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-[15px] text-ink">{pkg.name}</p>
                  <p className="font-display font-bold text-lg text-terracotta">{pkg.price}</p>
                </div>
                <p className="text-xs text-ink-muted">{pkg.desc}</p>
              </div>
              {selectedPackage === pkg.id && (
                <div className="w-6 h-6 rounded-full bg-sage-500 flex items-center justify-center text-white text-xs font-bold">✓</div>
              )}
            </button>
          ))}

          <button
            type="button"
            onClick={() => selectedPackage ? setStep(2) : showToast('Please select a package', 'error')}
            className={`w-full bg-sage-500 text-white font-bold py-4 rounded-pill shadow-glow mt-4 ${pressable}`}
          >
            Continue →
          </button>
        </div>
      )}

      {/* Step 2: Event Details */}
      {step === 2 && (
        <div className="px-4 space-y-4 animate-fade-in">
          <h2 className="font-display font-bold text-xl text-ink mb-1">Event Details</h2>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-1.5 block">Event Date</label>
              <input
                type="date"
                value={form.eventDate}
                onChange={(e) => updateForm('eventDate', e.target.value)}
                className="w-full h-12 bg-white border-2 border-cream-dark rounded-soft px-4 text-sm text-ink focus:outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-1.5 block">Guest Count</label>
              <input
                type="number"
                placeholder="Estimated guests"
                value={form.guestCount}
                onChange={(e) => updateForm('guestCount', e.target.value)}
                className="w-full h-12 bg-white border-2 border-cream-dark rounded-soft px-4 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-1.5 block">Venue Type</label>
              <div className="flex gap-2">
                {['indoor', 'outdoor', 'tent'].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => updateForm('venueType', v)}
                    className={cn(
                      'flex-1 py-3 rounded-soft text-xs font-bold capitalize transition-all',
                      form.venueType === v
                        ? 'bg-sage-500 text-white shadow-glow'
                        : 'bg-white border-2 border-cream-dark text-ink-muted hover:border-sage-300'
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border-2 border-ink rounded-soft p-4 space-y-3">
              <p className="text-xs font-extrabold text-ink-muted uppercase tracking-wider">Add-ons</p>
              {[
                { key: 'cocktailService', label: 'Cocktail Service', emoji: '🍸' },
                { key: 'glasswareUpgrade', label: 'Premium Glassware', emoji: '🥃' },
                { key: 'culturalTourism', label: 'Cultural Tourism (up to 30% host share)', emoji: '🌍' },
              ].map((addon) => (
                <button
                  key={addon.key}
                  type="button"
                  onClick={() => updateForm(addon.key, !form[addon.key])}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-soft border-2 transition-all text-left',
                    form[addon.key] ? 'border-sage-500 bg-sage-50' : 'border-cream-dark bg-white hover:border-sage-300',
                    pressable
                  )}
                >
                  <span className="text-xl">{addon.emoji}</span>
                  <span className="text-sm font-bold text-ink flex-1">{addon.label}</span>
                  <div className={cn(
                    'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                    form[addon.key] ? 'bg-sage-500 border-sage-500' : 'border-cream-dark'
                  )}>
                    {form[addon.key] && <span className="text-white text-xs">✓</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button type="button" onClick={() => setStep(1)} className={`flex-1 border-2 border-ink text-ink font-bold py-3 rounded-pill ${pressable}`}>← Back</button>
            <button type="button" onClick={() => setStep(3)} className={`flex-1 bg-sage-500 text-white font-bold py-3 rounded-pill shadow-glow ${pressable}`}>Continue →</button>
          </div>
        </div>
      )}

      {/* Step 3: Contact & Submit */}
      {step === 3 && (
        <form onSubmit={submitQuote} className="px-4 space-y-4 animate-fade-in">
          <h2 className="font-display font-bold text-xl text-ink mb-1">Contact Details</h2>
          
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Full Name"
              value={form.contactName}
              onChange={(e) => updateForm('contactName', e.target.value)}
              className="w-full h-12 bg-white border-2 border-cream-dark rounded-soft px-4 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20"
              required
            />
            <input
              type="tel"
              placeholder="Phone Number"
              value={form.contactPhone}
              onChange={(e) => updateForm('contactPhone', e.target.value)}
              className="w-full h-12 bg-white border-2 border-cream-dark rounded-soft px-4 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20"
              required
            />
            <input
              type="email"
              placeholder="Email Address"
              value={form.contactEmail}
              onChange={(e) => updateForm('contactEmail', e.target.value)}
              className="w-full h-12 bg-white border-2 border-cream-dark rounded-soft px-4 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20"
              required
            />
            <textarea
              placeholder="Special requests (optional)"
              value={form.specialRequests}
              onChange={(e) => updateForm('specialRequests', e.target.value)}
              rows={3}
              className="w-full bg-white border-2 border-cream-dark rounded-soft px-4 py-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20 resize-none"
            />
          </div>

          <div className="bg-white border-2 border-ink rounded-soft p-4 mt-4">
            <p className="text-xs font-extrabold text-ink-muted uppercase tracking-wider mb-2">Quote Summary</p>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-ink-muted">Package</span>
              <span className="font-bold text-ink capitalize">{selectedPackage}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-ink-muted">Guests</span>
              <span className="font-bold text-ink">{form.guestCount || '—'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-muted">Cultural Tourism</span>
              <span className="font-bold text-ink">{form.culturalTourism ? 'Yes' : 'No'}</span>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button type="button" onClick={() => setStep(2)} className={`flex-1 border-2 border-ink text-ink font-bold py-3 rounded-pill ${pressable}`}>← Back</button>
            <button
              type="submit"
              disabled={submitting}
              className={`flex-1 bg-terracotta text-white font-bold py-3 rounded-pill shadow-terracotta ${pressable}`}
            >
              {submitting ? 'Sending...' : 'Request Quote'}
            </button>
          </div>
        </form>
      )}

      <div className="h-8" />
    </div>
  )
}
