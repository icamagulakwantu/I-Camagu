import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { captureLocation } from '../lib/geolocation.js'
import Icon from '../components/Icon.jsx'
import IsidukoTypeahead from '../components/IsidukoTypeahead.jsx'

const NATION_OPTIONS = ['AmaXhosa', 'AbaThembu', 'AmaBomvana', 'AmaGqunukhwebe', 'AbeSuthu / AmaVundle', 'AmaMpondo', 'AmaMpondomise', 'AmaMfengu', 'AmaHlubi', 'AmaBhaca', 'AmaXesibe', 'AmaQwathi', 'Not sure / another nation']

const STEPS = ['welcome', 'ancestry', 'details']

// Each welcome card is a direct shortcut: tapping it finishes onboarding and
// opens that part of the app. (They used to expand into a paragraph and
// needed a second "Open …" tap, which read as static text.)
const FEATURES = [
  {
    icon: 'calendarRange',
    accent: '#c45c26',
    label: 'Ceremony Planner',
    headline: 'Checklist, budget and family pledges',
    path: '/ceremonies',
  },
  {
    icon: 'store',
    accent: '#c1922f',
    label: 'Store',
    headline: 'Pool orders with others for bulk prices',
    path: '/smartmatch',
  },
  {
    icon: 'coins',
    accent: '#4a7a4a',
    label: 'Stokvels',
    headline: 'Siza ndawonye · Save and pay out fairly',
    path: '/stokvels',
  },
  {
    icon: 'link',
    accent: '#3d623d',
    label: 'Iziduko Network',
    headline: 'Find relatives through your clan names',
    path: '/me/iziduko',
  },
]

function ProgressDots({ step }) {
  const index = STEPS.indexOf(step)
  return (
    <div className="flex items-center gap-1.5 mb-6">
      {STEPS.map((s, i) => (
        <div
          key={s}
          className={`h-1.5 rounded-pill transition-all duration-300 ${
            i === index ? 'w-8 bg-terracotta' : i < index ? 'w-4 bg-terracotta/40' : 'w-4 bg-cream-dark'
          }`}
        />
      ))}
    </div>
  )
}

function Onboarding({ onDone }) {
  const { user, accessToken, updateUser } = useAuth()
  const { showToast } = useToast()
  const fileInputRef = useRef(null)

  const [step, setStep] = useState('welcome')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const [nationLabel, setNationLabel] = useState(user?.nationLabel || '')
  const [paternalIziduko, setPaternalIziduko] = useState(user?.paternalIziduko || '')
  const [maternalIziduko, setMaternalIziduko] = useState(user?.maternalIziduko || '')
  const [paternalGrandmotherIziduko, setPaternalGrandmotherIziduko] = useState(user?.paternalGrandmotherIziduko || '')
  const [maternalGrandmotherIziduko, setMaternalGrandmotherIziduko] = useState(user?.maternalGrandmotherIziduko || '')
  const [address, setAddress] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [age, setAge] = useState('')
  const [coords, setCoords] = useState(null)
  const [locating, setLocating] = useState(false)
  const [localPreview, setLocalPreview] = useState(null)

  const useMyLocation = async () => {
    setLocating(true)
    try {
      const loc = await captureLocation()
      setCoords(loc)
      showToast('Location captured', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLocating(false)
    }
  }

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1_500_000) {
      showToast('Photo too large — please choose an image under 1.5MB', 'error')
      return
    }
    setLocalPreview(URL.createObjectURL(file))
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
        if (!res.ok) throw new Error(data.error || 'Failed to upload photo')
        updateUser({ profileImage: data.profileImage })
        showToast('Photo added', 'success')
      } catch (err) {
        showToast(err.message || 'Error uploading photo', 'error')
        setLocalPreview(null)
      } finally {
        setUploading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const finishOnboarding = (destination) => {
    if (user?.id) localStorage.setItem(`icamagu_onboarding_done:${user.id}`, '1')
    onDone?.()
    if (typeof destination === 'string') window.location.assign(destination)
  }

  const saveAncestryAndContinue = async () => {
    setError('')
    const hasNewLine =
      (paternalIziduko && paternalIziduko !== user?.paternalIziduko) ||
      (maternalIziduko && maternalIziduko !== user?.maternalIziduko) ||
      (paternalGrandmotherIziduko && paternalGrandmotherIziduko !== user?.paternalGrandmotherIziduko) ||
      (maternalGrandmotherIziduko && maternalGrandmotherIziduko !== user?.maternalGrandmotherIziduko)

    if (!hasNewLine) { setStep('details'); return }

    if (!paternalIziduko || !maternalIziduko) {
      setError('Paternal and maternal Iziduko are both needed to save your clan lines')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/user/iziduko', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ paternalIziduko, maternalIziduko, paternalGrandmotherIziduko, maternalGrandmotherIziduko, nationLabel }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save your clan lines')
      updateUser(data)
      setStep('details')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const saveDetailsAndFinish = async () => {
    setError('')
    const hasDetails = address || phoneNumber || age || coords
    if (!hasDetails) { finishOnboarding(); return }

    setSaving(true)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ address, phoneNumber, age, ...(coords || {}) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save your details')
      updateUser(data)
      finishOnboarding()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen icamagu-bg flex flex-col items-center justify-center px-4 py-8">

      {step === 'welcome' && (
        <div className="w-full max-w-sm animate-slide-up">
          <div className="wash-ember rings rounded-t-soft px-6 pt-6 pb-5">
            <div className="flex items-center gap-2.5 mb-3">
              <img src="/icons/source/gateway-mark-1024.png" alt="iCamagu" className="w-8 h-8" style={{ filter: 'brightness(0) invert(1)' }} />
              <span className="font-display font-bold text-xl text-white">iCamagu</span>
            </div>
            <p className="eyebrow text-white/70 mb-1">Molo, {user?.firstName || 'mhlobo'}</p>
            <h1 className="font-display font-bold text-2xl leading-tight text-white">
              Konke okufunwa ngumsebenzi wakho. Ndawonye.
            </h1>
            <p className="text-white/80 text-sm mt-1">Everything your ceremony needs, in one place.</p>
          </div>

          <div className="bg-white/95 backdrop-blur-md border-x-2 border-terracotta/20 px-4 pt-4 pb-2">
            <p className="text-xs text-ink-muted mb-2 px-1">Tap one to open it now, or set up your profile first.</p>
            <div className="divide-y divide-cream-dark rounded-2xl border border-cream-dark overflow-hidden">
              {FEATURES.map((f) => (
                <button
                  key={f.label}
                  type="button"
                  onClick={() => finishOnboarding(f.path)}
                  className="w-full flex items-center gap-3 bg-white px-3.5 py-3 text-left pressable hover:bg-cream/60"
                >
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: f.accent + '18' }}>
                    <Icon name={f.icon} size={18} color={f.accent} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-sm text-ink">{f.label}</span>
                    <span className="block text-xs text-ink-muted truncate">{f.headline}</span>
                  </span>
                  <Icon name="arrowRight" size={16} color={f.accent} />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-md border-x-2 border-b-2 border-terracotta/20 rounded-b-soft px-4 pb-5 pt-3">
            <button onClick={() => setStep('ancestry')} className="w-full wash-ember text-white font-bold py-3.5 rounded-pill shadow-terracotta text-[15px] pressable">
              Set up my profile &rarr;
            </button>
            <p className="text-center text-[11px] text-ink-muted mt-2">Amanyathelo amabini · Two quick steps</p>
          </div>
        </div>
      )}

      {step === 'ancestry' && (
        <div className="w-full max-w-sm bg-white/90 backdrop-blur-md border-2 border-terracotta/25 rounded-soft p-8 shadow-elevated animate-slide-up">
          <ProgressDots step={step} />
          <div className="mb-5">
            {/* Corrected Xhosa heading with English subtext */}
            <h2 className="font-display font-bold text-xl text-ink mb-0.5">Izinyanya neminyanya yakho neziduko zakho</h2>
            <p className="text-xs text-ink-muted mb-2">Your ancestors, lineage and clan names</p>
            <p className="text-ink-muted text-xs leading-relaxed">
              {user?.paternalIziduko
                ? "A photo helps clan matches recognise you. Your grandmothers' Iziduko sharpen those matches further — both are optional."
                : "A photo helps clan matches recognise you. Your Iziduko (clan names) power ClanMatch — finding relatives across South Africa who share your bloodline. All optional, add later from your profile."}
            </p>
          </div>

          <div className="flex flex-col items-center gap-2 mb-5">
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="w-20 h-20 rounded-full bg-sage-50 border-2 border-dashed border-sage-300 flex items-center justify-center overflow-hidden pressable">
              {localPreview || user?.profileImage ? (
                <img src={localPreview || user.profileImage} alt="" className={`w-full h-full object-cover ${uploading ? 'opacity-60' : ''}`} />
              ) : (
                <Icon name="camera" size={24} color="#4a7a4a" />
              )}
            </button>
            <p className="text-[10px] text-ink-muted">JPG or PNG, up to 1.5MB</p>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
          </div>

          <div className="space-y-2">
            {!user?.paternalIziduko && (
              <>
                <IsidukoTypeahead label="Isiduko sikaTata (Paternal)" value={paternalIziduko} nationLabel={nationLabel} required onChange={setPaternalIziduko} placeholder="Type your father’s clan or praise name" />
                <IsidukoTypeahead label="Isiduko sikaMama (Maternal)" value={maternalIziduko} nationLabel={nationLabel} required onChange={setMaternalIziduko} placeholder="Type your mother’s clan or praise name" />
              </>
            )}
            <IsidukoTypeahead label="Paternal grandmother’s Isiduko" value={paternalGrandmotherIziduko} nationLabel={nationLabel} onChange={setPaternalGrandmotherIziduko} />
            <IsidukoTypeahead label="Maternal grandmother’s Isiduko" value={maternalGrandmotherIziduko} nationLabel={nationLabel} onChange={setMaternalGrandmotherIziduko} />
            <label className="block text-sm font-bold text-ink">Your nation / community label
              <select value={nationLabel} onChange={(event) => setNationLabel(event.target.value)} className="mt-2 w-full min-h-12 rounded-xl border border-cream-dark bg-white px-3 text-ink">
                <option value="">Choose your own label</option>
                {NATION_OPTIONS.map((nation) => <option key={nation} value={nation}>{nation}</option>)}
              </select>
            </label>
            <div className="rounded-2xl border border-cream-dark bg-white p-4 mt-3">
              <p className="font-bold text-ink">Add your location pin</p>
              <p className="text-xs text-ink-muted mt-1">The Store uses your location to find nearby group orders. Your exact coordinates are used for matching, not shown as a public address.</p>
              <button type="button" onClick={useMyLocation} disabled={locating} className="mt-3 w-full min-h-11 rounded-full border-2 border-terracotta text-terracotta font-bold disabled:opacity-50">
                {locating ? 'Finding location…' : coords ? 'Location pin captured ✓' : 'Use my current location'}
              </button>
            </div>
          </div>

          {error && <p className="text-terracotta text-sm mt-3">{error}</p>}

          <button onClick={saveAncestryAndContinue} disabled={saving} className="w-full bg-sage-500 text-white font-bold py-3 rounded-pill disabled:opacity-50 mt-5 pressable">
            {saving ? 'Saving...' : 'Continue'}
          </button>
          <button type="button" onClick={() => setStep('details')} className="w-full text-xs text-ink-muted underline mt-2.5">Skip for now</button>
        </div>
      )}

      {step === 'details' && (
        <div className="w-full max-w-sm bg-white/90 backdrop-blur-md border-2 border-terracotta/25 rounded-soft p-8 shadow-elevated animate-slide-up">
          <ProgressDots step={step} />
          <div className="mb-5">
            {/* Xhosa heading with English subtext */}
            <h2 className="font-display font-bold text-xl text-ink mb-0.5">Banganifumana njani?</h2>
            <p className="text-xs text-ink-muted mb-2">How can people reach you?</p>
            <p className="text-ink-muted text-xs leading-relaxed">Used for ceremony bookings and stokvel notifications. All optional — add later from your profile anytime.</p>
          </div>

          <div className="space-y-2">
            <input type="text" placeholder="Phone number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full border border-ink/30 rounded-soft px-4 py-2.5 text-sm" />
            <input type="text" placeholder="Address / area" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full border border-ink/30 rounded-soft px-4 py-2.5 text-sm" />
            <button type="button" onClick={useMyLocation} disabled={locating} className="text-xs font-bold text-sage-600 flex items-center gap-1 pressable">
              <Icon name="mapPin" size={12} />
              {locating ? 'Locating...' : coords ? <><span>Location captured</span><Icon name="check" size={12} /></> : 'Use my current location'}
            </button>
            <p className="text-[10px] text-ink-muted -mt-1">Helps us match you with the nearest suppliers and pools — not shared with other members.</p>
            <input type="number" placeholder="Age" value={age} onChange={(e) => setAge(e.target.value)} className="w-full border border-ink/30 rounded-soft px-4 py-2.5 text-sm" />
          </div>

          {error && <p className="text-terracotta text-sm mt-3">{error}</p>}

          <button onClick={saveDetailsAndFinish} disabled={saving} className="w-full wash-ember text-white font-bold py-3.5 rounded-pill disabled:opacity-50 mt-5 pressable shadow-terracotta">
            {saving ? 'Saving...' : 'Finish & enter iCamagu →'}
          </button>
          <button type="button" onClick={() => finishOnboarding()} className="w-full text-xs text-ink-muted underline mt-2.5">Skip for now</button>
        </div>
      )}
    </div>
  )
}

export default Onboarding
