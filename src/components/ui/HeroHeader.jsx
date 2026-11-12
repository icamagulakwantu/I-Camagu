import Icon from '../Icon.jsx'

// Photo header used across the app's inner pages: a ceremony photograph
// under a deep gradient, an isiXhosa eyebrow, a display title with an ochre
// italic accent, and room at the bottom for the first card to rise out of
// it (give that card -mt-12 or similar). Keeps every page feeling like the
// same celebration as the landing page.
export default function HeroHeader({ image, eyebrow, title, accent, subtitle, onBack, backLabel = 'Back', children = null, className = '' }) {
  return (
    <header className={`relative overflow-hidden bg-[#1c1612] px-5 pb-20 pt-6 text-cream ${className}`}>
      {image && <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1c1612]/40 via-[#1c1612]/50 to-[#1c1612]" />
      <div className="relative">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="pressable mb-6 flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5 text-sm font-bold text-cream backdrop-blur-sm"
          >
            <Icon name="arrowLeft" size={14} color="#fffdf9" /> {backLabel}
          </button>
        )}
        {eyebrow && <p className="text-[12px] font-extrabold uppercase tracking-[0.2em] text-ochre-light">{eyebrow}</p>}
        <h1 className="mt-2 font-display text-[2.1rem] font-semibold leading-[1.05] text-balance">
          {title}{accent && <> <span className="italic text-ochre-light">{accent}</span></>}
        </h1>
        {subtitle && <p className="mt-3 text-[15px] leading-relaxed text-cream/85">{subtitle}</p>}
        {children}
      </div>
    </header>
  )
}
