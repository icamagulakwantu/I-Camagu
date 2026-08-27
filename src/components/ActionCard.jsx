import React from 'react'

export default function ActionCard({ children, onClick, className = '', badge = null, icon = null }) {
  const handleInteraction = (e) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(8)
      } catch (err) {
        // Safe fallback for devices/browsers blocking vibration
      }
    }
    if (onClick) onClick(e)
  }

  return (
    <button
      type="button"
      onClick={handleInteraction}
      className={`card-paper grain relative w-full text-left overflow-hidden p-4
        active:scale-[0.98] transition-all duration-150 ${className}`}
    >
      <span className="motif-thresholds absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-40" />
      {badge !== null && badge !== undefined && Number(badge) > 0 && (
        <span className="absolute top-2 right-2 bg-brand-ochre text-brand-cream text-[10px] font-black w-5 h-5 rounded-pill flex items-center justify-center shadow-sm">
          {badge}
        </span>
      )}
      <div className="relative flex items-center gap-3">
        {icon && (
          <div className="w-10 h-10 rounded-full bg-terracotta/10 flex items-center justify-center text-xl shrink-0">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </button>
  )
}
