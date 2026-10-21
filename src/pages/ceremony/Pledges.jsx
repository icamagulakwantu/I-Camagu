import { useState } from 'react'
import { useToast } from '../../components/ui/Toast.jsx'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import Icon from '../../components/Icon.jsx'
import { cn } from '../../lib/utils'
import { request } from './api.js'
import { rand } from './format.js'
import { planTitle } from './ceremonyForm.js'
import Bi from './Bi.jsx'
import { BUTTONS } from './wizardText.js'
import { inputClass, pressable } from './styles.js'

const EMPTY_PLEDGE = { contributorName: '', pledgeItem: '', pledgeValue: '' }

// Family contributions. The server returns pledgerName / pledgedItem /
// pledgedAmountZAR / paidAmountZAR (see ContributionPledge in the schema).
export default function Pledges({ plan, accessToken, pledges, setPledges, onBack }) {
  const { showToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState(EMPTY_PLEDGE)

  const addPledge = async (e) => {
    e.preventDefault()
    if (!draft.contributorName || !draft.pledgeItem) {
      showToast('Please fill in the name and the item', 'error')
      return
    }
    try {
      const data = await request('/api/ceremonies/plans/pledges', accessToken, {
        method: 'POST',
        body: JSON.stringify({
          planId: plan.id,
          pledgerName: draft.contributorName,
          pledgedItem: draft.pledgeItem,
          pledgedAmountZAR: draft.pledgeValue ? parseFloat(draft.pledgeValue) : null,
        }),
      })
      setPledges((prev) => [...prev, data])
      setDraft(EMPTY_PLEDGE)
      setShowForm(false)
      showToast('Pledge added', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const deletePledge = async (pledgeId) => {
    try {
      await request(`/api/ceremonies/plans/pledges/${pledgeId}`, accessToken, { method: 'DELETE' })
      setPledges((prev) => prev.filter((p) => p.id !== pledgeId))
      showToast('Pledge removed', 'info')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  return (
    <div className="min-h-screen pb-24 bg-cream">
      <div className="bg-gradient-to-br from-sage-500 to-sage-600 text-white px-5 pt-12 pb-8 rounded-b-[2.5rem]">
        <button type="button" onClick={onBack} className={cn('text-sm text-white/80 mb-3 block', pressable)}>
          <Bi {...BUTTONS.back} className="text-left" />
        </button>
        <h1 className="font-display font-bold text-3xl">Family pledges</h1>
        <p className="text-white/80 text-sm mt-1">{planTitle(plan)}</p>
      </div>

      <div className="mx-4 mt-5">
        <button type="button" onClick={() => setShowForm((v) => !v)} className={cn('w-full h-14 rounded-pill bg-sage-600 text-white mb-3', pressable)}>
          <Bi {...(showForm ? BUTTONS.cancel : { xh: 'Ongeza isibonelelo', en: 'Add a pledge' })} />
        </button>

        {showForm && (
          <form onSubmit={addPledge} className="bg-white border-2 border-terracotta/25 rounded-soft p-4 mb-3 space-y-3">
            <input className={inputClass} placeholder="Name (e.g. Uncle Sipho)" value={draft.contributorName} onChange={(e) => setDraft((p) => ({ ...p, contributorName: e.target.value }))} required />
            <input className={inputClass} placeholder="Item (e.g. Goat, Groceries)" value={draft.pledgeItem} onChange={(e) => setDraft((p) => ({ ...p, pledgeItem: e.target.value }))} required />
            <input className={inputClass} type="number" inputMode="decimal" min="0" placeholder="Value in rand (optional, e.g. 500)" value={draft.pledgeValue} onChange={(e) => setDraft((p) => ({ ...p, pledgeValue: e.target.value }))} />
            <button type="submit" className={cn('w-full h-14 rounded-pill bg-sage-500 text-white', pressable)}>
              <Bi {...BUTTONS.save} />
            </button>
          </form>
        )}

        {pledges.length === 0 ? (
          <EmptyState
            emoji="👨‍👩‍👧‍👦"
            title="No pledges yet"
            description="Write down what each family member has promised to bring or pay for."
            primaryLabel="Add first pledge"
            onPrimary={() => setShowForm(true)}
            className="border-2 border-terracotta/25"
          />
        ) : (
          <div className="space-y-2">
            {pledges.map((p) => {
              const pledgedAmount = p.pledgedAmountZAR != null ? parseFloat(p.pledgedAmountZAR) : null
              const paidAmount = p.paidAmountZAR != null ? parseFloat(p.paidAmountZAR) : 0
              const isPaid = pledgedAmount != null && pledgedAmount > 0 && paidAmount >= pledgedAmount
              return (
                <div key={p.id} className="bg-white border-2 border-terracotta/25 rounded-soft p-4 flex justify-between items-center gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-base text-ink break-words">{p.pledgerName}{p.relationship ? ` · ${p.relationship}` : ''}</p>
                    <p className="text-sm text-ink-muted break-words">{p.pledgedItem}{pledgedAmount != null && ` · ${rand(pledgedAmount)}`}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={cn('text-xs font-bold px-2.5 py-1 rounded-pill', isPaid ? 'bg-sage-100 text-sage-700' : 'bg-sage-50 text-sage-700')}>{isPaid ? 'Received' : 'Pledged'}</span>
                    <button type="button" aria-label="Delete pledge" onClick={() => deletePledge(p.id)} className={cn('w-10 h-10 flex items-center justify-center bg-rose-50 rounded-pill', pressable)}>
                      <Icon name="trash" size={16} color="#f43f5e" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
