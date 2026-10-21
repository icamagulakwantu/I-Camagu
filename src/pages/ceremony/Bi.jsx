import { cn } from '../../lib/utils'

// Two-line label: isiXhosa on top, English underneath. It inherits the text
// colour of whatever it sits in, so it works on buttons and dark headers too.
// When there is no isiXhosa wording yet, the English shows on its own rather
// than guessing a translation.
export default function Bi({ xh, en, className, xhClassName, enClassName }) {
  if (!xh) return <span className={cn('block font-bold leading-tight', className, xhClassName)}>{en}</span>
  return (
    <span className={cn('block', className)}>
      <span className={cn('block font-bold leading-tight', xhClassName)}>{xh}</span>
      <span className={cn('block text-[0.8em] font-normal leading-tight opacity-75', enClassName)}>{en}</span>
    </span>
  )
}
