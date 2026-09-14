import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import Icon from '../components/Icon.jsx'
import { isAdminEmail } from '../lib/admin.js'
import CommunityVerification from '../components/CommunityVerification.jsx'

const PRACTITIONER_ROLES = ['INGCIBI', 'IKHANKATHA', 'CULTURAL_ADVISOR']
const VENDOR_CATEGORIES = ['ATTIRE', 'CATERING', 'EQUIPMENT_HIRE', 'COOKWARE', 'LIVESTOCK_FARM', 'LIQUOR_SUPPLIER', 'IKRWALA_CLOTHING', 'FORMALWEAR']

function Directory({ onBack }) {
  const { accessToken, user } = useAuth()
  const { showToast } = useToast()
  const fileInputRef = useRef(null)

  const [tab, setTab] = useState('practitioners')
  const [practitioners, setPractitioners] = useState([])
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [myVotes, setMyVotes] = useState({})

  // Form states
  const [name, setName] = useState('')
  const [role, setRole] = useState('INGCIBI')
  const [category, setCategory] = useState('ATTIRE')
  const [area, setArea] = useState('')
  const [contactInfo, setContactInfo] = useState('')
  const [description, setDescription] = useState('')
  const [idDocUrl, setIdDocUrl] = useState(null)
  const [uploadingDoc, setUploadingDoc] = useState(false)

  const isAdmin = isAdminEmail(user?.email)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [pRes, vRes] = await Promise.all([
        fetch('/api/directory/practitioners'),
        fetch('/api/directory/vendors')
      ])
      const pData = await pRes.json()
      const vData = await vRes.json()
      setPractitioners(Array.isArray(pData) ? pData : [])
      setVendors(Array.isArray(vData) ? vData : [])
    } catch {
      showToast('Could not load directory entries', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  useEffect(() => {
    if (!accessToken) return
    fetch('/api/directory/my-votes', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => res.json())
      .then((votes) => {
        if (!Array.isArray(votes)) return
        const map = {}
        votes.forEach((v) => { map[`${v.targetType}:${v.targetId}`] = v.voteType })
        setMyVotes(map)
      })
      .catch(() => {})
  }, [accessToken])

  const castVote = async (targetType, targetId, voteType) => {
    try {
      const res = await fetch('/api/directory/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ targetType, targetId, voteType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not record your vote')

      setMyVotes((prev) => ({ ...prev, [`${targetType}:${targetId}`]: data.myVote }))
      const applyCounts = (item) => item.id === targetId
        ? { ...item, confirmCount: data.confirmCount, disputeCount: data.disputeCount }
        : item
      if (targetType === 'PRACTITIONER') setPractitioners((prev) => prev.map(applyCounts))
      else setVendors((prev) => prev.map(applyCounts))
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const resetFormFields = () => {
    setName('')
    setArea('')
    setContactInfo('')
    setDescription('')
    setIdDocUrl(null)
    setShowForm(false)
  }

  const handleTabSwitch = (newTab) => {
    setTab(newTab)
    setShowForm(false)
  }

  const removeVendor = async (vendorId) => {
    try {
      const res = await fetch(`/api/directory/vendors/${vendorId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not remove listing')
      setVendors((prev) => prev.filter((v) => v.id !== vendorId))
      showToast('Listing removed', 'info')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleDocSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1_500_000) return showToast('Document too large — limit 1.5MB', 'error')
    
    setUploadingDoc(true)
    const reader = new FileReader()
    reader.onload = () => {
      setIdDocUrl(reader.result)
      setUploadingDoc(false)
    }
    reader.onerror = () => {
      showToast('Failed to process file', 'error')
      setUploadingDoc(false)
    }
    reader.readAsDataURL(file)
  }

  const submitPractitioner = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/directory/practitioners', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${accessToken}` 
        },
        body: JSON.stringify({ name, role, area, contactInfo, idDocUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add practitioner')
      
      showToast('Practitioner listed — pending verification', 'success')
      resetFormFields()
      fetchAll()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const submitVendor = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/directory/vendors', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${accessToken}` 
        },
        body: JSON.stringify({ name, category, area, contactInfo, description }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add vendor')

      showToast('Vendor listed successfully', 'success')
      resetFormFields()
      fetchAll()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const verifyPractitioner = async (practitionerId) => {
    try {
      const res = await fetch('/api/directory/practitioners/verify', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${accessToken}` 
        },
        body: JSON.stringify({ practitionerId }),
      })
      if (!res.ok) throw new Error('Verification failed')

      showToast('Practitioner verified', 'success')
      fetchAll()
    } catch (err) {
      showToast(err.message || 'Could not verify', 'error')
    }
  }

  return (
    <div className="min-h-screen pb-24 bg-cream">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-sage-500 to-sage-600 text-white px-5 pt-10 pb-6 rounded-b-[2.5rem]">
        <button onClick={onBack} className="text-sm text-white/80 hover:text-white mb-3 block transition-colors">
          ← Back
        </button>
        <h1 className="font-display font-bold text-2xl">Directory</h1>
        <p className="text-white/80 text-sm mt-1">Practitioners, vendors, and verified farms.</p>
      </div>

      <div className="px-4 mt-4">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-4">
          <button 
            onClick={() => handleTabSwitch('practitioners')}
            className={`flex-1 py-2.5 rounded-pill text-sm font-bold transition-colors ${
              tab === 'practitioners' 
                ? 'bg-sage-500 text-white shadow-sm' 
                : 'bg-white border-2 border-terracotta/20 text-ink-muted'
            }`}
          >
            Practitioners
          </button>
          <button 
            onClick={() => handleTabSwitch('vendors')}
            className={`flex-1 py-2.5 rounded-pill text-sm font-bold transition-colors ${
              tab === 'vendors' 
                ? 'bg-sage-500 text-white shadow-sm' 
                : 'bg-white border-2 border-terracotta/20 text-ink-muted'
            }`}
          >
            Vendors & Farms
          </button>
        </div>

        {/* Form Toggle Button */}
        <button 
          onClick={() => setShowForm(!showForm)} 
          className="w-full border-2 border-terracotta/25 text-ink font-bold py-2.5 rounded-pill text-sm mb-4 bg-white hover:bg-cream-dark transition-colors"
        >
          {showForm ? 'Cancel' : `+ List a ${tab === 'practitioners' ? 'Practitioner' : 'Vendor / Farm'}`}
        </button>

        {/* Form: Practitioner */}
        {showForm && tab === 'practitioners' && (
          <form onSubmit={submitPractitioner} className="bg-white border-2 border-terracotta/25 rounded-soft p-4 mb-4 space-y-3 shadow-sm">
            <input 
              placeholder="Full Name" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm focus:outline-none focus:border-sage-500" 
              required 
            />
            <select 
              value={role} 
              onChange={(e) => setRole(e.target.value)} 
              className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm focus:outline-none focus:border-sage-500"
            >
              {PRACTITIONER_ROLES.map(r => (
                <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <input 
              placeholder="Area / Region" 
              value={area} 
              onChange={(e) => setArea(e.target.value)}
              className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm focus:outline-none focus:border-sage-500" 
              required 
            />
            <input 
              placeholder="Contact Info (Phone, WhatsApp, or Email)" 
              value={contactInfo} 
              onChange={(e) => setContactInfo(e.target.value)}
              className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm focus:outline-none focus:border-sage-500" 
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-ink/30 rounded-soft py-3 text-xs font-bold text-ink-muted hover:border-sage-500 transition-colors flex items-center justify-center gap-1.5"
            >
              {uploadingDoc ? (
                'Uploading document...'
              ) : idDocUrl ? (
                <><Icon name="check" size={13} color="#4a7a4a" /> ID/FICA document attached</>
              ) : (
                <><Icon name="file" size={13} /> Upload ID/FICA document (optional, speeds up verification)</>
              )}
            </button>
            {!idDocUrl && !uploadingDoc && (
              <p className="text-[10px] text-ink-muted text-center -mt-2">Image or PDF, up to 1.5MB</p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleDocSelect}
              className="hidden"
            />

            <button type="submit" className="w-full bg-sage-500 hover:bg-sage-600 text-white font-bold py-2.5 rounded-pill text-sm transition-colors">
              Submit Practitioner Listing
            </button>
          </form>
        )}

        {/* Form: Vendor */}
        {showForm && tab === 'vendors' && (
          <form onSubmit={submitVendor} className="bg-white border-2 border-terracotta/25 rounded-soft p-4 mb-4 space-y-3 shadow-sm">
            <input 
              placeholder="Business or Vendor Name" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm focus:outline-none focus:border-sage-500" 
              required 
            />
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)} 
              className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm focus:outline-none focus:border-sage-500"
            >
              {VENDOR_CATEGORIES.map(c => (
                <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <input 
              placeholder="Area / Location" 
              value={area} 
              onChange={(e) => setArea(e.target.value)}
              className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm focus:outline-none focus:border-sage-500" 
              required 
            />
            <input 
              placeholder="Contact Info (Phone, WhatsApp, or Email)" 
              value={contactInfo} 
              onChange={(e) => setContactInfo(e.target.value)}
              className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm focus:outline-none focus:border-sage-500" 
            />
            <textarea 
              placeholder="Short Description of services or supplies" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm focus:outline-none focus:border-sage-500" 
              rows="2" 
            />
            <button type="submit" className="w-full bg-sage-500 hover:bg-sage-600 text-white font-bold py-2.5 rounded-pill text-sm transition-colors">
              Submit Vendor Listing
            </button>
          </form>
        )}

        {/* Dynamic Directory Content */}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-soft" />
            <Skeleton className="h-20 w-full rounded-soft" />
            <Skeleton className="h-20 w-full rounded-soft" />
          </div>
        ) : tab === 'practitioners' ? (
          practitioners.length === 0 ? (
            <EmptyState emoji="🧑‍⚕️" title="No practitioners listed yet" description="Be the first to list one using the button above." />
          ) : (
            <div className="space-y-3">
              {practitioners.map((p) => (
                <div key={p.id} className="bg-white border-2 border-terracotta/25 rounded-soft p-4 shadow-sm">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-sm text-ink">{p.name}</p>
                    {p.isVerified ? (
                      <span className="text-[10px] font-black text-white bg-sage-500 px-2 py-0.5 rounded-pill flex items-center gap-1">
                        <Icon name="check" size={10} color="#fff" /> Verified
                      </span>
                    ) : (
                      <span className="text-[10px] font-black text-ink-muted bg-cream-dark px-2 py-0.5 rounded-pill">
                        Pending
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-muted mt-1 font-medium">
                    {p.role.replace(/_/g, ' ')} • {p.area}
                  </p>
                  {p.contactInfo && (
                    <a
                      href={/^\d/.test(p.contactInfo) ? `https://wa.me/${p.contactInfo.replace(/\D/g, '')}` : `mailto:${p.contactInfo}`}
                      className="inline-block mt-2 text-xs bg-[#25D366] text-white font-bold px-3 py-1.5 rounded-pill"
                    >
                      Contact
                    </a>
                  )}
                  {isAdmin && !p.isVerified && (
                    <button
                      onClick={() => verifyPractitioner(p.id)}
                      className="mt-3 text-xs bg-sage-500 hover:bg-sage-600 text-white font-bold px-3 py-1.5 rounded-pill transition-colors"
                    >
                      Verify (Admin Action)
                    </button>
                  )}
                  {!p.isVerified && (
                    <CommunityVerification
                      targetType="PRACTITIONER"
                      targetId={p.id}
                      confirmCount={p.confirmCount}
                      disputeCount={p.disputeCount}
                      myVote={myVotes[`PRACTITIONER:${p.id}`]}
                      isOwner={p.userId === user?.id}
                      canVote={!!accessToken}
                      onVote={castVote}
                    />
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          vendors.length === 0 ? (
            <EmptyState emoji="📦" title="No vendors listed yet" description="Be the first to list one using the button above." />
          ) : (
            <div className="space-y-3">
              {vendors.map((v) => (
                <div key={v.id} className="bg-white border-2 border-terracotta/25 rounded-soft p-4 shadow-sm">
                  <p className="font-bold text-sm text-ink">{v.name}</p>
                  <p className="text-xs text-ink-muted font-medium mt-0.5">
                    {v.category.replace(/_/g, ' ')} • {v.area}
                  </p>
                  {v.description && (
                    <p className="text-xs text-ink-muted mt-2 border-t border-terracotta/10 pt-2">{v.description}</p>
                  )}
                  {v.contactInfo && (
                    <p className="text-xs text-ink mt-2">
                      <span className="font-semibold">Contact:</span> {v.contactInfo}
                    </p>
                  )}
                  <CommunityVerification
                    targetType="VENDOR"
                    targetId={v.id}
                    confirmCount={v.confirmCount}
                    disputeCount={v.disputeCount}
                    myVote={myVotes[`VENDOR:${v.id}`]}
                    isOwner={v.createdById === user?.id}
                    canVote={!!accessToken}
                    onVote={castVote}
                  />
                  {v.createdById === user?.id && (
                    <button
                      type="button"
                      onClick={() => removeVendor(v.id)}
                      className="text-[11px] text-terracotta font-bold underline mt-2"
                    >
                      Remove listing
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}

export default Directory
