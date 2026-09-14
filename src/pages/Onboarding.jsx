import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { captureLocation } from '../lib/geolocation.js'
import Icon from '../components/Icon.jsx'

const STEPS = ['welcome', 'ancestry', 'details']

// Same line-icon set used everywhere else in the app, not emoji — the
// welcome step used to be the one screen that looked like a different app.
const FEATURES = [
  { icon: 'calendarRange', label: 'Ceremonies', desc: 'Plan and budget umsebenzi, weddings & rites of passage' },
  { icon: 'coins', label: 'Stokvels', desc: 'Save together, track contributions, pay out fairly' },
  { icon: 'store', label: 'Store', desc: 'Bulk-buy alcohol, meat & supplies for your event' },
  { icon: 'link', label: 'Iziduko Network', desc: 'Find your bloodline through your clan names' },
]

function ProgressDots({ step }) {
  const index = STEPS.indexOf(step)
  return (
    <div className="flex items-center gap-1.5 mb-6">
      {STEPS.map((s, i) => (
        <div key={s} className={`h-1.5 rounded-pill transition-all ${i === index ? 'w-8 bg-terracotta' : i < index ? 'w-4 bg-terracotta/40' : 'w-4 bg-cream-dark'}`} />
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

  // Registration no longer asks for the base clan names upfront (see
  // Login.jsx) — a member who registered that way still needs a place to
  // add them, so this step now asks for whichever of the four lines are
  // still missing, not just the grandmother lines it always asked for.
  const [paternalIziduko, setPaternalIziduko] = useState(user?.paternalIziduko || '')
  const [maternalIziduko, setMaternalIziduko] = useState(user?.maternalIziduko || '')
  const [paternalGrandmotherIziduko, setPaternalGrandmotherIziduko] = useState(user?.paternalGrandmotherIziduko || '')
  const [maternalGrandmotherIziduko, setMaternalGrandmotherIziduko] = useState(user?.maternalGrandmotherIziduko || '')
  const [address, setAddress] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [age, setAge] = useState('')
  const [coords, setCoords] = useState(null)
  const [locating, setLocating] = useState(false)
  // Shown the instant a file is picked, via a local object URL — so there's
  // a real preview before the upload round-trip finishes, not just once the
  // server confirms it and user.profileImage updates.
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

  const finishOnboarding = () => {
    if (user?.id) localStorage.setItem(`icamagu_onboarding_done:${user.id}`, '1')
    onDone?.()
  }

  const saveAncestryAndContinue = async () => {
    setError('')
    const hasNewLine =
      (paternalIziduko && paternalIziduko !== user?.paternalIziduko) ||
      (maternalIziduko && maternalIziduko !== user?.maternalIziduko) ||
      (paternalGrandmotherIziduko && paternalGrandmotherIziduko !== user?.paternalGrandmotherIziduko) ||
      (maternalGrandmotherIziduko && maternalGrandmotherIziduko !== user?.maternalGrandmotherIziduko)

    if (!hasNewLine) {
      setStep('details')
      return
    }

    // The endpoint requires both base lines together (it can't save a
    // grandmother line alone without them) — send whatever's filled in,
    // falling back to what's already on the account.
    if (!paternalIziduko || !maternalIziduko) {
      setError('Paternal and maternal Iziduko are both needed to save your clan lines')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/user/iziduko', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          paternalIziduko,
          maternalIziduko,
          paternalGrandmotherIziduko,
          maternalGrandmotherIziduko,
        }),
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
    if (!hasDetails) {
      finishOnboarding()
      return
    }

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
    <div className="min-h-screen icamagu-bg flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm bg-white/90 backdrop-blur-md border-2 border-terracotta/25 rounded-soft p-8 shadow-elevated">
        <ProgressDots step={step} />

        {step === 'welcome' && (
          <div className="space-y-5">
            <div>
              <h1 className="font-display font-bold text-2xl text-ink mb-1">Welcome, {user?.firstName || 'friend'}</h1>
              <p className="text-ink-muted text-sm">Two quick steps to set up your profile — then you're in.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {FEATURES.map((f) => (
                <div key={f.label} className="bg-sage-50 border border-sage-200 rounded-soft p-3">
                  <Icon name={f.icon} size={20} color="#4a7a4a" />
                  <p className="font-bold text-xs text-ink mt-1">{f.label}</p>
                  <p className="text-[10px] text-ink-muted leading-snug mt-0.5">{f.desc}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setStep('ancestry')}
              className="w-full bg-sage-500 text-white font-bold py-3 rounded-pill"
            >
              Let's go
            </button>
          </div>
        )}

        {step === 'ancestry' && (
          <div className="space-y-4">
            <div>
              <h2 className="font-display font-bold text-xl text-ink mb-1">A face and a fuller line</h2>
              <p className="text-ink-muted text-xs">
                {user?.paternalIziduko
                  ? "A photo helps clan matches recognise you. Your grandmothers' Iziduko sharpen those matches further — both are optional."
                  : 'A photo helps clan matches recognise you. Your Iziduko (clan names) power ClanMatch — finding relatives across South Africa who share your bloodline. All optional, add later from your profile if you\'d rather skip for now.'}
              </p>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-20 h-20 rounded-full bg-sage-50 border-2 border-dashed border-sage-300 flex items-center justify-center overflow-hidden"
              >
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
                  <div>
                    <label className="text-[10px] font-bold uppercase text-ink-muted tracking-wide">Paternal Iziduko</label>
                    <input
                      type="text" placeholder="Optional"
                      value={paternalIziduko}
                      onChange={(e) => setPaternalIziduko(e.target.value)}
                      className="w-full border border-ink/30 rounded-soft px-4 py-2.5 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-ink-muted tracking-wide">Maternal Iziduko</label>
                    <input
                      type="text" placeholder="Optional"
                      value={maternalIziduko}
                      onChange={(e) => setMaternalIziduko(e.target.value)}
                      className="w-full border border-ink/30 rounded-soft px-4 py-2.5 text-sm mt-1"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="text-[10px] font-bold uppercase text-ink-muted tracking-wide">Paternal grandmother's Iziduko</label>
                <input
                  type="text" placeholder="Optional"
                  value={paternalGrandmotherIziduko}
                  onChange={(e) => setPaternalGrandmotherIziduko(e.target.value)}
                  className="w-full border border-ink/30 rounded-soft px-4 py-2.5 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-ink-muted tracking-wide">Maternal grandmother's Iziduko</label>
                <input
                  type="text" placeholder="Optional"
                  value={maternalGrandmotherIziduko}
                  onChange={(e) => setMaternalGrandmotherIziduko(e.target.value)}
                  className="w-full border border-ink/30 rounded-soft px-4 py-2.5 text-sm mt-1"
                />
              </div>
            </div>

            {error && <p className="text-terracotta text-sm">{error}</p>}

            <button
              onClick={saveAncestryAndContinue}
              disabled={saving}
              className="w-full bg-sage-500 text-white font-bold py-3 rounded-pill disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Continue'}
            </button>
            <button type="button" onClick={() => setStep('details')} className="w-full text-xs text-ink-muted underline">
              Skip for now
            </button>
          </div>
        )}

        {step === 'details' && (
          <div className="space-y-4">
            <div>
              <h2 className="font-display font-bold text-xl text-ink mb-1">How can people reach you?</h2>
              <p className="text-ink-muted text-xs">Used for ceremony bookings and stokvel notifications. All optional — add later from your profile anytime.</p>
            </div>

            <div className="space-y-2">
              <input
                type="text" placeholder="Phone number" value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full border border-ink/30 rounded-soft px-4 py-2.5 text-sm"
              />
              <input
                type="text" placeholder="Address / area" value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full border border-ink/30 rounded-soft px-4 py-2.5 text-sm"
              />
              <button
                type="button" onClick={useMyLocation} disabled={locating}
                className="text-xs font-bold text-sage-600 flex items-center gap-1"
              >
                <Icon name="mapPin" size={12} />
                {locating ? 'Locating...' : coords ? <>Location captured <Icon name="check" size={12} /></> : 'Use my current location'}
              </button>
              <p className="text-[10px] text-ink-muted -mt-1">Helps us match you with the nearest suppliers and pools — not shared with other members.</p>
              <input
                type="number" placeholder="Age" value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full border border-ink/30 rounded-soft px-4 py-2.5 text-sm"
              />
            </div>

            {error && <p className="text-terracotta text-sm">{error}</p>}

            <button
              onClick={saveDetailsAndFinish}
              disabled={saving}
              className="w-full bg-sage-500 text-white font-bold py-3 rounded-pill disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Finish & enter iCamagu'}
            </button>
            <button type="button" onClick={finishOnboarding} className="w-full text-xs text-ink-muted underline">
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Onboarding
