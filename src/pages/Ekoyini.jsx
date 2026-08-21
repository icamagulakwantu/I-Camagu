import { useState } from 'react'
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
  const { showToast } = useToast()
  const [selectedPackage, setSelectedPackage] = useState(null)

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
          <button type="button" onClick={onBack} className={`text-sm text-white/70 mb-3 block ${pressable}`}>← Back</button>
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
              'w-full bg-white border-2 rounded-soft p-4 flex items-center gap-4 text-left transition-all duration-200 border-ink hover:border-sage-300 hover:-translate-y-0.5 hover:shadow-card',
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
          </button>
        ))}
      </div>

      <div className="h-8" />
    </div>
  )
}
