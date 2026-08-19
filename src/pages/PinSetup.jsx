import React from 'react'

export default function PinSetup({ onBack }) {
  return (
    <div className="px-5 pt-6 pb-28 max-w-md mx-auto">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-xs font-bold text-brand-black/60 uppercase tracking-wider flex items-center gap-1"
      >
        ← Back
      </button>
      <h1 className="text-xl font-black text-brand-black mb-2">PIN Setup</h1>
      <p className="text-sm text-brand-black/60">PIN security feature coming soon.</p>
    </div>
  )
}
