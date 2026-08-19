import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { shareToWhatsApp } from '../lib/whatsapp.js'
import { useToast } from '../components/ui/Toast.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import { cn } from '../lib/utils'

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none'

export default function Ukugida({ onBack }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    type: 'given',
    item: '',
    quantity: '',
    unit: 'bottle',
    personName: '',
    occasion: '',
    notes: '',
  })

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/reciprocity/my', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (!res.ok) throw new Error('Failed to load entries')
      const data = await res.json()
      setEntries(Array.isArray(data) ? data : [])
    } catch (err) {
      showToast(err.message, 'error')
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [accessToken, showToast])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const addEntry = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/reciprocity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      fetchEntries()
      setShowForm(false)
      setForm({ type: 'given', item: '', quantity: '', unit: 'bottle', personName: '', occasion: '', notes: '' })
      showToast('Entry recorded', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const balance = entries.reduce((acc, e) => {
    const val = parseFloat(e.quantity) || 0
    return e.type === 'received' ? acc + val : acc - val
  }, 0)

  return (
    <div className="min-h-screen pb-24 bg-cream">
      {/* Header */}
      <div className="bg-gradient-to-br from-sage-500 to-sage-600 text-white px-5 pt-12 pb-8 rounded-b-[2.5rem] relative overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-64 h-64 bg-white/5 rounded-full" />
        <div className="relative">
          <button type="button" onClick={onBack} className={`text-sm text-white/70 mb-3 block ${pressable}`}>← Back</button>
          <h1 className="font-display font-bold text-3xl">Ukugida</h1>
          <p className="text-white/70 text-sm mt-1">Track gifts given and received</p>
          <div className="mt-4 bg-white/10 backdrop-blur rounded-soft p-3 border border-white/20">
            <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Net Balance</p>
            <p className={cn(
              'font-display font-bold text-2xl mt-1',
              balance >= 0 ? 'text-white' : 'text-terracotta-light'
            )}>
              {balance >= 0 ? '+' : ''}{balance} bottles
            </p>
          </div>
        </div>
      </div>

      {/* Toggle */}
      <div className="px-4 mt-5">
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className={`w-full bg-sage-500 text-white font-bold py-3 rounded-pill shadow-glow ${pressable}`}
        >
          {showForm ? '✕ Cancel' : '+ Record Gift'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={addEntry} className="px-4 mt-4 bg-white border-2 border-ink rounded-soft p-5 shadow-soft space-y-3 animate-fade-in">
          <div className="flex gap-2">
            {['given', 'received'].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setForm(p => ({ ...p, type: t }))}
                className={cn(
                  'flex-1 py-2.5 rounded-soft text-xs font-bold capitalize transition-all',
                  form.type === t ? 'bg-sage-500 text-white shadow-glow' : 'bg-cream text-ink-muted border-2 border-cream-dark'
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Item (e.g. Whiskey, Beer)"
            value={form.item}
            onChange={(e) => setForm(p => ({ ...p, item: e.target.value }))}
            className="w-full h-12 border-2 border-cream-dark rounded-soft px-4 text-sm focus:outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20"
            required
          />

          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Qty"
              value={form.quantity}
              onChange={(e) => setForm(p => ({ ...p, quantity: e.target.value }))}
              className="w-24 h-12 border-2 border-cream-dark rounded-soft px-4 text-sm focus:outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20"
              required
            />
            <select
              value={form.unit}
              onChange={(e) => setForm(p => ({ ...p, unit: e.target.value }))}
              className="flex-1 h-12 border-2 border-cream-dark rounded-soft px-4 text-sm bg-white focus:outline-none focus:border-sage-500"
            >
              <option value="bottle">Bottle</option>
              <option value="case">Case</option>
              <option value="crate">Crate</option>
            </select>
          </div>

          <input
            type="text"
            placeholder="Person (e.g. Uncle Bongani)"
            value={form.personName}
            onChange={(e) => setForm(p => ({ ...p, personName: e.target.value }))}
            className="w-full h-12 border-2 border-cream-dark rounded-soft px-4 text-sm focus:outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20"
            required
          />

          <input
            type="text"
            placeholder="Occasion (e.g. Umgidi waThemba)"
            value={form.occasion}
            onChange={(e) => setForm(p => ({ ...p, occasion: e.target.value }))}
            className="w-full h-12 border-2 border-cream-dark rounded-soft px-4 text-sm focus:outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20"
          />

          <button type="submit" className={`w-full bg-terracotta text-white font-bold py-3 rounded-pill shadow-terracotta ${pressable}`}>
            Save Entry
          </button>
        </form>
      )}

      <button
        onClick={() => {
            const summary = `My Ukugida (reciprocity) record:\n\n` +
                  entries.map(e => `${e.direction === 'GIVEN' ? '→ Gave' : '← Received'}: ${e.itemDescription} ${e.counterpartyName ? `(${e.direction === 'GIVEN' ? 'to' : 'from'} ${e.counterpartyName})` : ''}`).join('\n') +
                        `\n\nTracked on iCamagu 🌾`
                            shareToWhatsApp(summary)
                              }}
                                className="w-full bg-[#25D366] text-white font-bold py-2.5 rounded-pill text-sm mb-4"
                                >
                                  💬 Share on WhatsApp
                                  </button>

      {/* Entries List */}
      <div className="px-4 mt-6">
        <h3 className="text-xs font-extrabold text-ink-muted uppercase tracking-wider mb-3">History</h3>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full rounded-soft" />
            <Skeleton className="h-20 w-full rounded-soft" />
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            emoji="🎁"
            title="No entries yet"
            description="Track what your family gives and receives. Build reciprocity for generations."
            primaryLabel="Record First Gift"
            onPrimary={() => setShowForm(true)}
            className="border-2 border-ink"
          />
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className={cn(
                  'bg-white border-2 rounded-soft p-4 shadow-soft flex items-start gap-3',
                  entry.type === 'received' ? 'border-sage-300' : 'border-ink/10'
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0',
                  entry.type === 'received' ? 'bg-sage-50' : 'bg-cream-dark'
                )}>
                  {entry.type === 'received' ? '📥' : '📤'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-sm text-ink truncate">{entry.item}</p>
                    <span className={cn(
                      'text-xs font-bold px-2 py-0.5 rounded-pill',
                      entry.type === 'received' ? 'bg-sage-50 text-sage-700' : 'bg-cream-dark text-ink-muted'
                    )}>
                      {entry.quantity} {entry.unit}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {entry.type === 'received' ? 'From' : 'To'}: <strong className="text-ink">{entry.personName}</strong>
                  </p>
                  {entry.occasion && <p className="text-[11px] text-ink-muted mt-0.5">{entry.occasion}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-8" />
    </div>
  )
}
