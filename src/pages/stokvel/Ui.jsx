import Icon from '../../components/Icon.jsx'
import { pressable } from './shared.js'

// Shared UI for stokvel sub-pages: one primary button style, an empty state
// with an icon and optional action, and a bottom-sheet confirmation.
export const primaryBtn = `bg-terracotta text-white font-bold rounded-pill text-sm ${pressable}`
export const secondaryBtn = `border-2 border-terracotta/25 text-ink font-bold rounded-pill text-sm ${pressable}`

export function SubEmpty({ icon, title, description, actionLabel, onAction }) {
  return (
    <div className="bg-white border-2 border-dashed border-terracotta/20 rounded-soft px-5 py-7 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sage-50">
        <Icon name={icon} size={22} color="#4a7a4a" />
      </span>
      <p className="font-display font-bold text-base text-ink mt-3">{title}</p>
      {description && <p className="text-xs text-ink-muted mt-1 max-w-[260px] mx-auto leading-relaxed">{description}</p>}
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className={`mt-4 px-5 py-2 ${primaryBtn}`}>{actionLabel}</button>
      )}
    </div>
  )
}

export function ConfirmSheet({ open, title, message, confirmLabel = 'Confirm', danger = false, busy = false, onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 px-4 pb-6 print:hidden" onClick={onCancel}>
      <div role="dialog" aria-modal="true" className="w-full max-w-sm bg-white rounded-soft p-5 shadow-lg animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <p className="font-display font-bold text-lg text-ink">{title}</p>
        {message && <p className="text-sm text-ink-muted mt-1.5 leading-relaxed">{message}</p>}
        <div className="flex gap-2 mt-5">
          <button type="button" disabled={busy} onClick={onConfirm}
            className={`flex-1 py-2.5 ${danger ? `bg-terracotta text-white font-bold rounded-pill text-sm ${pressable}` : primaryBtn}`}>
            {busy ? 'Working...' : confirmLabel}
          </button>
          <button type="button" disabled={busy} onClick={onCancel} className={`flex-1 py-2.5 ${secondaryBtn}`}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
