import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import { cn } from '../lib/utils'
import Icon from '../components/Icon.jsx'
import { uploadPortalMedia, checkFile, UploadError } from '../lib/mediaUpload.js'

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none'

export default function Portal({ onBack }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  
  const [portals, setPortals] = useState([])
  const [activePortal, setActivePortal] = useState(null)
  const [newTitle, setNewTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(null) // { current, total, fraction }
  const [viewing, setViewing] = useState(null) // media item open full-screen
  const [selectedType, setSelectedType] = useState('all')
  const fileInputRef = useRef(null)

  // Fetch all portals for user
  const fetchPortals = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/portals/my', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (!res.ok) throw new Error('Failed to load portals')
      const data = await res.json()
      setPortals(Array.isArray(data) ? data : [])
    } catch (err) {
      showToast(err.message, 'error')
      setPortals([])
    } finally {
      setLoading(false)
    }
  }, [accessToken, showToast])

  useEffect(() => {
    fetchPortals()
  }, [fetchPortals])

  // Create new portal container
  const createPortal = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    try {
      const res = await fetch('/api/portals', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${accessToken}` 
        },
        body: JSON.stringify({ title: newTitle, visibility: 'FAMILY_PRIVATE' }),
      })
      const portal = await res.json()
      if (!res.ok) throw new Error(portal.error || 'Failed to create portal')
      
      setNewTitle('')
      setPortals(prev => [portal, ...prev])
      setActivePortal({ ...portal, media: [] })
      showToast('Portal created successfully', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  // Upload one or more files, one at a time, with a progress bar.
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || [])
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (files.length === 0 || !activePortal) return

    const portalId = activePortal.id
    let saved = 0
    let lastError = null
    setUploading(true)

    for (const [index, file] of files.entries()) {
      const problem = checkFile(file)
      if (problem) { lastError = new UploadError(`${file.name}: ${problem}`); continue }
      setProgress({ current: index + 1, total: files.length, fraction: 0 })
      try {
        const media = await uploadPortalMedia({
          portalId,
          file,
          accessToken,
          onProgress: (fraction) => setProgress({ current: index + 1, total: files.length, fraction }),
        })
        saved += 1
        setActivePortal(prev => (prev?.id === portalId
          ? { ...prev, media: [...(prev.media || []).filter(m => m.id !== media.id), media] }
          : prev))
      } catch (err) {
        lastError = err
        if (err.reason === 'SESSION_EXPIRED' || err.reason === 'OFFLINE') break
      }
    }

    setUploading(false)
    setProgress(null)
    if (saved > 0) {
      showToast(saved === 1 ? 'Memory saved to archive' : `${saved} memories saved to archive`, 'success')
    }
    if (lastError) {
      // The short reference lets support tell causes apart from a screenshot.
      showToast(lastError.reason ? `${lastError.message} (Ref: ${lastError.reason})` : lastError.message, 'error')
    }
  }

  // Soft delete media item
  const deleteMedia = async (mediaId) => {
    try {
      const res = await fetch(`/api/portals/media/${mediaId}/delete`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (!res.ok) throw new Error('Delete failed')

      setActivePortal(prev => ({
        ...prev,
        media: prev.media.filter(m => m.id !== mediaId)
      }))
      setViewing(null)
      showToast('Moved memory to trash', 'info')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  // Filter media inside active portal
  const filteredMedia = (activePortal?.media || []).filter(m => {
    if (selectedType === 'photo') return m.mediaType === 'PHOTO'
    if (selectedType === 'video') return m.mediaType === 'VIDEO'
    return true
  })

  // ACTIVE PORTAL VIEW
  if (activePortal) {
    return (
      <div className="min-h-screen pb-24 bg-cream">
        {/* Header */}
        <div className="bg-gradient-to-br from-sage-500 to-sage-600 text-white px-5 pt-12 pb-8 rounded-b-[2.5rem] relative overflow-hidden">
          <div className="absolute -top-1/4 -right-1/4 w-64 h-64 bg-white/5 rounded-full" />
          <div className="relative">
            <button 
              type="button" 
              onClick={() => { setActivePortal(null); fetchPortals(); }} 
              className={`text-sm text-white/70 mb-3 block ${pressable}`}
            >
              ← All portals
            </button>
            <h1 className="font-display font-bold text-3xl">{activePortal.title}</h1>
            <p className="text-white/70 text-sm mt-1">A generational archive for your family</p>
          </div>
        </div>

        {/* Upload Button */}
        <div className="px-4 mt-5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={`w-full bg-terracotta text-white font-bold py-3.5 rounded-pill shadow-glow flex items-center justify-center gap-2 ${pressable}`}
          >
            <Icon name="camera" size={18} />
            {uploading
              ? (progress?.total > 1 ? `Saving ${progress.current} of ${progress.total}...` : 'Saving memory...')
              : 'Add photos or videos'}
          </button>
          {uploading && progress && (
            <div className="mt-2 h-1.5 w-full rounded-full bg-cream-dark overflow-hidden" role="progressbar" aria-valuenow={Math.round(progress.fraction * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-sage-500 transition-[width] duration-200" style={{ width: `${Math.max(4, Math.round(progress.fraction * 100))}%` }} />
            </div>
          )}
        </div>

        {/* Media Type Filter */}
        <div className="flex gap-2 px-4 mt-3 overflow-x-auto no-scrollbar pb-2">
          {['all', 'photo', 'video'].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedType(t)}
              className={cn(
                'flex-shrink-0 px-4 py-2 rounded-pill text-xs font-bold transition-all active:scale-95',
                selectedType === t 
                  ? 'bg-ink text-white' 
                  : 'bg-white border-2 border-cream-dark text-ink-muted hover:border-sage-300'
              )}
            >
              {t === 'all' ? 'All' : t === 'photo' ? 'Photos' : 'Videos'}
            </button>
          ))}
        </div>

        {/* Media Grid */}
        <div className="px-4 mt-4">
          {filteredMedia.length === 0 ? (
            <EmptyState
              icon="image"
              title="No memories in this portal"
              description="Upload the first photo or video to preserve this ceremony for future generations."
              primaryLabel="Upload First Memory"
              onPrimary={() => fileInputRef.current?.click()}
              className="border-2 border-terracotta/25"
            />
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {filteredMedia.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setViewing(m)}
                  aria-label={m.mediaType === 'VIDEO' ? 'Open video' : 'Open photo'}
                  className="relative aspect-square bg-cream-dark border-2 border-terracotta/25 rounded-soft overflow-hidden active:scale-[0.97] transition-transform"
                >
                  {!m.url ? (
                    <span className="flex h-full w-full items-center justify-center text-ink-muted">
                      <Icon name="image" size={22} />
                    </span>
                  ) : m.mediaType === 'VIDEO' ? (
                    <>
                      <video src={`${m.url}#t=0.1`} muted playsInline preload="metadata" className="w-full h-full object-cover pointer-events-none" />
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="h-9 w-9 rounded-full bg-black/55 text-white flex items-center justify-center">
                          <Icon name="video" size={16} />
                        </span>
                      </span>
                    </>
                  ) : (
                    <img src={m.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="h-8" />

        {/* Full-screen viewer: works by tap on phones (the old hover-only delete button never showed there). */}
        {viewing && (
          <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between px-4 pt-6 pb-3">
              <button type="button" onClick={() => setViewing(null)} aria-label="Close" className={`h-10 w-10 rounded-full bg-white/10 text-white flex items-center justify-center ${pressable}`}>
                <Icon name="close" size={20} />
              </button>
              <button type="button" onClick={() => deleteMedia(viewing.id)} className={`h-10 px-4 rounded-pill bg-white/10 text-white text-sm font-bold flex items-center gap-2 ${pressable}`}>
                <Icon name="trash" size={16} /> Move to trash
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center px-2 pb-8 min-h-0">
              {viewing.mediaType === 'VIDEO' ? (
                <video src={viewing.url} controls autoPlay playsInline className="max-h-full max-w-full rounded-soft" />
              ) : (
                <img src={viewing.url} alt="" className="max-h-full max-w-full object-contain rounded-soft" />
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // MAIN PORTALS LIST VIEW
  return (
    <div className="min-h-screen pb-24 bg-cream">
      {/* Header */}
      <div className="bg-gradient-to-br from-sage-500 to-sage-600 text-white px-5 pt-12 pb-8 rounded-b-[2.5rem] relative overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-64 h-64 bg-white/5 rounded-full" />
        <div className="relative">
          <button type="button" onClick={onBack} className={`text-sm text-white/70 mb-3 block ${pressable}`}>← Back</button>
          <h1 className="font-display font-bold text-3xl">Digital Portal</h1>
          <p className="text-white/70 text-sm mt-1">Generational family archives</p>
        </div>
      </div>

      <div className="px-4 mt-5">
        {/* Create Portal Form */}
        <form onSubmit={createPortal} className="bg-white border-2 border-terracotta/25 rounded-soft p-4 mb-4 shadow-soft space-y-3">
          <p className="text-xs font-extrabold text-ink-muted uppercase tracking-wider">Create New Portal</p>
          <input
            type="text"
            placeholder="e.g. Lindani's Umgidi — 2026"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full border border-ink/30 rounded-soft px-3 py-2.5 text-sm focus:outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20"
            required
          />
          <button type="submit" className={`w-full bg-sage-500 text-white font-bold py-2.5 rounded-pill ${pressable}`}>
            + Create Portal
          </button>
        </form>

        {/* Portals List */}
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full rounded-soft" />
            <Skeleton className="h-20 w-full rounded-soft" />
          </div>
        ) : portals.length === 0 ? (
          <EmptyState
            icon="image"
            title="No portals created yet"
            description="Create a portal above to archive family photos, videos, and ceremony memories."
            className="border-2 border-terracotta/25"
          />
        ) : (
          <div className="space-y-2">
            {portals.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActivePortal(p)}
                className={`w-full text-left bg-white border-2 border-terracotta/25 rounded-soft p-4 shadow-soft flex justify-between items-center ${pressable}`}
              >
                <div>
                  <p className="font-bold text-base text-ink">{p.title}</p>
                  <p className="text-xs text-ink-muted mt-0.5">{p.media?.length || 0} memories archived</p>
                </div>
                <span className="text-lg">→</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="h-8" />
    </div>
  )
}
