import { useT } from '../i18n/index.jsx'

// Shown on a live example: what it is, whose eyes it is seen through, and
// that nothing can be changed.
export default function ExampleBanner({ seenAs, onLeave }) {
  const t = useT()
  return (
    <div role="note" className="sticky top-0 z-30 flex items-center gap-3 bg-[#c1922f] px-4 py-2.5 text-[#1c1612] shadow-[0_8px_18px_-12px_rgba(0,0,0,0.5)]">
      <span className="rounded-full bg-[#1c1612] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#f5d58a]">{t('Example')}</span>
      <p className="min-w-0 flex-1 text-[12.5px] font-semibold leading-snug">
        {t('Not real people. Tap every tab; nothing can be changed.')}
        {seenAs ? <span className="block text-[11.5px] font-normal opacity-80">{t('You are seeing it as {who}.', { who: seenAs })}</span> : null}
      </p>
      {onLeave && (
        <button type="button" onClick={onLeave} className="flex-shrink-0 rounded-full bg-[#1c1612]/10 px-3 py-1.5 text-[12px] font-extrabold">
          {t('Leave')}
        </button>
      )}
    </div>
  )
}
