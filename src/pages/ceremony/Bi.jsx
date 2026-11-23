import { cn } from '../../lib/utils'
import { useLanguage } from '../../i18n/index.jsx'

// A label in the member's language: isiXhosa for a member who chose it (More >
// Ulwimi), English otherwise. Buttons and field labels show one line only, so
// they stay the same size as everywhere else in the app (founder, 23 Nov
// 2026: the two-line buttons were too big). With `both`, used for the step
// title, isiXhosa sits on top with English underneath. When there is no
// isiXhosa wording yet, the English shows rather than a guessed translation.
export default function Bi({ xh, en, both = false, className, xhClassName, enClassName }) {
  const { lang } = useLanguage()
  if (!xh) return <span className={cn('block font-bold leading-tight', className, xhClassName)}>{en}</span>
  if (lang === 'xh') return <span className={cn('block font-bold leading-tight', className, xhClassName)}>{xh}</span>
  if (!both) return <span className={cn('block font-bold leading-tight', className, xhClassName)}>{en}</span>
  return (
    <span className={cn('block', className)}>
      <span className={cn('block font-bold leading-tight', xhClassName)}>{xh}</span>
      <span className={cn('block text-[0.8em] font-normal leading-tight opacity-75', enClassName)}>{en}</span>
    </span>
  )
}
