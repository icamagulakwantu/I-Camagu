import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Skeleton, StokvelCardSkeleton, StokvelDetailSkeleton } from '../components/ui/Skeleton.jsx'
import Icon from '../components/Icon.jsx'

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

function Stokvels({ onBack, onOpenShrineFund }) {
  const { accessToken, user } = useAuth()
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
  const [interestAmount, setInterestAmount] = useState('')
  const [recordingInterest, setRecordingInterest] = useState(false)
  const [togglingBereavement, setTogglingBereavement] = useState(false)
  const [editingDetails, setEditingDetails] = useState(false)
  const [editName, setEditName] = useState('')
  const [editContribution, setEditContribution] = useState('')
  const [editFrequency, setEditFrequency] = useState('')
  const [editTargetAmount, setEditTargetAmount] = useState('')
  const [editTargetDate, setEditTargetDate] = useState('')
  const [savingDetails, setSavingDetails] = useState(false)
  const [editingRotation, setEditingRotation] = useState(false)
  const [rotationDraft, setRotationDraft] = useState([])
  const [savingRotation, setSavingRotation] = useState(false)

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

  const recordInterest = async (e) => {
    e.preventDefault()
    if (!detail?.stokvel?.id || !interestAmount) return
    setRecordingInterest(true)
    try {
      const res = await fetch('/api/stokvels/interest/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ stokvelId: detail.stokvel.id, amount: interestAmount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not record interest')
      setInterestAmount('')
      showToast(data.message || 'Interest recorded', 'success')
      await fetchDetail(detail.stokvel.id)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setRecordingInterest(false)
    }
  }

  const toggleBereavement = async () => {
    if (!detail?.stokvel?.id) return
    setTogglingBereavement(true)
    try {
      const res = await fetch('/api/stokvels/bereavement/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ stokvelId: detail.stokvel.id, active: !detail.stokvel.bereavementActive }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not update bereavement status')
      showToast(data.message || 'Updated', 'success')
      await fetchDetail(detail.stokvel.id)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setTogglingBereavement(false)
    }
  }

  const openEditDetails = () => {
    setEditName(detail.stokvel.name || '')
    setEditContribution(detail.stokvel.contributionAmount != null ? String(detail.stokvel.contributionAmount) : '')
    setEditFrequency(detail.stokvel.contributionFrequency || '')
    setEditTargetAmount(detail.stokvel.targetAmount != null ? String(detail.stokvel.targetAmount) : '')
    setEditTargetDate(detail.stokvel.targetDate ? detail.stokvel.targetDate.slice(0, 10) : '')
    setEditingDetails(true)
  }

  const saveStokvelDetails = async (e) => {
    e.preventDefault()
    if (savingDetails) return
    setSavingDetails(true)
    try {
      const res = await fetch(`/api/stokvels/${detail.stokvel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          name: editName.trim(),
          contributionAmount: editContribution,
          contributionFrequency: editFrequency.trim(),
          targetAmount: editTargetAmount,
          targetDate: editTargetDate,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not update stokvel')
      showToast(data.message || 'Stokvel updated', 'success')
      setEditingDetails(false)
      await fetchDetail(detail.stokvel.id)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSavingDetails(false)
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

  const startEditingRotation = () => {
    const existing = Array.isArray(detail.stokvel.rotationOrder) ? detail.stokvel.rotationOrder : []
    const memberIds = detail.stokvel.members.map(m => m.userId)
    // Start from the saved order (filtered to current members), then append
    // any members not yet in it, so adding a new member doesn't lose the order.
    const ordered = existing.filter(id => memberIds.includes(id))
    const missing = memberIds.filter(id => !ordered.includes(id))
    setRotationDraft([...ordered, ...missing])
    setEditingRotation(true)
  }

  const moveInRotation = (index, direction) => {
    setRotationDraft((prev) => {
      const next = [...prev]
      const target = index + direction
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const saveRotationOrder = async () => {
    setSavingRotation(true)
    try {
      const res = await fetch(`/api/stokvels/${detail.stokvel.id}/rotation-order`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ order: rotationDraft }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save rotation order')

      showToast('Rotation order saved', 'success')
      setEditingRotation(false)
      await fetchDetail(detail.stokvel.id)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSavingRotation(false)
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
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(stokvel.id)
              showToast('Stokvel ID copied — share it with people you want to invite', 'success')
            }}
            className={`text-xs text-white/80 mt-1.5 flex items-center gap-1 ${pressable}`}
          >
<Icon name="copy" size={13} color="#fff" /> Copy Stokvel ID to invite members
          </button>
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

          {/* Rotation Order (umgalelo stokvels only) */}
          {stokvel.type === 'UMGALELO_ROTATING' && (
            <div className="bg-white border-2 border-ink rounded-soft p-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-black uppercase text-ink-muted tracking-wider">Rotation Order</p>
                {isOfficial && !editingRotation && (
                  <button type="button" onClick={startEditingRotation} className="text-xs text-sage-600 font-bold underline">
                    {Array.isArray(stokvel.rotationOrder) && stokvel.rotationOrder.length > 0 ? 'Edit' : 'Set order'}
                  </button>
                )}
              </div>

              {editingRotation ? (
                <div className="space-y-2">
                  {rotationDraft.map((mUserId, idx) => {
                    const member = stokvel.members.find(m => m.userId === mUserId)
                    const name = member ? `${member.user.firstName} ${member.user.lastName}` : 'Unknown member'
                    return (
                      <div key={mUserId} className="flex items-center justify-between bg-cream rounded-soft px-3 py-2">
                        <span className="text-sm font-bold text-ink">{idx + 1}. {name}</span>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => moveInRotation(idx, -1)} disabled={idx === 0}
                            className="w-7 h-7 rounded-pill bg-white border border-ink/20 disabled:opacity-30 flex items-center justify-center">
                            <Icon name="arrowUp" size={12} />
                          </button>
                          <button type="button" onClick={() => moveInRotation(idx, 1)} disabled={idx === rotationDraft.length - 1}
                            className="w-7 h-7 rounded-pill bg-white border border-ink/20 disabled:opacity-30 flex items-center justify-center">
                            <Icon name="arrowDown" size={12} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={saveRotationOrder} disabled={savingRotation}
                      className={`flex-1 bg-sage-500 text-white font-bold py-2 rounded-pill text-sm ${pressable}`}>
                      {savingRotation ? 'Saving...' : 'Save order'}
                    </button>
                    <button type="button" onClick={() => setEditingRotation(false)} className="flex-1 border-2 border-ink font-bold py-2 rounded-pill text-sm">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : Array.isArray(stokvel.rotationOrder) && stokvel.rotationOrder.length > 0 ? (
                <div className="space-y-1.5">
                  {stokvel.rotationOrder.map((mUserId, idx) => {
                    const member = stokvel.members.find(m => m.userId === mUserId)
                    const name = member ? `${member.user.firstName} ${member.user.lastName}` : 'Unknown member'
                    const isNext = idx === (stokvel.currentRotationIndex % stokvel.rotationOrder.length)
                    return (
                      <div key={mUserId} className={`flex items-center justify-between px-3 py-2 rounded-soft ${isNext ? 'bg-sage-50 border-2 border-sage-500' : 'bg-cream'}`}>
                        <span className="text-sm font-bold text-ink">{idx + 1}. {name}</span>
                        {isNext && <span className="text-[10px] font-black text-sage-600 uppercase">Next</span>}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-ink-muted">
                  {isOfficial ? 'Set the payout order so everyone gets a fair turn.' : 'An official still needs to set the rotation order.'}
                </p>
              )}
            </div>
          )}

          {/* Request Payout Form */}
          <form onSubmit={requestPayout} className="bg-white border-2 border-ink rounded-soft p-4 space-y-2">
            <p className="text-xs font-black uppercase text-ink-muted tracking-wider">Request a payout</p>
            {stokvel.type === 'UMGALELO_ROTATING' && (
              <p className="text-xs text-ink-muted">
                {Array.isArray(stokvel.rotationOrder) && stokvel.rotationOrder.length > 0
                  ? "This pays out to whoever's next in the rotation, whoever submits it."
                  : 'Set a rotation order above before requesting a payout.'}
              </p>
            )}
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
              disabled={isSubmitting || (stokvel.type === 'UMGALELO_ROTATING' && !(Array.isArray(stokvel.rotationOrder) && stokvel.rotationOrder.length > 0))}
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

          {/* Organiser-only: edit stokvel details */}
          {stokvel.organiserId === user?.id && (
            <div className="bg-white border-2 border-ink rounded-soft p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase text-ink-muted tracking-wider">Stokvel Details</p>
                <button
                  type="button"
                  onClick={() => editingDetails ? setEditingDetails(false) : openEditDetails()}
                  className={`text-xs font-bold text-sage-600 ${pressable}`}
                >
                  {editingDetails ? 'Cancel' : 'Edit'}
                </button>
              </div>
              {editingDetails && (
                <form onSubmit={saveStokvelDetails} className="space-y-2">
                  <input
                    type="text" placeholder="Stokvel name" value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={inputStyle} required minLength={2}
                  />
                  <input
                    type="number" placeholder="Contribution amount (ZAR)" value={editContribution}
                    onChange={(e) => setEditContribution(e.target.value)}
                    className={inputStyle} min="0" step="any"
                  />
                  <input
                    type="text" placeholder="Contribution frequency (e.g. Monthly)" value={editFrequency}
                    onChange={(e) => setEditFrequency(e.target.value)}
                    className={inputStyle}
                  />
                  <input
                    type="number" placeholder="Target amount (ZAR, optional)" value={editTargetAmount}
                    onChange={(e) => setEditTargetAmount(e.target.value)}
                    className={inputStyle} min="0" step="any"
                  />
                  <div>
                    <label className="text-[10px] text-ink-muted block mb-1">Target date (optional)</label>
                    <input
                      type="date" value={editTargetDate}
                      onChange={(e) => setEditTargetDate(e.target.value)}
                      className={inputStyle}
                    />
                  </div>
                  <button
                    type="submit" disabled={savingDetails}
                    className={`w-full bg-sage-500 text-white font-bold py-2.5 rounded-pill text-sm ${pressable}`}
                  >
                    {savingDetails ? 'Saving...' : 'Save changes'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Officials-only group settings */}
          {isOfficial && (
            <div className="bg-white border-2 border-ink rounded-soft p-4 space-y-4">
              <p className="text-xs font-black uppercase text-ink-muted tracking-wider">Group Settings</p>

              <form onSubmit={recordInterest} className="space-y-2">
                <p className="text-xs font-bold text-ink">Record interest earned</p>
                <div className="flex gap-2">
                  <input
                    type="number" placeholder="Amount (ZAR)" value={interestAmount}
                    onChange={(e) => setInterestAmount(e.target.value)}
                    className={`${inputStyle} flex-1`} min="0.01" step="any" required
                  />
                  <button
                    type="submit" disabled={recordingInterest}
                    className={`bg-sage-500 text-white font-bold px-4 rounded-pill text-sm ${pressable}`}
                  >
                    {recordingInterest ? '...' : 'Add'}
                  </button>
                </div>
                <p className="text-[10px] text-ink-muted">Adds to the group balance, e.g. bank/savings interest received this cycle.</p>
              </form>

              <div className="pt-2 border-t border-ink/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-ink">Bereavement mode</p>
                    <p className="text-[10px] text-ink-muted mt-0.5">
                      {stokvel.bereavementActive ? 'Active — flagged as a sensitive period for this group.' : 'Not active.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleBereavement}
                    disabled={togglingBereavement}
                    className={`text-xs font-bold px-3 py-1.5 rounded-pill flex-shrink-0 ${stokvel.bereavementActive ? 'bg-terracotta text-white' : 'border-2 border-ink/20 text-ink-muted'} ${pressable}`}
                  >
                    {stokvel.bereavementActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Deletion Option when Balance is R0.00 */}
          {balance === 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className={`w-full border-2 border-terracotta text-terracotta font-bold py-2.5 rounded-pill text-sm flex items-center justify-center gap-1.5 ${pressable}`}
              >
                <Icon name="trash" size={14} /> Delete this stokvel
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

      {onOpenShrineFund && (
        <button
          type="button"
          onClick={onOpenShrineFund}
          className={`w-full bg-gradient-to-br from-terracotta to-brand-ochre text-white rounded-soft p-4 mb-4 text-left flex items-center justify-between ${pressable}`}
        >
          <div className="flex items-center gap-3">
            <Icon name="flame" size={22} color="#ffffff" strokeWidth={1.5} />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/80">Ubuhlanti bakwa Xhosa</p>
              <p className="font-display font-bold text-base">Shrine Fund — see it growing</p>
            </div>
          </div>
          <Icon name="arrowRight" size={18} color="#ffffff" />
        </button>
      )}

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
