import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

const EVENT_TYPES = ['IMIGIDI', 'UMSEBENZI_WENKOMO', 'WEDDING', 'BIRTHDAY', 'CORPORATE', 'OTHER']
const ADD_ONS = ['VIP Lounge Setup', 'Selfie Swing', 'Alcoholic Games', 'Lighting Upgrade', 'Hookah Bar', 'Branded Backdrop', 'Pallet Furniture', 'Content Creation', 'Custom Signature Cocktails', 'Non-Alcoholic Mocktail Station', 'Champagne Tower', 'Shot Station']
const AGE_RANGES = ['18-25', '26-35', '36-45', '46-55', '56+', 'Mixed ages']
const HEAR_OPTIONS = ['Instagram', 'Facebook', 'Referral', 'Word of Mouth', 'Previous Event', 'Other']

function Section({ title, children }) {
  return (
    <div className="bg-white border-2 border-brand-black rounded-soft p-4 mb-4">
      <p className="text-xs font-black uppercase text-brand-ochre mb-3">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Input(props) {
  return <input {...props} className="w-full border border-brand-black/30 rounded-soft px-3 py-2 text-sm" />
}

function TextArea(props) {
  return <textarea {...props} className="w-full border border-brand-black/30 rounded-soft px-3 py-2 text-sm" rows="2" />
}

function Chip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className={`text-xs px-3 py-1 rounded-pill border ${active ? 'bg-brand-blue text-brand-cream border-brand-blue' : 'bg-white border-brand-black/30'}`}>
      {children}
    </button>
  )
}

function EkoyiniQuoteForm({ selectedPackage, onBack, onSubmitted }) {
  const { accessToken, user } = useAuth()
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    fullName: user ? user.firstName : '', surname: user ? user.lastName : '', clientEmail: user?.email || '',
    cellPhone: '', whatsappNumber: '', altContactName: '', altContactNumber: '', hearAboutUs: '', referralName: '',
    eventType: 'IMIGIDI', otherEventType: '', eventDate: '', eventStartTime: '', eventEndTime: '',
    barServiceStart: '', barServiceEnd: '', setupAccessTime: '', breakdownCompleteBy: '',
    venueName: '', physicalAddress: '', venueArea: '', city: '', venueType: 'OUTDOORS_OPEN',
    parkingAvailable: 'YES', parkingNote: '', powerAccess: 'YES', waterAccess: 'YES',
    guestCount: '', ageRanges: [], minorsPresent: false, nonAlcoholicNeeded: false,
    customGuestCount: '', customBudget: '',
    addOns: [], additionalHookahPipes: '', otherRequests: '',
    drinkMenuStyle: 'MIXED', specificBrands: '', alcoholSupplier: 'EKOYINI_SUPPLIES', budgetPerPerson: '', allergiesInfo: '',
    vipAreaNeeded: false, vipGuestCount: '', toastSpeechMoment: false, dressCodeTheme: '', culturalProtocols: '', setupRestrictions: '',
    preferredPaymentMethod: 'EFT',
  })

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }))
  const toggleArrayItem = (key, value) => {
    setForm(prev => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter(v => v !== value) : [...prev[key], value],
    }))
  }

  const totalSteps = 6

  const handleSubmit = async () => {
    setError('')
    try {
      const res = await fetch('/api/ekoyini/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          ...form,
          ageRanges: form.ageRanges.join(', '),
          addOns: form.addOns.join(', '),
          packageSelected: selectedPackage.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSubmitted(data.message)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="px-4 pt-6 pb-24 icamagu-bg min-h-screen">
      <button onClick={onBack} className="text-sm text-brand-black/60 mb-4">← Back to packages</button>
      <h2 className="text-xl font-extrabold text-brand-black mb-1">Request a Quote</h2>
      <p className="text-xs text-brand-black/50 mb-1">{selectedPackage.name} — {selectedPackage.price}</p>
      <p className="text-xs text-brand-black/40 mb-4">Step {step} of {totalSteps}</p>

      {step === 1 && (
        <Section title="A: Client Information">
          <Input placeholder="Full Name *" value={form.fullName} onChange={e => set('fullName', e.target.value)} required />
          <Input placeholder="Surname *" value={form.surname} onChange={e => set('surname', e.target.value)} required />
          <Input type="email" placeholder="Email Address *" value={form.clientEmail} onChange={e => set('clientEmail', e.target.value)} required />
          <Input type="tel" placeholder="Cell Phone Number *" value={form.cellPhone} onChange={e => set('cellPhone', e.target.value)} required />
          <Input type="tel" placeholder="WhatsApp Number (if different)" value={form.whatsappNumber} onChange={e => set('whatsappNumber', e.target.value)} />
          <Input placeholder="Alternative Contact Name" value={form.altContactName} onChange={e => set('altContactName', e.target.value)} />
          <Input type="tel" placeholder="Alternative Contact Number" value={form.altContactNumber} onChange={e => set('altContactNumber', e.target.value)} />
          <p className="text-xs text-brand-black/40">How did you hear about us?</p>
          <div className="flex flex-wrap gap-2">
            {HEAR_OPTIONS.map(o => <Chip key={o} active={form.hearAboutUs === o} onClick={() => set('hearAboutUs', o)}>{o}</Chip>)}
          </div>
          {form.hearAboutUs === 'Referral' && <Input placeholder="Referral name" value={form.referralName} onChange={e => set('referralName', e.target.value)} />}
        </Section>
      )}

      {step === 2 && (
        <Section title="B: Event Details">
          <select value={form.eventType} onChange={e => set('eventType', e.target.value)} className="w-full border border-brand-black/30 rounded-soft px-3 py-2 text-sm">
            {EVENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
          {form.eventType === 'OTHER' && <Input placeholder="Please specify" value={form.otherEventType} onChange={e => set('otherEventType', e.target.value)} />}
          <Input type="date" placeholder="Event Date *" value={form.eventDate} onChange={e => set('eventDate', e.target.value)} required />
          <div className="flex gap-2">
            <Input placeholder="Start time (e.g. 14:00)" value={form.eventStartTime} onChange={e => set('eventStartTime', e.target.value)} />
            <Input placeholder="End time (e.g. 22:00)" value={form.eventEndTime} onChange={e => set('eventEndTime', e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Input placeholder="Bar service start" value={form.barServiceStart} onChange={e => set('barServiceStart', e.target.value)} />
            <Input placeholder="Bar service end" value={form.barServiceEnd} onChange={e => set('barServiceEnd', e.target.value)} />
          </div>
          <Input placeholder="Setup access time" value={form.setupAccessTime} onChange={e => set('setupAccessTime', e.target.value)} />
          <Input placeholder="Breakdown complete by" value={form.breakdownCompleteBy} onChange={e => set('breakdownCompleteBy', e.target.value)} />
        </Section>
      )}

      {step === 3 && (
        <Section title="C: Venue & Location">
          <Input placeholder="Venue name" value={form.venueName} onChange={e => set('venueName', e.target.value)} />
          <TextArea placeholder="Physical address" value={form.physicalAddress} onChange={e => set('physicalAddress', e.target.value)} />
          <Input placeholder="Area / Suburb *" value={form.venueArea} onChange={e => set('venueArea', e.target.value)} required />
          <Input placeholder="City" value={form.city} onChange={e => set('city', e.target.value)} />
          <p className="text-xs text-brand-black/40">Venue type</p>
          <div className="flex gap-2">
            <Chip active={form.venueType === 'INDOORS'} onClick={() => set('venueType', 'INDOORS')}>Indoors</Chip>
            <Chip active={form.venueType === 'OUTDOORS_COVERED'} onClick={() => set('venueType', 'OUTDOORS_COVERED')}>Outdoors (covered)</Chip>
            <Chip active={form.venueType === 'OUTDOORS_OPEN'} onClick={() => set('venueType', 'OUTDOORS_OPEN')}>Outdoors (open)</Chip>
          </div>
          <p className="text-xs text-brand-black/40">Parking for setup vehicle?</p>
          <div className="flex gap-2">
            <Chip active={form.parkingAvailable === 'YES'} onClick={() => set('parkingAvailable', 'YES')}>Yes</Chip>
            <Chip active={form.parkingAvailable === 'NO'} onClick={() => set('parkingAvailable', 'NO')}>No</Chip>
            <Chip active={form.parkingAvailable === 'LIMITED'} onClick={() => set('parkingAvailable', 'LIMITED')}>Limited</Chip>
          </div>
          {form.parkingAvailable === 'LIMITED' && <Input placeholder="Please advise" value={form.parkingNote} onChange={e => set('parkingNote', e.target.value)} />}
          <p className="text-xs text-brand-black/40">Power access?</p>
          <div className="flex gap-2">
            <Chip active={form.powerAccess === 'YES'} onClick={() => set('powerAccess', 'YES')}>Yes</Chip>
            <Chip active={form.powerAccess === 'NO'} onClick={() => set('powerAccess', 'NO')}>No — need generator</Chip>
            <Chip active={form.powerAccess === 'NOT_SURE'} onClick={() => set('powerAccess', 'NOT_SURE')}>Not sure</Chip>
          </div>
          <p className="text-xs text-brand-black/40">Water access?</p>
          <div className="flex gap-2">
            <Chip active={form.waterAccess === 'YES'} onClick={() => set('waterAccess', 'YES')}>Yes</Chip>
            <Chip active={form.waterAccess === 'NO'} onClick={() => set('waterAccess', 'NO')}>No</Chip>
            <Chip active={form.waterAccess === 'NOT_SURE'} onClick={() => set('waterAccess', 'NOT_SURE')}>Not sure</Chip>
          </div>
        </Section>
      )}

      {step === 4 && (
        <Section title="D: Guest Information & Package">
          <Input type="number" placeholder="Total guests expected *" value={form.guestCount} onChange={e => set('guestCount', e.target.value)} required />
          <p className="text-xs text-brand-black/40">Age ranges (tick all that apply)</p>
          <div className="flex flex-wrap gap-2">
            {AGE_RANGES.map(r => <Chip key={r} active={form.ageRanges.includes(r)} onClick={() => toggleArrayItem('ageRanges', r)}>{r}</Chip>)}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.minorsPresent} onChange={e => set('minorsPresent', e.target.checked)} />
            Guests under 18 will be present
          </label>
          {form.minorsPresent && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.nonAlcoholicNeeded} onChange={e => set('nonAlcoholicNeeded', e.target.checked)} />
              Non-alcoholic options required
            </label>
          )}
          {selectedPackage.id === 'CUSTOM' && (
            <>
              <Input type="number" placeholder="Estimated guest count" value={form.customGuestCount} onChange={e => set('customGuestCount', e.target.value)} />
              <Input placeholder="Proposed budget (ZAR)" value={form.customBudget} onChange={e => set('customBudget', e.target.value)} />
            </>
          )}
        </Section>
      )}

      {step === 5 && (
        <>
          <Section title="F: Add-On Experiences">
            <div className="flex flex-wrap gap-2">
              {ADD_ONS.map(a => <Chip key={a} active={form.addOns.includes(a)} onClick={() => toggleArrayItem('addOns', a)}>{a}</Chip>)}
            </div>
            <Input type="number" placeholder="Additional hookah pipes (beyond package)" value={form.additionalHookahPipes} onChange={e => set('additionalHookahPipes', e.target.value)} />
            <TextArea placeholder="Other special requests" value={form.otherRequests} onChange={e => set('otherRequests', e.target.value)} />
          </Section>
          <Section title="G: Bar & Drink Preferences">
            <select value={form.drinkMenuStyle} onChange={e => set('drinkMenuStyle', e.target.value)} className="w-full border border-brand-black/30 rounded-soft px-3 py-2 text-sm">
              <option value="FULL_COCKTAILS">Full Cocktails Menu</option>
              <option value="BEER_CIDERS">Beer & Ciders Only</option>
              <option value="SPIRITS_MIXERS">Spirits & Mixers</option>
              <option value="WINE">Wine Selection</option>
              <option value="SHOOTER_STATION">Shooter Station</option>
              <option value="NON_ALCOHOLIC">Non-Alcoholic Focus</option>
              <option value="MIXED">Mixed — we'll advise</option>
            </select>
            <Input placeholder="Specific brands/drinks requested" value={form.specificBrands} onChange={e => set('specificBrands', e.target.value)} />
            <p className="text-xs text-brand-black/40">Who supplies the alcohol?</p>
            <div className="flex gap-2 flex-wrap">
              <Chip active={form.alcoholSupplier === 'CLIENT_SUPPLIES'} onClick={() => set('alcoholSupplier', 'CLIENT_SUPPLIES')}>Client supplies</Chip>
              <Chip active={form.alcoholSupplier === 'EKOYINI_SUPPLIES'} onClick={() => set('alcoholSupplier', 'EKOYINI_SUPPLIES')}>Ekoyini supplies</Chip>
              <Chip active={form.alcoholSupplier === 'MIXED'} onClick={() => set('alcoholSupplier', 'MIXED')}>Mixed</Chip>
            </div>
            {form.alcoholSupplier !== 'CLIENT_SUPPLIES' && (
              <select value={form.budgetPerPerson} onChange={e => set('budgetPerPerson', e.target.value)} className="w-full border border-brand-black/30 rounded-soft px-3 py-2 text-sm">
                <option value="">Budget per person for drinks</option>
                <option value="R80-R120">R80 – R120</option>
                <option value="R120-R180">R120 – R180</option>
                <option value="R180-R250">R180 – R250</option>
                <option value="R250+">R250+</option>
              </select>
            )}
            <TextArea placeholder="Allergies or dietary requirements" value={form.allergiesInfo} onChange={e => set('allergiesInfo', e.target.value)} />
          </Section>
        </>
      )}

      {step === 6 && (
        <>
          <Section title="H: Logistics & Special Requirements">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.vipAreaNeeded} onChange={e => set('vipAreaNeeded', e.target.checked)} />
              Designated VIP area
            </label>
            {form.vipAreaNeeded && <Input type="number" placeholder="How many VIP guests?" value={form.vipGuestCount} onChange={e => set('vipGuestCount', e.target.value)} />}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.toastSpeechMoment} onChange={e => set('toastSpeechMoment', e.target.checked)} />
              Toast/speech requiring champagne service
            </label>
            <Input placeholder="Dress code / theme" value={form.dressCodeTheme} onChange={e => set('dressCodeTheme', e.target.value)} />
            <TextArea placeholder="Cultural protocols or traditions we should observe" value={form.culturalProtocols} onChange={e => set('culturalProtocols', e.target.value)} />
            <TextArea placeholder="Special setup instructions or venue restrictions" value={form.setupRestrictions} onChange={e => set('setupRestrictions', e.target.value)} />
          </Section>
          <Section title="I: Payment Preference">
            <p className="text-xs text-brand-black/60">Booking fee: 50% deposit to confirm your date. Final payment due 7 days before the event.</p>
            <div className="flex gap-2 flex-wrap">
              <Chip active={form.preferredPaymentMethod === 'EFT'} onClick={() => set('preferredPaymentMethod', 'EFT')}>EFT / Bank Transfer</Chip>
              <Chip active={form.preferredPaymentMethod === 'CASH'} onClick={() => set('preferredPaymentMethod', 'CASH')}>Cash on setup day</Chip>
            </div>
          </Section>
          {error && <p className="text-brand-ochre text-sm mb-2">{error}</p>}
          <button onClick={handleSubmit} className="w-full bg-brand-blue text-brand-cream font-bold py-3 rounded-pill">
            Submit Quote Request
          </button>
        </>
      )}

      {step < 6 && (
        <div className="flex gap-2 mt-2">
          {step > 1 && <button onClick={() => setStep(step - 1)} className="flex-1 border-2 border-brand-black text-brand-black font-bold py-2 rounded-pill text-sm">Back</button>}
          <button onClick={() => setStep(step + 1)} className="flex-1 bg-brand-blue text-brand-cream font-bold py-2 rounded-pill text-sm">Next</button>
        </div>
      )}
    </div>
  )
}

export default EkoyiniQuoteForm
