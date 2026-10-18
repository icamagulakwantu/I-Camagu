import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Skeleton, StokvelCardSkeleton, StokvelDetailSkeleton } from '../components/ui/Skeleton.jsx'
import Icon from '../components/Icon.jsx'
import MeetingMinutes from './stokvel/MeetingMinutes.jsx'
import FinesPenalties from './stokvel/FinesPenalties.jsx'
import BankInterestCalc from './stokvel/BankInterestCalc.jsx'
import Constitution from './stokvel/Constitution.jsx'

const STOKVEL_TYPES = [
  'ALCOHOL_BULK_POOL',
  'UMGALELO_ROTATING',
  'CEREMONY_SAVINGS',
  'EXISTING_STOKVEL_UPGRADE',
  'RECIPROCAL_GIFTING'
]

// Detail tabs — original 6 preserved, 4 new added at the end.
// The detail renderer switches on detailTab to show only the active pane,
// so adding tabs here is the only wiring change needed.
const DETAIL_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'members', label: 'Members' },
  { id: 'contributions', label: 'Contributions' },
  { id: 'payout', label: 'Payout' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'minutes', label: 'Minutes' },
  { id: 'fines', label: 'Fines' },
  { id: 'calculator', label: 'Calculator' },
  { id: 'rules', label: 'Rules' },
  { id: 'settings', label: 'Settings' },
]

const cardBase = "card-paper p-4 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
const cardHover = "hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] hover:border-sage-400/30"
const cardActive = "active:scale-[0.98] active:shadow-none"
const pressable = "transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none"
const inputStyle = "w-full border border-ink/30 rounded-soft px-3 py-2 text-sm focus:outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20"

function Stokvels({ onBack, onOpenShrineFund }) {
  const { accessToken, user } = useAuth()
  const { showToast } = useToast()

  const [view, setView] = useState('list')
  const [detailTab, setDetailTab] = useState('overview')
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
  const [pinModal, setPinModal] = useState(null)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [submittingPin, setSubmittingPin] = useState(false)

  // Detail action states
  const [contribAmount, setContribAmount] = useState('')
  const [contribNote, setContribNote] = useState('')
  const [payoutAmount, setPayoutAmount] = useState('')
  const [contributeOptIn, setContributeOptIn] = useState(false)
  const [announcements, setAnnouncements] = useState([])
  const [newAnnouncement, setNewAnnouncement] = useState('')
  const [interestAmount, setInterestAmount] = useState('')
  const [recordingInterest, setRecordingInterest] = useState(false)
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseNote, setExpenseNote] = useState('')
  const [recordingExpense, setRecordingExpense] = useState(false)
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

  const recordExpense = async (e) => {
    e.preventDefault()
    if (!detail?.stokvel?.id || !expenseAmount) return
    setRecordingExpense(true)
    try {
      const res = await fetch('/api/stokvels/expense/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ stokvelId: detail.stokvel.id, amount: expenseAmount, note: expenseNote }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not record expense')
      setExpenseAmount('')
      setExpenseNote('')
      showToast(data.message || 'Expense recorded', 'success')
      await fetchDetail(detail.stokvel.id)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setRecordingExpense(false)
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
      showToast('Details updated', 'success')
      setEditingDetails(false)
      await fetchDetail(detail.stokvel.id)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSavingDetails(false)
    }
  }

  const saveRotation = async (e) => {
    e.preventDefault()
    if (savingRotation) return
    setSavingRotation(true)
    try {
      const res = await fetch(`/api/stokvels/${detail.stokvel.id}/rotation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ rotation: rotationDraft }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save rotation')
      showToast('Rotation saved', 'success')
      setEditingRotation(false)
      await fetchDetail(detail.stokvel.id)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSavingRotation(false)
    }
  }

  const submitContribution = async (stokvelId, memberId) => {
    try {
      const res = await fetch('/api/stokvels/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          stokvelId,
          memberId,
          amount: contribAmount,
          note: contribNote,
          optIn: contributeOptIn,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not submit contribution')
      showToast('Contribution submitted — awaiting confirmation', 'success')
      setContribAmount('')
      setContribNote('')
      await fetchDetail(stokvelId)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const confirmContribution = async (contributionId, stokvelId) => {
    if (confirmingId) return
    setConfirmingId(contributionId)
    try {
      const res = await fetch(`/api/stokvels/contributions/${contributionId}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not confirm contribution')
      showToast('Contribution confirmed', 'success')
      await fetchDetail(stokvelId)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setConfirmingId(null)
    }
  }

  const submitPayout = async (stokvelId, memberId) => {
    try {
      const res = await fetch('/api/stokvels/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ stokvelId, memberId, amount: payoutAmount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not record payout')
      showToast('Payout recorded', 'success')
      setPayoutAmount('')
      await fetchDetail(stokvelId)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const createStokvel = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/stokvels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ name: newName, type: newType, contributionAmount: newContribution }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not create stokvel')
      showToast('Stokvel created!', 'success')
      setNewName(''); setNewContribution('')
      setView('list')
      fetchMyStokvels()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const joinStokvel = async (e) => {
    e.preventDefault()
    setIsJoining(true)
    setError('')
    try {
      const res = await fetch('/api/stokvels/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ stokvelId: joinId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not join stokvel')
      showToast('Join request sent!', 'success')
      setJoinId('')
      setView('list')
      fetchMyStokvels()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsJoining(false)
    }
  }

  const deleteStokvel = async () => {
    if (!detail?.stokvel?.id) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/stokvels/${detail.stokvel.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not delete stokvel')
      showToast('Stokvel deleted', 'info')
      setDetail(null)
      setView('list')
      fetchMyStokvels()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setIsDeleting(false)
      setConfirmDelete(false)
    }
  }

  const submitPin = async (e) => {
    e.preventDefault()
    if (!pinModal || !pinInput) return
    setSubmittingPin(true)
    setPinError('')
    try {
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ pin: pinInput }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPinError(data.error || 'Incorrect PIN')
        return
      }
      await pinModal.onConfirm()
      setPinModal(null)
      setPinInput('')
    } catch (err) {
      setPinError(err.message)
    } finally {
      setSubmittingPin(false)
    }
  }

  // --- VIEW: CREATE ---
  if (view === 'create') {
    return (
      <div className="min-h-screen pb-24 bg-cream px-4 pt-6">
        <button type="button" onClick={() => setView('list')} className={`text-sm text-ink-muted mb-4 ${pressable}`}>
          ← Back
        </button>
        <h2 className="font-display font-bold text-2xl text-ink mb-4">Create a Stokvel</h2>
        <form onSubmit={createStokvel} className="space-y-3">
          <input type="text" placeholder="Group name" value={newName}
            onChange={(e) => setNewName(e.target.value)} className={inputStyle} required />
          <select value={newType} onChange={(e) => setNewType(e.target.value)} className={inputStyle}>
            {STOKVEL_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
          <input type="number" placeholder="Monthly contribution (R)" value={newContribution}
            onChange={(e) => setNewContribution(e.target.value)} className={inputStyle} />
          {error && <p className="text-terracotta text-xs">{error}</p>}
          <button type="submit" disabled={isSubmitting || !newName}
            className={`w-full bg-terracotta text-white font-bold py-3 rounded-pill ${pressable}`}>
            {isSubmitting ? 'Creating...' : 'Create stokvel'}
          </button>
        </form>
      </div>
    )
  }

  // --- VIEW: JOIN ---
  if (view === 'join') {
    return (
      <div className="min-h-screen pb-24 bg-cream px-4 pt-6">
        <button type="button" onClick={() => setView('list')} className={`text-sm text-ink-muted mb-4 ${pressable}`}>
          ← Back
        </button>
        <h2 className="font-display font-bold text-2xl text-ink mb-4">Join a Stokvel</h2>
        <form onSubmit={joinStokvel} className="space-y-3">
          <input type="text" placeholder="Stokvel ID or invite code" value={joinId}
            onChange={(e) => setJoinId(e.target.value)} className={inputStyle} required />
          {error && <p className="text-terracotta text-xs">{error}</p>}
          <button type="submit" disabled={isJoining || !joinId}
            className={`w-full bg-terracotta text-white font-bold py-3 rounded-pill ${pressable}`}>
            {isJoining ? 'Joining...' : 'Send join request'}
          </button>
        </form>
      </div>
    )
  }

  // --- VIEW: DETAIL ---
  if (view === 'detail' && detail) {
    const stokvel = detail.stokvel || {}
    const members = detail.members || []
    const contributions = detail.contributions || []
    const payouts = detail.payouts || []
    const rotationOrder = detail.rotationOrder || []
    const balance = Number(stokvel.groupLedger?.totalBalance || 0)
    const myMembership = members.find((m) => m.user?.id === user?.id || m.userId === user?.id)
    const isOrganiser = myMembership?.role === 'ORGANISER' || myMembership?.role === 'TREASURER'

    return (
      <div className="min-h-screen pb-24 bg-cream">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur-xl border-b border-cream-dark px-4 pt-4 pb-3">
          <button type="button" onClick={() => { setView('list'); setDetail(null) }}
            className={`text-sm text-ink-muted mb-2 ${pressable}`}>← Back</button>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-display font-bold text-xl text-ink">{stokvel.name}</h2>
              <p className="text-xs text-ink-muted">{members.length} members · Balance: R{balance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* Tab strip — horizontally scrollable */}
          <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
            {DETAIL_TABS.map((t) => (
              <button key={t.id} type="button" onClick={() => setDetailTab(t.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-pill text-[11px] font-bold transition-colors ${
                  detailTab === t.id ? 'bg-terracotta text-white' : 'bg-white border border-ink/10 text-ink-muted'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pt-4">
          {/* ── NEW TABS ─────────────────────────────────────────── */}
          {detailTab === 'minutes' && (
            <MeetingMinutes stokvelId={stokvel.id} isOrganiser={isOrganiser} />
          )}

          {detailTab === 'fines' && (
            <FinesPenalties
              stokvelId={stokvel.id}
              members={members}
              isOrganiser={isOrganiser}
            />
          )}

          {detailTab === 'calculator' && (
            <BankInterestCalc groupBalance={balance} />
          )}

          {detailTab === 'rules' && (
            <Constitution stokvelId={stokvel.id} isOrganiser={isOrganiser} />
          )}

          {/* ── EXISTING TABS ─────────────────────────────────────── */}
          {detailTab === 'overview' && (
            <div className="space-y-4">
              <div className="card-paper p-4">
                <p className="eyebrow text-ink-muted mb-3">Group overview</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase text-ink-muted">Type</p>
                    <p className="text-sm font-bold text-ink mt-0.5">{stokvel.type?.replace(/_/g, ' ') || 'Stokvel'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-ink-muted">Balance</p>
                    <p className="text-sm font-bold text-ink mt-0.5">R{balance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
                  </div>
                  {stokvel.contributionAmount && (
                    <div>
                      <p className="text-[10px] font-black uppercase text-ink-muted">Contribution</p>
                      <p className="text-sm font-bold text-ink mt-0.5">R{Number(stokvel.contributionAmount).toLocaleString('en-ZA')} {stokvel.contributionFrequency || ''}</p>
                    </div>
                  )}
                  {stokvel.targetAmount && (
                    <div>
                      <p className="text-[10px] font-black uppercase text-ink-muted">Target</p>
                      <p className="text-sm font-bold text-ink mt-0.5">R{Number(stokvel.targetAmount).toLocaleString('en-ZA')}</p>
                    </div>
                  )}
                </div>
                {stokvel.targetAmount && (
                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] text-ink-muted mb-1">
                      <span>Progress</span>
                      <span>{Math.min(100, Math.round((balance / Number(stokvel.targetAmount)) * 100))}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-ink/5 overflow-hidden">
                      <div className="h-full rounded-full bg-terracotta transition-all"
                        style={{ width: `${Math.min(100, (balance / Number(stokvel.targetAmount)) * 100)}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="card-paper p-4">
                <p className="eyebrow text-ink-muted mb-2">Invite code</p>
                <div className="bg-cream rounded-2xl px-4 py-3 flex items-center justify-between">
                  <p className="font-mono font-bold text-ink text-base tracking-widest">{stokvel.id}</p>
                  <button type="button" onClick={() => { navigator.clipboard?.writeText(stokvel.id); showToast('Copied!', 'success') }}
                    className="text-xs font-bold text-terracotta">Copy</button>
                </div>
                <p className="text-[10px] text-ink-muted mt-2">Share this code with people you want to invite.</p>
              </div>

              {announcements.length > 0 && (
                <div className="card-paper p-4">
                  <p className="eyebrow text-ink-muted mb-2">Latest announcement</p>
                  <p className="text-sm text-ink">{announcements[0].message}</p>
                  <p className="text-[10px] text-ink-muted mt-1">
                    {new Date(announcements[0].createdAt).toLocaleDateString('en-ZA')}
                  </p>
                </div>
              )}
            </div>
          )}

          {detailTab === 'members' && (
            <div className="space-y-3">
              <p className="eyebrow text-ink-muted">{members.length} member{members.length !== 1 ? 's' : ''}</p>
              {members.map((m) => (
                <div key={m.id} className="card-paper p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-full bg-terracotta/10 flex items-center justify-center flex-shrink-0">
                      <Icon name="user" size={16} color="#c45c26" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-ink truncate">{m.user?.name || m.name || 'Member'}</p>
                      <p className="text-xs text-ink-muted">{m.role || 'Member'}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-ink">R{Number(m.balance || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[10px] text-ink-muted">balance</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {detailTab === 'contributions' && (
            <div className="space-y-4">
              {myMembership && (
                <div className="card-paper p-4 space-y-3">
                  <p className="eyebrow text-ink-muted">Record a contribution</p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-muted">R</span>
                    <input type="number" min="0" placeholder="Amount"
                      value={contribAmount} onChange={(e) => setContribAmount(e.target.value)}
                      className="w-full border border-ink/20 rounded-2xl pl-7 pr-3 py-2.5 text-sm bg-white focus:outline-none focus:border-terracotta/60" />
                  </div>
                  <input type="text" placeholder="Note (optional)"
                    value={contribNote} onChange={(e) => setContribNote(e.target.value)}
                    className="w-full border border-ink/20 rounded-2xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-terracotta/60" />
                  <button type="button" disabled={!contribAmount}
                    onClick={() => submitContribution(stokvel.id, myMembership.id)}
                    className={`w-full bg-terracotta text-white font-bold py-2.5 rounded-pill text-sm ${pressable}`}>
                    Submit contribution
                  </button>
                </div>
              )}

              <div className="space-y-2">
                <p className="eyebrow text-ink-muted">All contributions</p>
                {contributions.length === 0 ? (
                  <p className="text-sm text-ink-muted text-center py-4">No contributions yet</p>
                ) : contributions.map((c) => (
                  <div key={c.id} className="card-paper p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-sm text-ink">{c.memberName || 'Member'}</p>
                      <p className="text-xs text-ink-muted">
                        {new Date(c.createdAt).toLocaleDateString('en-ZA')}
                        {c.note ? ` · ${c.note}` : ''}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-sm text-ink">R{Number(c.amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
                      <span className={`text-[10px] font-bold ${c.confirmed ? 'text-sage-600' : 'text-brand-ochre'}`}>
                        {c.confirmed ? 'Confirmed' : 'Pending'}
                      </span>
                      {!c.confirmed && isOrganiser && (
                        <button type="button" disabled={confirmingId === c.id}
                          onClick={() => confirmContribution(c.id, stokvel.id)}
                          className={`block text-[11px] font-bold text-terracotta mt-0.5 ${pressable}`}>
                          Confirm
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {detailTab === 'payout' && (
            <div className="space-y-4">
              {isOrganiser && (
                <div className="card-paper p-4 space-y-3">
                  <p className="eyebrow text-ink-muted">Record a payout</p>
                  <select className="w-full border border-ink/20 rounded-2xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-terracotta/60">
                    <option value="">Select member</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.user?.name || 'Member'}</option>)}
                  </select>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-muted">R</span>
                    <input type="number" min="0" placeholder="Payout amount"
                      value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)}
                      className="w-full border border-ink/20 rounded-2xl pl-7 pr-3 py-2.5 text-sm bg-white focus:outline-none focus:border-terracotta/60" />
                  </div>
                  <button type="button" disabled={!payoutAmount}
                    onClick={() => submitPayout(stokvel.id, '')}
                    className={`w-full bg-terracotta text-white font-bold py-2.5 rounded-pill text-sm ${pressable}`}>
                    Record payout
                  </button>
                </div>
              )}

              {rotationOrder.length > 0 && (
                <div className="card-paper p-4">
                  <p className="eyebrow text-ink-muted mb-3">Payout rotation (Umgalelo)</p>
                  <div className="space-y-2">
                    {rotationOrder.map((r, i) => (
                      <div key={r.memberId || i} className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0 ${
                          r.paid ? 'bg-sage-100 text-sage-700' : i === 0 ? 'bg-terracotta text-white' : 'bg-ink/10 text-ink-muted'
                        }`}>{i + 1}</span>
                        <p className="text-sm font-bold text-ink flex-1">{r.memberName || 'Member'}</p>
                        {r.paid && <span className="text-[10px] font-bold text-sage-600">Paid</span>}
                        {!r.paid && i === 0 && <span className="text-[10px] font-bold text-terracotta">Next</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="eyebrow text-ink-muted">Payout history</p>
                {payouts.length === 0 ? (
                  <p className="text-sm text-ink-muted text-center py-4">No payouts recorded yet</p>
                ) : payouts.map((p) => (
                  <div key={p.id} className="card-paper p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-sm text-ink">{p.memberName || 'Member'}</p>
                      <p className="text-xs text-ink-muted">{new Date(p.createdAt).toLocaleDateString('en-ZA')}</p>
                    </div>
                    <p className="font-bold text-sm text-terracotta">
                      R{Number(p.amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {detailTab === 'announcements' && (
            <div className="space-y-4">
              {isOrganiser && (
                <form onSubmit={postAnnouncement} className="card-paper p-4 space-y-3">
                  <p className="eyebrow text-ink-muted">Post an announcement</p>
                  <textarea rows={3} placeholder="Write your announcement here..."
                    value={newAnnouncement} onChange={(e) => setNewAnnouncement(e.target.value)}
                    className="w-full border border-ink/20 rounded-2xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-terracotta/60 resize-none" required />
                  <button type="submit" disabled={!newAnnouncement.trim()}
                    className={`w-full bg-terracotta text-white font-bold py-2.5 rounded-pill text-sm ${pressable}`}>
                    Post
                  </button>
                </form>
              )}
              <div className="space-y-2">
                {announcements.length === 0 ? (
                  <p className="text-sm text-ink-muted text-center py-4">No announcements yet</p>
                ) : announcements.map((a) => (
                  <div key={a.id} className="card-paper p-4">
                    <p className="text-sm text-ink">{a.message}</p>
                    <p className="text-[10px] text-ink-muted mt-2">
                      {a.authorName || 'Organiser'} · {new Date(a.createdAt).toLocaleDateString('en-ZA')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {detailTab === 'settings' && (
            <div className="space-y-4">
              {isOrganiser && !editingDetails && (
                <div className="card-paper p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="eyebrow text-ink-muted">Stokvel details</p>
                    <button type="button" onClick={openEditDetails}
                      className={`text-xs font-bold text-terracotta ${pressable}`}>Edit</button>
                  </div>
                  <p className="text-sm text-ink">{stokvel.name}</p>
                  {stokvel.contributionAmount && (
                    <p className="text-xs text-ink-muted mt-1">
                      R{Number(stokvel.contributionAmount).toLocaleString('en-ZA')} {stokvel.contributionFrequency || ''}
                    </p>
                  )}
                </div>
              )}

              {editingDetails && (
                <form onSubmit={saveStokvelDetails} className="card-paper p-4 space-y-3">
                  <p className="eyebrow text-ink-muted">Edit details</p>
                  <input type="text" placeholder="Stokvel name" value={editName}
                    onChange={(e) => setEditName(e.target.value)} className={inputStyle} required />
                  <input type="number" placeholder="Contribution amount" value={editContribution}
                    onChange={(e) => setEditContribution(e.target.value)} className={inputStyle} />
                  <input type="text" placeholder="Frequency (e.g. Monthly)" value={editFrequency}
                    onChange={(e) => setEditFrequency(e.target.value)} className={inputStyle} />
                  <input type="number" placeholder="Target amount" value={editTargetAmount}
                    onChange={(e) => setEditTargetAmount(e.target.value)} className={inputStyle} />
                  <input type="date" value={editTargetDate}
                    onChange={(e) => setEditTargetDate(e.target.value)} className={inputStyle} />
                  <div className="flex gap-2">
                    <button type="submit" disabled={savingDetails}
                      className={`flex-1 bg-terracotta text-white font-bold py-2 rounded-pill text-sm ${pressable}`}>
                      {savingDetails ? 'Saving...' : 'Save'}
                    </button>
                    <button type="button" onClick={() => setEditingDetails(false)}
                      className={`flex-1 border-2 border-terracotta/25 font-bold py-2 rounded-pill text-sm ${pressable}`}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {isOrganiser && (
                <div className="card-paper p-4">
                  <p className="eyebrow text-ink-muted mb-3">Bereavement fund</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-ink">
                        {detail.stokvel.bereavementActive ? 'Active' : 'Inactive'}
                      </p>
                      <p className="text-xs text-ink-muted mt-0.5">
                        Activate to collect a bereavement contribution from members when needed.
                      </p>
                    </div>
                    <button type="button" onClick={toggleBereavement} disabled={togglingBereavement}
                      className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                        detail.stokvel.bereavementActive ? 'bg-terracotta' : 'bg-ink/20'
                      } ${pressable}`}>
                      <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform mx-0.5 ${
                        detail.stokvel.bereavementActive ? 'translate-x-6' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>
              )}

              {isOrganiser && (
                <div className="card-paper p-4 space-y-3">
                  <p className="eyebrow text-ink-muted">Record interest</p>
                  <form onSubmit={recordInterest} className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-muted">R</span>
                      <input type="number" min="0" step="0.01" placeholder="Interest earned"
                        value={interestAmount} onChange={(e) => setInterestAmount(e.target.value)}
                        className="w-full border border-ink/20 rounded-2xl pl-7 pr-3 py-2 text-sm bg-white focus:outline-none focus:border-terracotta/60" required />
                    </div>
                    <button type="submit" disabled={recordingInterest || !interestAmount}
                      className={`bg-terracotta text-white font-bold px-4 py-2 rounded-pill text-sm ${pressable}`}>
                      {recordingInterest ? '...' : 'Add'}
                    </button>
                  </form>
                </div>
              )}

              {isOrganiser && (
                <div className="card-paper p-4 space-y-3">
                  <p className="eyebrow text-ink-muted">Record expense</p>
                  <form onSubmit={recordExpense} className="space-y-2">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-muted">R</span>
                      <input type="number" min="0" step="0.01" placeholder="Amount"
                        value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)}
                        className="w-full border border-ink/20 rounded-2xl pl-7 pr-3 py-2.5 text-sm bg-white focus:outline-none focus:border-terracotta/60" required />
                    </div>
                    <input type="text" placeholder="Note (e.g. venue hire)"
                      value={expenseNote} onChange={(e) => setExpenseNote(e.target.value)}
                      className="w-full border border-ink/20 rounded-2xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-terracotta/60" />
                    <button type="submit" disabled={recordingExpense || !expenseAmount}
                      className={`w-full bg-terracotta text-white font-bold py-2.5 rounded-pill text-sm ${pressable}`}>
                      {recordingExpense ? 'Saving...' : 'Record expense'}
                    </button>
                  </form>
                </div>
              )}

              {balance === 0 && (
                <div className="pt-2">
                  <button type="button" onClick={() => setConfirmDelete(true)}
                    className={`w-full border-2 border-terracotta text-terracotta font-bold py-2.5 rounded-pill text-sm flex items-center justify-center gap-1.5 ${pressable}`}>
                    <Icon name="trash" size={14} /> Delete this stokvel
                  </button>
                  {confirmDelete && (
                    <div className="mt-3 bg-white border-2 border-terracotta rounded-soft p-4 shadow-lg">
                      <p className="text-sm font-bold text-ink mb-3">
                        Delete "{stokvel.name}" permanently? This cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <button type="button" onClick={deleteStokvel} disabled={isDeleting}
                          className={`flex-1 bg-terracotta text-white font-bold py-2 rounded-pill text-sm ${pressable}`}>
                          {isDeleting ? 'Deleting...' : 'Yes, delete'}
                        </button>
                        <button type="button" onClick={() => setConfirmDelete(false)} disabled={isDeleting}
                          className={`flex-1 border-2 border-terracotta/25 font-bold py-2 rounded-pill text-sm ${pressable}`}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* PIN modal */}
        {pinModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 px-4 pb-6">
            <div className="w-full max-w-sm bg-white border-2 border-sage-500 rounded-soft p-4 shadow-lg">
              <form onSubmit={submitPin}>
                <h2 className="text-sm font-bold text-ink mb-1">{pinModal.label}</h2>
                <p className="text-xs text-ink-muted mb-3">Enter your security PIN to authorise this action.</p>
                <label htmlFor="stokvel-pin" className="block text-xs font-bold text-ink-muted mb-1">Security PIN</label>
                <input id="stokvel-pin" type="password" inputMode="numeric" pattern="[0-9]*"
                  autoComplete="off" value={pinInput}
                  onChange={(e) => { setPinInput(e.target.value); setPinError('') }}
                  className="w-full border-2 border-cream-dark rounded-soft px-3 py-2 text-ink tracking-widest"
                  autoFocus />
                {pinError && <p className="text-xs text-terracotta font-bold mt-1.5">{pinError}</p>}
                <div className="flex gap-2 mt-3">
                  <button type="submit" disabled={submittingPin}
                    className={`flex-1 bg-sage-600 text-white font-bold py-2 rounded-pill text-sm ${pressable}`}>
                    {submittingPin ? 'Submitting...' : 'Confirm'}
                  </button>
                  <button type="button" disabled={submittingPin}
                    onClick={() => { setPinModal(null); setPinInput(''); setPinError('') }}
                    className={`flex-1 border-2 border-sage-200 font-bold py-2 rounded-pill text-sm ${pressable}`}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  // --- VIEW: STOKVEL LIST (DEFAULT) ---
  return (
    <div className="min-h-screen pb-24 bg-cream px-4 pt-6">
      <button type="button" onClick={() => onBack?.()}
        className={`text-sm text-ink-muted mb-4 ${pressable}`}>← Back</button>
      <h2 className="font-display font-bold text-2xl text-ink mb-4">Stokvels</h2>

      {!loading && myStokvels.length > 0 && (
        <div className="wash-sage grain relative mb-4 overflow-hidden rounded-soft px-5 py-5">
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow text-cream/70">Combined balance</p>
              <p className="tabular mt-2 font-display text-3xl text-cream">
                R{myStokvels.reduce((sum, m) => sum + Number(m.stokvel?.groupLedger?.totalBalance || 0), 0)
                  .toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-cream/80">
                Across {myStokvels.length} group{myStokvels.length === 1 ? '' : 's'}
              </p>
            </div>
            <Icon name="coins" size={32} color="#ffffff" />
          </div>
        </div>
      )}

      {onOpenShrineFund && (
        <button type="button" onClick={onOpenShrineFund}
          className={`w-full bg-gradient-to-br from-terracotta to-brand-ochre text-white rounded-soft p-4 mb-4 text-left flex items-center justify-between ${pressable}`}>
          <div className="flex items-center gap-3">
            <Icon name="flame" size={22} color="#ffffff" strokeWidth={1.5} />
            <div>
              <p className="font-display font-bold text-base leading-tight">Ubuhlanti bakwa Xhosa</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/80 mt-0.5">
                Shrine &amp; Development Fund — see it growing
              </p>
            </div>
          </div>
          <Icon name="arrowRight" size={18} color="#ffffff" />
        </button>
      )}

      <div className="flex gap-2 mb-4">
        <button type="button" onClick={() => { setError(''); setView('create') }}
          className={`flex-1 bg-sage-500 text-white font-bold py-2.5 rounded-pill text-sm ${pressable}`}>
          + Create
        </button>
        <button type="button" onClick={() => { setError(''); setView('join') }}
          className={`flex-1 border-2 border-terracotta/25 text-ink font-bold py-2.5 rounded-pill text-sm ${pressable}`}>
          Join
        </button>
      </div>

      {loading ? (
        <div className="space-y-2"><StokvelCardSkeleton /><StokvelCardSkeleton /></div>
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
        <>
          <SectionRule
            label="Member balances"
            trailing={new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
          />
          <div className="space-y-3">
            {myStokvels.map((m) => (
              <button key={m.id || m.stokvelId} type="button"
                onClick={() => { setDetailTab('overview'); fetchDetail(m.stokvelId) }}
                className={`w-full text-left bg-white border border-terracotta/15 rounded-soft overflow-hidden shadow-soft ${pressable}`}>
                <div className="flex items-center gap-3 p-4">
                  <span className="w-10 h-10 rounded-full bg-terracotta/10 flex items-center justify-center flex-shrink-0">
                    <Icon name="landmark" size={18} color="#c45c26" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-bold text-base text-ink leading-tight">
                      {m.stokvel?.name || 'Unnamed Stokvel'}
                    </p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {m.stokvel?._count?.members || 0} member{(m.stokvel?._count?.members || 0) === 1 ? '' : 's'}
                    </p>
                  </div>
                  <Icon name="arrowRight" size={16} color="#8a8278" />
                </div>
                <div className="border-t border-cream-dark/70 px-4 py-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-ink-muted">Your balance</p>
                    <p className="tabular font-display font-bold text-2xl text-ink mt-0.5">
                      R{Number(m.myBalance || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <p className="text-[11px] text-ink-muted text-right leading-snug">
                    Group holds<br />
                    <span className="font-bold text-ink tabular">
                      R{Number(m.stokvel?.groupLedger?.totalBalance || 0).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}
                    </span>
                  </p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function SectionRule({ label, trailing }) {
  return (
    <div className="flex items-center gap-3 mt-5 mb-3">
      <p className="eyebrow text-ink-muted whitespace-nowrap">{label}</p>
      <span className="h-px flex-1 bg-terracotta/25" />
      {trailing && <p className="text-[11px] text-ink-muted whitespace-nowrap">{trailing}</p>}
    </div>
  )
}

export default Stokvels
