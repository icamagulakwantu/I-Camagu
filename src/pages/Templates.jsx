import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'

function Templates({ onBack }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [templates, setTemplates] = useState([])
  const [activeTemplate, setActiveTemplate] = useState(null)
  const [newTitle, setNewTitle] = useState('')

  const fetchTemplates = () => {
    fetch('/api/ceremonies/templates/my', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(res => res.json())
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => { showToast('Could not load templates', 'error'); setTemplates([]) })
  }

  useEffect(() => { fetchTemplates() }, [])

  const createFromTemplate = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/ceremonies/templates/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ templateId: activeTemplate.id, newTitle }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast(`"${newTitle}" created from template`, 'success')
      setActiveTemplate(null)
      setNewTitle('')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  if (activeTemplate) {
    return (
      <div className="min-h-screen pb-24 bg-cream px-4 pt-6">
        <button onClick={() => setActiveTemplate(null)} className="text-sm text-ink-muted mb-4">← All templates</button>
        <h2 className="font-display font-bold text-2xl text-ink mb-4">{activeTemplate.title}</h2>
        <form onSubmit={createFromTemplate} className="bg-white border-2 border-terracotta/25 rounded-soft p-4 space-y-2">
          <input placeholder="Title for the new ceremony plan" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
            className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm" required />
          <button type="submit" className="w-full bg-sage-500 text-white font-bold py-2.5 rounded-pill text-sm">Create Plan From This Template</button>
        </form>
        <p className="text-xs text-ink-muted mt-4 mb-2">{activeTemplate.checklistItems.length} checklist items will be copied</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 bg-cream px-4 pt-6">
      <button onClick={onBack} className="text-sm text-ink-muted mb-4">← Back</button>
      <h2 className="font-display font-bold text-2xl text-ink mb-1">My Templates</h2>
      <p className="text-xs text-ink-muted mb-4">Save a ceremony plan's structure once, reuse it for the next one.</p>

      {templates.length === 0 ? (
        <EmptyState emoji="📑" title="No templates yet" description="Save a completed plan as a template from Ceremony Preparation." />
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <button key={t.id} onClick={() => setActiveTemplate(t)} className="w-full text-left bg-white border-2 border-terracotta/25 rounded-soft p-3">
              <p className="font-bold text-sm">{t.title}</p>
              <p className="text-xs text-ink-muted">{t.ceremonyType.replace(/_/g, ' ')} • {t.checklistItems.length} items</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default Templates