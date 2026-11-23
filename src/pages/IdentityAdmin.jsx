import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import Icon from '../components/Icon.jsx'

function IdentityAdmin({ onBack }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [rejecting, setRejecting] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [zoomed, setZoomed] = useState(null)

  const fetchPending = () => {
    fetch('/api/identity/pending', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(async (res) => {
        if (res.status === 403) { setForbidden(true); return }
        const data = await res.json()
        if (!res.ok) throw new Error()
        setPending(Array.isArray(data) ? data : [])
      })
      .catch(() => showToast('Could not load pending verifications', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchPending() }, [])

  const review = async (userId, approve, reason) => {
    try {
      const res = await fetch('/api/identity/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ userId, approve, rejectionReason: reason }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Could not record review')
      showToast(approve ? 'ID verified' : 'ID rejected', 'success')
      setRejecting(null)
      setRejectionReason('')
      fetchPending()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  if (loading) return <div className="p-4 space-y-3"><Skeleton className="h-20 w-full rounded-soft" /><Skeleton className="h-20 w-full rounded-soft" /></div>

  if (forbidden) {
    return (
      <div className="min-h-screen bg-cream px-4 pt-10">
        <button onClick={onBack} className="text-sm text-ink-muted mb-4 block">← Back</button>
        <EmptyState emoji="🔒" title="Admins only" description="This screen is restricted to i-Camagu admins." />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 bg-cream px-4 pt-6">
      <button onClick={onBack} className="text-sm text-ink-muted mb-4">← Back</button>
      <h2 className="font-display font-bold text-2xl text-ink mb-4">Identity Verification — Review</h2>

      {pending.length === 0 ? (
        <EmptyState emoji="🪪" title="Nothing pending" description="Submitted ID verifications will appear here for review." />
      ) : (
        <div className="space-y-3">
          {pending.map((p) => (
            <div key={p.id} className="bg-white border-2 border-terracotta/25 rounded-soft p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-bold text-sm">{p.firstName} {p.lastName}</p>
                  <p className="text-xs text-ink-muted">{p.email}</p>
                  <p className="text-xs text-ink-muted mt-1">Submitted {new Date(p.submittedAt).toLocaleDateString()}</p>
                </div>
                <p className="font-mono font-bold text-sm tracking-wider bg-cream px-2 py-1 rounded-soft">{p.idNumber}</p>
              </div>

              <div className={`grid gap-2 mb-3 ${p.idDocumentBackUrl ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <div>
                  <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-1">Profile photo</p>
                  <div className="w-full aspect-square rounded-soft bg-cream overflow-hidden flex items-center justify-center">
                    {p.profileImage ? <img src={p.profileImage} alt="Profile" className="w-full h-full object-cover" /> : <Icon name="user" size={28} color="#8a8278" />}
                  </div>
                </div>
                {[
                  [p.idDocumentUrl, p.idDocumentType === 'GREEN_BOOK' ? 'ID book, photo page' : p.idDocumentType === 'SMART_ID' ? 'Smart ID, front' : 'ID document'],
                  ...(p.idDocumentBackUrl ? [[p.idDocumentBackUrl, 'Smart ID, back']] : []),
                ].map(([src, label]) => (
                  <div key={label}>
                    <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-1">{label}</p>
                    {/* The whole document, never cropped; tap to read it full size. */}
                    <button type="button" disabled={!src} onClick={() => setZoomed({ src, label })} className="w-full aspect-square rounded-soft bg-cream overflow-hidden flex items-center justify-center">
                      {src ? <img src={src} alt={label} className="w-full h-full object-contain" /> : <Icon name="file" size={28} color="#8a8278" />}
                    </button>
                  </div>
                ))}
              </div>

              {rejecting === p.id ? (
                <div className="space-y-2">
                  <input
                    placeholder="Reason for rejection"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => review(p.id, false, rejectionReason)} className="flex-1 bg-terracotta text-white font-bold py-2 rounded-pill text-sm">Confirm rejection</button>
                    <button onClick={() => { setRejecting(null); setRejectionReason('') }} className="flex-1 border-2 border-terracotta/25 font-bold py-2 rounded-pill text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => review(p.id, true)} className="flex-1 bg-sage-500 text-white font-bold py-2 rounded-pill text-sm flex items-center justify-center gap-1">
                    <Icon name="check" size={14} color="#fff" /> Approve
                  </button>
                  <button onClick={() => setRejecting(p.id)} className="flex-1 border-2 border-terracotta text-terracotta font-bold py-2 rounded-pill text-sm">
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {zoomed && (
        <div role="dialog" aria-modal="true" aria-label={zoomed.label} onClick={() => setZoomed(null)} className="fixed inset-0 z-50 flex flex-col bg-black/90 p-3">
          <div className="flex items-center justify-between pb-2 text-white">
            <p className="text-sm font-bold">{zoomed.label}</p>
            <button type="button" onClick={() => setZoomed(null)} className="min-h-11 px-3 text-sm font-bold">Close</button>
          </div>
          <img src={zoomed.src} alt={zoomed.label} className="min-h-0 flex-1 object-contain" />
        </div>
      )}
    </div>
  )
}

export default IdentityAdmin
