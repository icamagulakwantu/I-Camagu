import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Skeleton, StokvelCardSkeleton, StokvelDetailSkeleton } from '../components/ui/Skeleton.jsx'

const STOKVEL_TYPES = [
  'ALCOHOL_BULK_POOL',
  'UMGALELO_ROTATING',
  'CEREMONY_SAVINGS',
  'EXISTING_STOKVEL_UPGRADE',
  'RECIPROCAL_GIFTING'
]

const cardBase = "bg-white border-2 border-ink rounded-soft p-4 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
const cardHover = "hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] hover:border-sage-400/30"
const cardActive = "active:scale-[0.98] active:shadow-none"
const pressable = "transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none"
const inputStyle = "w-full border border-ink/30 rounded-soft px-3 py-2 text-sm focus:outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20"

function Stokvels({ onBack }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()

  const [view, setView] = useState('list')
  const [myStokvels, setMyStokvels] = useState([])
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Form states
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('UMGALELO_ROTATING')
  const [newContribution, setNewContribution] = useState('')
  const [joinId, setJoinId] = useState('')

  // Submit states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [confirmingId, setConfirmingId] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Detail action states
  const [contribAmount, setContribAmount] = useState('')
  const [contribNote, setContribNote] = useState('')
  const [payoutAmount, setPayoutAmount] = useState('')
  const [announcements, setAnnouncements] = useState([])
  const [newAnnouncement, setNewAnnouncement] = useState('')

  const fetchMyStokvels = async () => {
    try {
      const res = await fetch('/api/stokvels/my', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Failed to fetch stokvels (${res.status})`)
      }
      const data = await res.json()
      setMyStokvels(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
      setMyStokvels([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMyStokvels()
  }, [])

  const fetchDetail = async (stokvelId) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/stokvels/${stokvelId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to load stokvel details')
      }
      const data = await res.json()
      setDetail(data)
      const announcementRes = await fetch(`/api/stokvels/${stokvelId}/announcements`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const announcementData = await announcementRes.json()
      setAnnouncements(Array.isArray(announcementData) ? announcementData : [])
      setView('detail')
    } catch (err) {
      setError(err.message)
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const postAnnouncement = async (e) => {
    e.preventDefault()
    if (!detail?.stokvel?.id || !newAnnouncement.trim()) return
    try {
      const res = await fetch('/api/stokvels/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ stokvelId: detail.stokvel.id, message: newAnnouncement.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not post announcement')
      setNewAnnouncement('')
      setAnnouncements(prev => [data, ...prev])
      showToast('Announcement posted', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const createStokvel = async (e) => {
    e.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    setError('')
    try {
      const parsedContrib = newContribution ? parseFloat(newContribution) : null
      if (newContribution && isNaN(parsedContrib)) {
        throw new Error('Please enter a valid contribution amount')
      }

      const res = await fetch('/api/stokvels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          name: newName.trim(),
          type: newType,
          contributionAmount: parsedContrib
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create stokvel')

      setNewName('')
      setNewContribution('')
      await fetchMyStokvels()
      setView('list')
      showToast('Stokvel created successfully', 'success')
    } catch (err) {
      setError(err.message)
      showToast(err.message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const joinStokvel = async (e) => {
    e.preventDefault()
    if (isJoining) return
    const trimmedId = joinId.trim()
    if (!trimmedId) {
      setError('Please enter a valid Stokvel ID')
      return
    }

    setIsJoining(true)
    setError('')
    try {
      const res = await fetch('/api/stokvels/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ stokvelId: trimmedId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to join stokvel')

      setJoinId('')
      await fetchMyStokvels()
      setView('list')
      showToast('Joined stokvel successfully', 'success')
    } catch (err) {
      setError(err.message)
      showToast(err.message, 'error')
    } finally {
      setIsJoining(false)
    }
  }

  const submitContribution = async (e) => {
    e.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    setError('')
    try {
      const numericAmount = parseFloat(contribAmount)
      if (isNaN(numericAmount) || numericAmount <= 0) {
        throw new Error('Please enter a valid amount')
      }

      const res = await fetch('/api/stokvels/contributions/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          stokvelId: detail.stokvel.id,
          amount: numericAmount,
          proofNote: contribNote.trim()
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Contribution submission failed')

      setContribAmount('')
      setContribNote('')
      showToast('Contribution submitted', 'success')
      await fetchDetail(detail.stokvel.id)
    } catch (err) {
      setError(err.message)
      showToast(err.message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmContribution = async (contributionId) => {
  const pin = prompt('Enter your security PIN to confirm this contribution:')
  if (!pin) return
  try {
    const res = await fetch('/api/stokvels/contributions/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ contributionId, pin }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    showToast('Contribution confirmed', 'success')
    fetchDetail(detail.stokvel.id)
  } catch (err) {
    showToast(err.message, 'error')
  }
}

  const requestPayout = async (e) => {
    e.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    setError('')
    try {
      const numericAmount = parseFloat(payoutAmount)
      if (isNaN(numericAmount) || numericAmount <= 0) {
        throw new Error('Please enter a valid payout amount')
      }

      const res = await fetch('/api/stokvels/payouts/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          stokvelId: detail.stokvel.id,
          amount: numericAmount
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Payout request failed')

      setPayoutAmount('')
      showToast('Payout requested', 'success')
      await fetchDetail(detail.stokvel.id)
    } catch (err) {
      setError(err.message)
      showToast(err.message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const approvePayout = async (payoutId) => {
    const pin = prompt('Enter your security PIN to approve this payout:')
    if (pin === null) return
    if (!pin.trim()) {
      showToast('Security PIN is required', 'error')
      return
    }

    try {
      const res = await fetch('/api/stokvels/payouts/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ payoutId, pin }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Payout approval failed')

      showToast(data.message || 'Payout approved', 'success')
      await fetchDetail(detail.stokvel.id)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const deleteStokvel = async () => {
    if (isDeleting) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/stokvels/${detail.stokvel.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Deletion failed')

      showToast('Stokvel deleted', 'info')
      setConfirmDelete(false)
      setDetail(null)
      setView('list')
      await fetchMyStokvels()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  // --- VIEW: CREATE STOKVEL ---
  if (view === 'create') {
    return (
      <div className="min-h-screen pb-24 bg-cream px-4 pt-6">
        <button
          type="button"
          onClick={() => { setError(''); setView('list'); }}
          className={`text-sm text-ink-muted mb-4 ${pressable}`}
        >
          ← Back
        </button>
        <h2 className="font-display font-bold text-2xl text-ink mb-4">Create Stokvel</h2>
        <form onSubmit={createStokvel} className={`${cardBase} space-y-3`}>
          <input
            type="text"
            placeholder="Stokvel name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className={inputStyle}
            required
            minLength={2}
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            className={inputStyle}
          >
            {STOKVEL_TYPES.map(t => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Contribution amount (ZAR, optional)"
            value={newContribution}
            onChange={(e) => setNewContribution(e.target.value)}
            className={inputStyle}
            min="0"
            step="any"
          />
          {error && <p className="text-terracotta text-sm animate-fade-in">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full bg-sage-500 text-white font-bold py-3 rounded-pill ${pressable}`}
          >
            {isSubmitting ? 'Creating...' : 'Create'}
          </button>
        </form>
      </div>
    )
  }

  // --- VIEW: JOIN STOKVEL ---
  if (view === 'join') {
    return (
      <div className="min-h-screen pb-24 bg-cream px-4 pt-6">
        <button
          type="button"
          onClick={() => { setError(''); setView('list'); }}
          className={`text-sm text-ink-muted mb-4 ${pressable}`}
        >
          ← Back
        </button>
        <h2 className="font-display font-bold text-2xl text-ink mb-4">Join Stokvel</h2>
        <form onSubmit={joinStokvel} className={`${cardBase} space-y-3`}>
          <input
            type="text"
            placeholder="Stokvel ID (ask the organiser)"
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            className={inputStyle}
            required
          />
          {error && <p className="text-terracotta text-sm animate-fade-in">{error}</p>}
          <button
            type="submit"
            disabled={isJoining}
            className={`w-full bg-sage-500 text-white font-bold py-3 rounded-pill ${pressable}`}
          >
            {isJoining ? 'Joining...' : 'Join'}
          </button>
        </form>
      </div>
    )
  }

  // --- VIEW: STOKVEL DETAIL ---
  if (view === 'detail') {
    if (loading) {
      return (
        <div className="min-h-screen pb-24 bg-cream px-4 pt-6">
          <StokvelDetailSkeleton />
        </div>
      )
    }

    if (!detail) return null

    const { stokvel, myReferenceCode, isOfficial, contributions = [], payouts = [] } = detail
    const myPending = contributions.filter(c => c.status === 'PENDING' && isOfficial)
    const rawBalance = Number(stokvel.groupLedger?.totalBalance || 0)
    const balance = isNaN(rawBalance) ? 0 : rawBalance

    return (
      <div className="min-h-screen pb-24 bg-cream">
        <div className="bg-gradient-to-br from-sage-500 to-sage-600 text-white px-5 pt-10 pb-6 rounded-b-[2.5rem] shadow-md">
          <button
            type="button"
            onClick={() => { setError(''); setView('list'); }}
            className={`text-sm text-white/80 mb-3 block ${pressable}`}
          >
            ← All stokvels
          </button>
          <h1 className="font-display font-bold text-2xl">{stokvel.name}</h1>
          <p className="text-white/70 text-xs uppercase mt-1 tracking-wider">{stokvel.type.replace(/_/g, ' ')}</p>
          <p className="text-white/90 text-sm mt-2">Ref: <strong className="font-mono bg-white/10 px-2 py-0.5 rounded">{myReferenceCode}</strong></p>
          <p className="font-display font-bold text-3xl mt-2">R{balance.toFixed(2)}</p>
          {isOfficial && <p className="text-xs text-white/90 font-bold mt-2 bg-white/20 inline-block px-2.5 py-1 rounded-pill">You are an official</p>}
        </div>

        <div className="px-4 mt-4 space-y-4">
          <div className="bg-white border-2 border-ink rounded-soft p-4">
            <p className="text-xs font-black uppercase text-ink-muted mb-2">Announcements</p>
            {isOfficial && (
              <form onSubmit={postAnnouncement} className="flex gap-2 mb-3">
                <input placeholder="Post an update..." value={newAnnouncement} onChange={(e) => setNewAnnouncement(e.target.value)}
                  className="flex-1 border border-ink/30 rounded-soft px-3 py-2 text-sm" required />
                <button type="submit" className="bg-sage-500 text-white font-bold px-4 rounded-pill text-sm">Post</button>
              </form>
            )}
            {announcements.length === 0 ? (
              <p className="text-xs text-ink-muted">No announcements yet.</p>
            ) : (
              <div className="space-y-2">
                {announcements.map((a) => (
                  <div key={a.id} className="bg-sage-50 rounded-soft p-2.5">
                    <p className="text-sm text-ink">{a.message}</p>
                    <p className="text-[10px] text-ink-muted mt-1">
                      {a.postedBy?.firstName} {a.postedBy?.lastName} · {new Date(a.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Contribution Form */}
          <form onSubmit={submitContribution} className="bg-white border-2 border-ink rounded-soft p-4 space-y-2">
            <p className="text-xs font-black uppercase text-ink-muted tracking-wider">Submit a contribution</p>
            <input
              type="number"
              placeholder="Amount (ZAR)"
              value={contribAmount}
              onChange={(e) => setContribAmount(e.target.value)}
              className={inputStyle}
              min="0.01"
              step="any"
              required
            />
            <input
              type="text"
              placeholder="Note (e.g. EFT reference)"
              value={contribNote}
              onChange={(e) => setContribNote(e.target.value)}
              className={inputStyle}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full bg-sage-500 text-white font-bold py-2.5 rounded-pill text-sm ${pressable}`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </form>

          {/* Pending Confirmations */}
          {isOfficial && myPending.length > 0 && (
            <div>
              <p className="text-xs font-black uppercase text-ink-muted mb-2 tracking-wider">Pending confirmations</p>
              {myPending.map((c) => (
                <div key={c.id} className="bg-white border-2 border-terracotta rounded-soft p-3 mb-2 flex justify-between items-center shadow-sm">
                  <span className="text-sm font-bold">R{Number(c.amount || 0).toFixed(2)}</span>
                  <button
                    type="button"
                    onClick={() => confirmContribution(c.id)}
                    disabled={confirmingId === c.id}
                    className={`bg-terracotta text-white text-xs font-bold px-3 py-1.5 rounded-pill ${pressable}`}
                  >
                    {confirmingId === c.id ? 'Confirming...' : 'Confirm'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Request Payout Form */}
          <form onSubmit={requestPayout} className="bg-white border-2 border-ink rounded-soft p-4 space-y-2">
            <p className="text-xs font-black uppercase text-ink-muted tracking-wider">Request a payout</p>
            <input
              type="number"
              placeholder="Amount (ZAR)"
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              className={inputStyle}
              min="0.01"
              step="any"
              required
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full bg-ink text-white font-bold py-2.5 rounded-pill text-sm ${pressable}`}
            >
              {isSubmitting ? 'Requesting...' : 'Request'}
            </button>
          </form>

          {/* Pending Payout Approvals */}
          {payouts.filter(p => p.status === 'PENDING_APPROVAL').length > 0 && (
            <div>
              <p className="text-xs font-black uppercase text-ink-muted mb-2 tracking-wider">Pending payouts</p>
              {payouts.filter(p => p.status === 'PENDING_APPROVAL').map((p) => (
                <div key={p.id} className="bg-white border-2 border-sage-500 rounded-soft p-3 mb-2 shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold">R{Number(p.amount || 0).toFixed(2)}</span>
                    <span className="text-xs text-ink-muted">{p.approvals?.length || 0} approval(s)</span>
                  </div>
                  {isOfficial && (
                    <button
                      type="button"
                      onClick={() => approvePayout(p.id)}
                      className={`w-full mt-2 bg-sage-500 text-white text-xs font-bold py-2 rounded-pill ${pressable}`}
                    >
                      Approve Payout
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Deletion Option when Balance is R0.00 */}
          {balance === 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className={`w-full border-2 border-terracotta text-terracotta font-bold py-2.5 rounded-pill text-sm ${pressable}`}
              >
                🗑️ Delete this stokvel
              </button>

              {confirmDelete && (
                <div className="mt-3 bg-white border-2 border-terracotta rounded-soft p-4 shadow-lg animate-fade-in">
                  <p className="text-sm font-bold text-ink mb-3">
                    Delete "{stokvel.name}" permanently? This action cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={deleteStokvel}
                      disabled={isDeleting}
                      className={`flex-1 bg-terracotta text-white font-bold py-2 rounded-pill text-sm ${pressable}`}
                    >
                      {isDeleting ? 'Deleting...' : 'Yes, delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      disabled={isDeleting}
                      className={`flex-1 border-2 border-ink font-bold py-2 rounded-pill text-sm ${pressable}`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // --- VIEW: STOKVEL LIST (DEFAULT) ---
  return (
    <div className="min-h-screen pb-24 bg-cream px-4 pt-6">
      <button
        type="button"
        onClick={() => onBack?.()}
        className={`text-sm text-ink-muted mb-4 ${pressable}`}
      >
        ← Back
      </button>
      <h2 className="font-display font-bold text-2xl text-ink mb-4">Stokvels</h2>
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => { setError(''); setView('create'); }}
          className={`flex-1 bg-sage-500 text-white font-bold py-2.5 rounded-pill text-sm ${pressable}`}
        >
          + Create
        </button>
        <button
          type="button"
          onClick={() => { setError(''); setView('join'); }}
          className={`flex-1 border-2 border-ink text-ink font-bold py-2.5 rounded-pill text-sm ${pressable}`}
        >
          Join
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          <StokvelCardSkeleton />
          <StokvelCardSkeleton />
        </div>
      ) : myStokvels.length === 0 ? (
        <EmptyState
          emoji="🏘️"
          title="No stokvels yet"
          description="Join a community savings group or start your own to pool resources together."
          primaryLabel="Create Stokvel"
          onPrimary={() => setView('create')}
          secondaryLabel="Join with Code"
          onSecondary={() => setView('join')}
        />
      ) : (
        <div className="space-y-2">
          {myStokvels.map((m) => (
            <button
              key={m.id || m.stokvelId}
              type="button"
              onClick={() => fetchDetail(m.stokvelId)}
              className={`w-full text-left ${cardBase} ${cardHover} ${cardActive}`}
            >
              <p className="font-bold text-sm text-ink">{m.stokvel?.name || 'Unnamed Stokvel'}</p>
              <p className="text-xs text-ink-muted mt-0.5">
                {(m.stokvel?.type || 'UNKNOWN').replace(/_/g, ' ')} • {m.stokvel?._count?.members || 0} members
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default Stokvels
