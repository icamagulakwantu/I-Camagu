import { useState } from 'react'
import { useToast } from '../../components/ui/Toast.jsx'
import { shareToWhatsApp } from '../../lib/whatsapp.js'
import Icon from '../../components/Icon.jsx'
import { cn } from '../../lib/utils'
import { request } from './api.js'
import { planTitle } from './ceremonyForm.js'
import Bi from './Bi.jsx'
import { BUTTONS } from './wizardText.js'
import { inputClass, pressable } from './styles.js'

const ACTION_BUTTON = 'flex flex-col items-center justify-center gap-1 bg-white border-2 border-terracotta/15 rounded-soft py-3 px-1 min-h-[76px]'

// Everything a host can do with a finished plan: save it as a template, open
// the timeline, book the bar, share it, or delete it.
export default function SummaryActions({ plan, accessToken, onViewTimeline, onBookEkoyini, onDeleted }) {
  const { showToast } = useToast()
  const [templateOpen, setTemplateOpen] = useState(false)
  const [templateTitle, setTemplateTitle] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const title = planTitle(plan)

  const openTemplate = () => {
    setTemplateTitle(`${title} Template`)
    setTemplateOpen(true)
  }

  const saveTemplate = async (e) => {
    e.preventDefault()
    const name = templateTitle.trim()
    if (!name) { showToast('Please enter a template name', 'error'); return }
    setSavingTemplate(true)
    try {
      await request('/api/ceremonies/templates/save', accessToken, { method: 'POST', body: JSON.stringify({ planId: plan.id, templateTitle: name }) })
      setTemplateOpen(false)
      showToast('Saved as template', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSavingTemplate(false)
    }
  }

  const share = async (viaWhatsApp) => {
    try {
      const data = await request(`/api/ceremonies/plans/${plan.id}/share-link`, accessToken, { method: 'POST' })
      const message = `${title} - my ceremony checklist on iCamagu\n${data.shareUrl}`
      if (!viaWhatsApp && navigator.share) navigator.share({ title, text: message }).catch(() => {})
      else shareToWhatsApp(message)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const deleteCeremony = async () => {
    try {
      await request(`/api/ceremonies/${plan.ceremonyId}`, accessToken, { method: 'DELETE' })
      setConfirmDelete(false)
      onDeleted(plan.ceremonyId)
      showToast('Ceremony deleted', 'info')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  return (
    <div className="space-y-3">
      <div className={cn('grid gap-2', plan.ceremonyId ? 'grid-cols-3' : 'grid-cols-2')}>
        <button type="button" onClick={openTemplate} className={cn(ACTION_BUTTON, pressable)}>
          <Icon name="template" color="#c45c26" />
          <span className="text-[11px] text-ink-muted text-center"><Bi {...BUTTONS.template} /></span>
        </button>
        <button type="button" onClick={() => onViewTimeline?.(plan.ceremonyType)} className={cn(ACTION_BUTTON, pressable)}>
          <Icon name="clock" color="#4a7a4a" />
          <span className="text-[11px] text-ink-muted text-center"><Bi {...BUTTONS.timeline} /></span>
        </button>
        {plan.ceremonyId && (
          <button type="button" onClick={() => onBookEkoyini?.(plan.ceremonyId, title)} className={cn(ACTION_BUTTON, pressable)}>
            <Icon name="cocktail" color="#2b2620" />
            <span className="text-[11px] text-ink-muted text-center"><Bi {...BUTTONS.bar} /></span>
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => share(false)} className={cn('flex-1 h-14 border-2 border-terracotta text-terracotta rounded-pill flex items-center justify-center gap-2', pressable)}>
          <Icon name="share" size={16} /> <Bi {...BUTTONS.share} />
        </button>
        <button type="button" onClick={() => share(true)} className={cn('flex-1 h-14 bg-[#25D366] text-white font-bold rounded-pill', pressable)}>WhatsApp</button>
      </div>

      {templateOpen && (
        <form onSubmit={saveTemplate} className="bg-white border-2 border-sage-500 rounded-soft p-4 space-y-3">
          <p className="text-sm font-bold text-ink">Name this template</p>
          <p className="text-xs text-ink-muted">You can reuse it to start future ceremonies faster.</p>
          <input className={inputClass} value={templateTitle} onChange={(e) => setTemplateTitle(e.target.value)} autoFocus />
          <div className="flex gap-2">
            <button type="submit" disabled={savingTemplate} className={cn('flex-1 h-14 bg-sage-600 text-white rounded-pill', pressable)}><Bi {...BUTTONS.save} /></button>
            <button type="button" onClick={() => setTemplateOpen(false)} className={cn('flex-1 h-14 border-2 border-sage-200 rounded-pill', pressable)}><Bi {...BUTTONS.cancel} /></button>
          </div>
        </form>
      )}

      <button type="button" onClick={() => setConfirmDelete(true)} className={cn('w-full text-center text-terracotta py-3', pressable)}>
        <Bi {...BUTTONS.remove} />
      </button>

      {confirmDelete && (
        <div className="bg-white border-2 border-terracotta rounded-soft p-4">
          <p className="text-sm font-bold text-ink mb-1">Delete this ceremony for good?</p>
          <p className="text-xs text-ink-muted mb-3">This removes the ceremony, the shopping list, the budget and the pledges. It cannot be undone.</p>
          <div className="flex gap-2">
            <button type="button" onClick={deleteCeremony} className={cn('flex-1 h-14 bg-terracotta text-white font-bold rounded-pill', pressable)}>Yes, delete</button>
            <button type="button" onClick={() => setConfirmDelete(false)} className={cn('flex-1 h-14 border-2 border-terracotta/25 rounded-pill', pressable)}><Bi {...BUTTONS.cancel} /></button>
          </div>
        </div>
      )}
    </div>
  )
}
