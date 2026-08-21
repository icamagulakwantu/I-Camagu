import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'

const STEPS = ['welcome', 'ancestry', 'details']

const FEATURES = [
  { emoji: '📿', label: 'Ceremonies', desc: 'Plan and budget umsebenzi, weddings & rites of passage' },
  { emoji: '🏘️', label: 'Stokvels', desc: 'Save together, track contributions, pay out fairly' },
  { emoji: '🛒', label: 'Store', desc: 'Bulk-buy alcohol, meat & supplies for your event' },
  { emoji: '🤝', label: 'Iziduko Network', desc: 'Find your bloodline through your clan names' },
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

  const [paternalGrandmotherIziduko, setPaternalGrandmotherIziduko] = useState(user?.paternalGrandmotherIziduko || '')
  const [maternalGrandmotherIziduko, setMaternalGrandmotherIziduko] = useState(user?.maternalGrandmotherIziduko || '')
  const [address, setAddress] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [age, setAge] = useState('')

  const handlePhotoSelect = (e) => {
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
        if (!res.ok) throw new Error(data.error || 'Failed to upload photo')
        updateUser({ profileImage: data.profileImage })
        showToast('Photo added', 'success')
      } catch (err) {
        showToast(err.message || 'Error uploading photo', 'error')
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
    const hasNewGrandmotherLine =
      (paternalGrandmotherIziduko && paternalGrandmotherIziduko !== user?.paternalGrandmotherIziduko) ||
      (maternalGrandmotherIziduko && maternalGrandmotherIziduko !== user?.maternalGrandmotherIziduko)

    if (!hasNewGrandmotherLine) {
      setStep('details')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/user/iziduko', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          paternalIziduko: user?.paternalIziduko,
          maternalIziduko: user?.maternalIziduko,
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
    const hasDetails = address || phoneNumber || age
    if (!hasDetails) {
      finishOnboarding()
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ address, phoneNumber, age }),
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
      <div className="w-full max-w-sm bg-white/90 backdrop-blur-md border-2 border-ink rounded-soft p-8 shadow-elevated">
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
                  <span className="text-xl">{f.emoji}</span>
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
              <p className="text-ink-muted text-xs">A photo helps clan matches recognise you. Your grandmothers' Iziduko sharpen those matches further — both are optional.</p>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-20 h-20 rounded-full bg-sage-50 border-2 border-dashed border-sage-300 flex items-center justify-center overflow-hidden"
              >
                {user?.profileImage ? (
                  <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">{uploading ? '…' : '📷'}</span>
                )}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
            </div>

            <div className="space-y-2">
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
