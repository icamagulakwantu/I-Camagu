import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { cn } from '../lib/utils'
import { captureLocation } from '../lib/geolocation.js'
import Icon from '../components/Icon.jsx'
import IsidukoTypeahead from '../components/IsidukoTypeahead.jsx'

const NATION_OPTIONS = ['AmaXhosa', 'AbaThembu', 'AmaBomvana', 'AmaGqunukhwebe', 'AbeSuthu / AmaVundle', 'AmaMpondo', 'AmaMpondomise', 'AmaMfengu', 'AmaHlubi', 'AmaBhaca', 'AmaXesibe', 'AmaQwathi', 'Not sure / another nation']

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96]'

// "Pending" matches the wording Directory.jsx already uses for a
// practitioner/vendor awaiting review — this screen previously said
// "Pending review" and "Not approved", which read like a different app's
// verification system.
const IDENTITY_STATUS_META = {
  UNVERIFIED: { label: 'Not verified', bg: 'bg-cream', border: 'border-cream-dark', text: 'text-ink-muted', icon: 'key' },
  PENDING: { label: 'Pending', bg: 'bg-ochre/10', border: 'border-ochre', text: 'text-ochre-dark', icon: 'clock' },
  VERIFIED: { label: 'Verified', bg: 'bg-sage-50', border: 'border-sage-500', text: 'text-sage-600', icon: 'check' },
  REJECTED: { label: 'Not approved', bg: 'bg-terracotta/10', border: 'border-terracotta', text: 'text-terracotta', icon: 'close' },
}

// Three genuinely separate concerns that used to be stacked on one long
// scroll — a member's personal contact details, their clan lines (used for
// ClanMatch, not contact), and identity verification (a KYC-style review
// flow with its own status). Splitting them into tabs, the same pattern
// already used for Stokvel detail and ceremony plan screens.
const TABS = [
  { id: 'personal', label: 'Personal' },
  { id: 'clan', label: 'Clan Lines' },
  { id: 'verification', label: 'Verification' },
]

export default function Profile({ onNavigate, initialTab, onConsumeInitialTab }) {
  const { user, logout, accessToken, updateUser } = useAuth()
  const { showToast } = useToast()
  const fileInputRef = useRef(null)
  const idDocInputRef = useRef(null)

  const [tab, setTab] = useState(initialTab || 'personal')

  // Consume once — otherwise a later, ordinary visit to Profile (e.g. from
  // the More menu) would keep reopening on whatever tab sent us here last.
  useEffect(() => {
    if (initialTab) onConsumeInitialTab?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [uploading, setUploading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [coords, setCoords] = useState(null)

  const [identity, setIdentity] = useState(null)
  const [identityForm, setIdentityForm] = useState(false)
  const [idNumber, setIdNumber] = useState('')
  const [idDocumentUrl, setIdDocumentUrl] = useState(null)
  const [submittingId, setSubmittingId] = useState(false)
  const [consented, setConsented] = useState(false)

  const [editingPersonal, setEditingPersonal] = useState(false)
  const [editingClan, setEditingClan] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/identity/my-status', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setIdentity(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [accessToken])

  const handleIdDocSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1_800_000) {
      showToast('Photo too large — please choose an image under 1.8MB', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setIdDocumentUrl(reader.result)
    reader.readAsDataURL(file)
  }

  const submitIdentity = async (e) => {
    e.preventDefault()
    if (!idDocumentUrl) {
      showToast('Please attach a photo of your ID document', 'error')
      return
    }
    if (!consented) {
      showToast('Please agree to the Privacy Policy terms to continue', 'error')
      return
    }
    setSubmittingId(true)
    try {
      const res = await fetch('/api/identity/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ idNumber, idDocumentUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit')
      setIdentity({ status: data.status, last4: data.last4, submittedAt: data.submittedAt, verifiedAt: null, rejectionReason: null })
      setIdentityForm(false)
      setIdNumber('')
      setIdDocumentUrl(null)
      setConsented(false)
      showToast('Submitted — an admin will review your ID shortly', 'success')
    } catch (err) {
      showToast(err.message || 'Could not submit identity verification', 'error')
    } finally {
      setSubmittingId(false)
    }
  }

  const useMyLocation = async () => {
    setLocating(true)
    try {
      const loc = await captureLocation()
      setCoords(loc)
      showToast('Location captured — save to apply', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLocating(false)
    }
  }

  const [clanForm, setClanForm] = useState({
    paternalIziduko: user?.paternalIziduko || '',
    maternalIziduko: user?.maternalIziduko || '',
    paternalGrandmotherIziduko: user?.paternalGrandmotherIziduko || '',
    maternalGrandmotherIziduko: user?.maternalGrandmotherIziduko || '',
  })
  const [personalForm, setPersonalForm] = useState({
    address: user?.address || '',
    age: user?.age || '',
    phoneNumber: user?.phoneNumber || '',
  })

  const handlePictureSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1_500_000) {
      showToast('Photo too large — please choose an image under 1.5MB', 'error')
      return
    }
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const res = await fetch('/api/user/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ profileImage: reader.result }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to update photo')
        updateUser({ profileImage: data.profileImage })
        showToast('Profile picture updated', 'success')
      } catch (err) {
        showToast(err.message || 'Error uploading photo', 'error')
      } finally {
        setUploading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const saveClan = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/user/iziduko', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(clanForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update Iziduko')
      updateUser(data)
      setEditingClan(false)
      showToast('Clan lines updated', 'success')
    } catch (err) {
      showToast(err.message || 'Could not save clan lines', 'error')
    }
  }

  const savePersonal = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ ...personalForm, ...(coords || {}) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update profile details')
      updateUser(data)
      setEditingPersonal(false)
      showToast('Personal details updated', 'success')
    } catch (err) {
      showToast(err.message || 'Could not save personal details', 'error')
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      showToast('Logged out successfully', 'info')
    } catch {
      showToast('Failed to log out', 'error')
    }
  }

  return (
    <div className="min-h-screen pb-24 bg-cream">
      <div className="bg-gradient-to-br from-sage-500 to-sage-600 text-white px-5 pt-12 pb-6 rounded-b-[2.5rem] relative overflow-hidden">
        <div className="relative flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative w-20 h-20 rounded-3xl bg-white/15 border-2 border-white/20 flex items-center justify-center text-4xl overflow-hidden active:scale-90 transition-transform flex-shrink-0"
          >
            {user?.profileImage ? (
              <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : <Icon name="user" size={32} color="#fff" />}
            {uploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-xs font-bold">...</div>
            )}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePictureSelect} className="hidden" />

          <div>
            <h1 className="font-display font-bold text-2xl">{user?.firstName || ''} {user?.lastName || ''}</h1>
            <p className="text-white/70 text-sm">@{user?.username || ''}</p>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs underline mt-1 text-white/80 block">
              Change photo
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 -mt-4 relative z-10">
        <div className="flex rounded-pill border-2 border-terracotta/20 bg-white p-1 shadow-elevated">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-pill py-2 text-[12px] font-bold transition-colors ${tab === t.id ? 'bg-terracotta text-white' : 'text-ink-muted'}`}
            >
              {t.label}
              {t.id === 'verification' && identity && identity.status !== 'UNVERIFIED' && (
                <span className={`ml-1.5 inline-block w-1.5 h-1.5 rounded-full align-middle ${identity.status === 'VERIFIED' ? 'bg-sage-500' : identity.status === 'REJECTED' ? 'bg-terracotta' : 'bg-brand-ochre'} ${tab === t.id ? 'opacity-90' : ''}`} />
              )}
            </button>
          ))}
        </div>
      </div>

      {tab === 'personal' && (
        <div className="mx-4 mt-4 bg-white border-2 border-terracotta/25 rounded-soft p-5 shadow-elevated">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-extrabold text-ink-muted uppercase tracking-wider">Personal Details</h3>
            {!editingPersonal && (
              <button type="button" onClick={() => setEditingPersonal(true)} className="text-xs text-sage-600 font-bold underline">Edit</button>
            )}
          </div>

          {editingPersonal ? (
            <form onSubmit={savePersonal} className="space-y-2">
              <input placeholder="Address" value={personalForm.address}
                onChange={(e) => setPersonalForm({ ...personalForm, address: e.target.value })}
                className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm" />
              <button
                type="button" onClick={useMyLocation} disabled={locating}
                className="text-xs font-bold text-sage-600 flex items-center gap-1"
              >
                <Icon name="mapPin" size={12} />
                {locating ? 'Locating...' : coords ? <>Location captured <Icon name="check" size={12} /></> : 'Use my current location'}
              </button>
              <input type="number" placeholder="Age" value={personalForm.age}
                onChange={(e) => setPersonalForm({ ...personalForm, age: e.target.value })}
                className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm" />
              <input placeholder="Phone number" value={personalForm.phoneNumber}
                onChange={(e) => setPersonalForm({ ...personalForm, phoneNumber: e.target.value })}
                className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm" />
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-sage-500 text-white font-bold py-2 rounded-pill text-sm">Save</button>
                <button type="button" onClick={() => setEditingPersonal(false)} className="flex-1 border-2 border-terracotta/25 font-bold py-2 rounded-pill text-sm">Cancel</button>
              </div>
            </form>
          ) : (
            <div className="space-y-2">
              {user?.address && (
                <p className="text-sm text-ink-muted flex items-center gap-1.5">
                  <Icon name="mapPin" size={13} /> {user.address}{user?.latitude != null && <span className="text-sage-600 font-bold"> · located</span>}
                </p>
              )}
              {user?.phoneNumber && <p className="text-sm text-ink-muted flex items-center gap-1.5"><Icon name="phone" size={13} /> {user.phoneNumber}</p>}
              {user?.age && <p className="text-sm text-ink-muted">Age: <strong className="text-ink">{user.age}</strong></p>}
              {!user?.address && !user?.phoneNumber && !user?.age && (
                <p className="text-sm text-ink-muted">No personal details added yet.</p>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'clan' && (
        <div className="mx-4 mt-4 bg-white border-2 border-terracotta/25 rounded-soft p-5 shadow-elevated">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-extrabold text-ink-muted uppercase tracking-wider">Iziduko (Clan Lines)</h3>
            {!editingClan && (
              <button type="button" onClick={() => setEditingClan(true)} className="text-xs text-sage-600 font-bold underline">Edit</button>
            )}
          </div>

          {editingClan ? (
            <form onSubmit={saveClan} className="space-y-2">
              <IsidukoTypeahead label="Paternal Isiduko" value={clanForm.paternalIziduko} nationLabel={clanForm.nationLabel} required onChange={(value) => setClanForm({ ...clanForm, paternalIziduko: value })} />
              <IsidukoTypeahead label="Maternal Isiduko" value={clanForm.maternalIziduko} nationLabel={clanForm.nationLabel} required onChange={(value) => setClanForm({ ...clanForm, maternalIziduko: value })} />
              <IsidukoTypeahead label="Paternal grandmother’s Isiduko" value={clanForm.paternalGrandmotherIziduko} nationLabel={clanForm.nationLabel} onChange={(value) => setClanForm({ ...clanForm, paternalGrandmotherIziduko: value })} />
              <IsidukoTypeahead label="Maternal grandmother’s Isiduko" value={clanForm.maternalGrandmotherIziduko} nationLabel={clanForm.nationLabel} onChange={(value) => setClanForm({ ...clanForm, maternalGrandmotherIziduko: value })} />
              <label className="block text-sm font-bold text-ink">Your nation / community label
                <select value={clanForm.nationLabel} onChange={(event) => setClanForm({ ...clanForm, nationLabel: event.target.value })} className="mt-2 w-full min-h-12 rounded-xl border border-cream-dark bg-white px-3 text-ink">
                  <option value="">Choose your own label</option>
                  {NATION_OPTIONS.map((nation) => <option key={nation} value={nation}>{nation}</option>)}
                </select>
              </label>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-sage-500 text-white font-bold py-2 rounded-pill text-sm">Save</button>
                <button type="button" onClick={() => setEditingClan(false)} className="flex-1 border-2 border-terracotta/25 font-bold py-2 rounded-pill text-sm">Cancel</button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-sage-50 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-sage-600 uppercase tracking-wider">Paternal</p>
                <p className="font-bold text-ink">{user?.paternalIziduko || '—'}</p>
              </div>
              <div className="bg-cream rounded-2xl p-4 border-2 border-cream-dark">
                <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Maternal</p>
                <p className="font-bold text-ink">{user?.maternalIziduko || '—'}</p>
              </div>
              <div className="bg-sage-50 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-sage-600 uppercase tracking-wider">Paternal grandmother</p>
                <p className="font-bold text-ink">{user?.paternalGrandmotherIziduko || '—'}</p>
              </div>
              <div className="bg-cream rounded-2xl p-4 border-2 border-cream-dark">
                <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Maternal grandmother</p>
                <p className="font-bold text-ink">{user?.maternalGrandmotherIziduko || '—'}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'verification' && (
        <div className="mx-4 mt-4 bg-white border-2 border-terracotta/25 rounded-soft p-5 shadow-elevated">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-extrabold text-ink-muted uppercase tracking-wider">Identity Verification</h3>
            {identity && (
              <span className={cn(
                'text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-pill border flex items-center gap-1',
                IDENTITY_STATUS_META[identity.status]?.bg, IDENTITY_STATUS_META[identity.status]?.border, IDENTITY_STATUS_META[identity.status]?.text
              )}>
                <Icon name={IDENTITY_STATUS_META[identity.status]?.icon} size={11} />
                {IDENTITY_STATUS_META[identity.status]?.label}
              </span>
            )}
          </div>

          <p className="text-xs text-ink-muted mb-3">
            Verify your ID to unlock stokvel roles and future biometric features. Your ID number is encrypted, and both it and your ID photo are only ever seen by an admin reviewing your submission — never by other members.
          </p>

          {identity?.status === 'VERIFIED' && (
            <p className="text-sm text-sage-600 font-bold flex items-center gap-1">
              <Icon name="check" size={14} /> ID ending in {identity.last4} verified
            </p>
          )}

          {identity?.status === 'PENDING' && (
            <p className="text-sm text-ochre-dark font-bold flex items-center gap-1">
              <Icon name="clock" size={14} /> ID ending in {identity.last4} is awaiting review
            </p>
          )}

          {(identity?.status === 'UNVERIFIED' || identity?.status === 'REJECTED') && !identityForm && (
            <>
              {identity?.status === 'REJECTED' && identity?.rejectionReason && (
                <p className="text-sm text-terracotta font-bold mb-2">Not approved: {identity.rejectionReason}</p>
              )}
              <button
                type="button"
                onClick={() => setIdentityForm(true)}
                className="w-full bg-sage-500 text-white font-bold py-2.5 rounded-pill text-sm flex items-center justify-center gap-2"
              >
                <Icon name="key" size={14} color="#fff" /> {identity?.status === 'REJECTED' ? 'Resubmit ID' : 'Verify my ID'}
              </button>
            </>
          )}

          {identityForm && (
            <form onSubmit={submitIdentity} className="space-y-2">
              <input
                placeholder="13-digit South African ID number"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, '').slice(0, 13))}
                inputMode="numeric"
                className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm tracking-wider"
                required
              />
              <input ref={idDocInputRef} type="file" accept="image/*" onChange={handleIdDocSelect} className="hidden" />
              <button
                type="button"
                onClick={() => idDocInputRef.current?.click()}
                className="w-full border-2 border-dashed border-ink/30 rounded-soft py-3 text-sm font-bold text-ink-muted flex items-center justify-center gap-2"
              >
                {idDocumentUrl ? (
                  <><Icon name="check" size={14} color="#4a7a4a" /> ID photo attached</>
                ) : (
                  <><Icon name="camera" size={14} /> Attach a photo of your ID</>
                )}
              </button>
              <p className="text-[11px] text-ink-muted -mt-1 flex items-start gap-1">
                <Icon name="key" size={11} className="mt-0.5 flex-shrink-0" /> Only an admin reviewing your submission can see this photo — it's never shown to other members or on your public profile.
              </p>
              <label className="flex items-start gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consented}
                  onChange={(e) => setConsented(e.target.checked)}
                  className="mt-0.5 flex-shrink-0"
                />
                <span className="text-xs text-ink-muted leading-snug">
                  I agree that iCamagu can collect and encrypt my ID number and ID document photo to verify my identity, as described in the{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate?.('privacy')}
                    className="text-sage-600 underline font-bold"
                  >
                    Privacy Policy
                  </button>.
                </span>
              </label>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={submittingId || !consented} className="flex-1 bg-sage-500 text-white font-bold py-2 rounded-pill text-sm disabled:opacity-60">
                  {submittingId ? 'Submitting...' : 'Submit for review'}
                </button>
                <button type="button" onClick={() => setIdentityForm(false)} className="flex-1 border-2 border-terracotta/25 font-bold py-2 rounded-pill text-sm">Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="px-4 mt-8 mb-8">
        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            'w-full bg-white border-2 border-terracotta/25 text-ink font-bold py-3.5 rounded-pill flex items-center justify-center gap-2',
            'hover:bg-ink hover:text-white transition-colors duration-200',
            pressable
          )}
        >
          <Icon name="logout" size={16} /> Log Out
        </button>
      </div>
    </div>
  )
}
